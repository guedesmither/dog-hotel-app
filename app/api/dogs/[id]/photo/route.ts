import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import sharp from 'sharp'

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
  const compressed = await sharp(Buffer.from(bytes))
    .resize(300, 300, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 80 })
    .toBuffer()
  const photoUrl = `data:image/jpeg;base64,${compressed.toString('base64')}`

  const dog = await prisma.dog.update({
    where: { id: params.id },
    data: { photoUrl },
    select: { photoUrl: true },
  })

  return NextResponse.json(dog)
}
