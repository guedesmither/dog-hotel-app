import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import sharp from 'sharp'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const dogs = await prisma.dog.findMany({
    where: { photoUrl: { not: null } },
    select: { id: true, name: true, photoUrl: true },
  })

  let compressed = 0
  let skipped = 0
  let totalSaved = 0
  const results: { name: string; oldKB: number; newKB: number }[] = []

  for (const dog of dogs) {
    if (!dog.photoUrl || !dog.photoUrl.startsWith('data:image/')) {
      skipped++
      continue
    }

    try {
      const match = dog.photoUrl.match(/^data:image\/(\w+);base64,(.+)$/)
      if (!match) { skipped++; continue }

      const buf = Buffer.from(match[2], 'base64')
      const originalSize = buf.length

      if (originalSize < 100 * 1024) { skipped++; continue }

      const compressedBuf = await sharp(buf)
        .resize(300, 300, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 80 })
        .toBuffer()

      const newSize = compressedBuf.length
      const saved = originalSize - newSize
      totalSaved += saved

      const newPhotoUrl = `data:image/jpeg;base64,${compressedBuf.toString('base64')}`

      await prisma.dog.update({
        where: { id: dog.id },
        data: { photoUrl: newPhotoUrl },
      })

      compressed++
      results.push({ name: dog.name, oldKB: Math.round(originalSize / 1024), newKB: Math.round(newSize / 1024) })
    } catch {
      skipped++
    }
  }

  return NextResponse.json({
    total: dogs.length,
    compressed,
    skipped,
    totalSavedMB: Math.round(totalSaved / 1024 / 1024 * 100) / 100,
    results,
  })
}
