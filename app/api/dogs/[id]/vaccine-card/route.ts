import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('photo') as File
  if (!file) return NextResponse.json({ error: 'Arquivo necessário' }, { status: 400 })

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande (máx 8MB)' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'vaccine-cards')
  await mkdir(uploadDir, { recursive: true })

  const ext = file.name.split('.').pop()
  const filename = `${params.id}-${Date.now()}.${ext}`
  const filepath = path.join(uploadDir, filename)
  await writeFile(filepath, buffer)

  const url = `/uploads/vaccine-cards/${filename}`

  const dog = await prisma.dog.update({
    where: { id: params.id },
    data: { vaccineCardUrl: url },
    select: { vaccineCardUrl: true },
  })

  return NextResponse.json(dog, { status: 200 })
}
