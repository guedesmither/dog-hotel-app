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
  const type = (formData.get('type') as string) || 'CHECKIN'
  const caption = formData.get('caption') as string

  if (!file) return NextResponse.json({ error: 'Arquivo necessário' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'stays', params.id)
  await mkdir(uploadDir, { recursive: true })

  const ext = file.name.split('.').pop()
  const filename = `${type.toLowerCase()}-${Date.now()}.${ext}`
  const filepath = path.join(uploadDir, filename)
  await writeFile(filepath, buffer)

  const url = `/uploads/stays/${params.id}/${filename}`

  const photo = await prisma.stayPhoto.create({
    data: { stayId: params.id, url, type, caption: caption || null },
  })

  return NextResponse.json(photo, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const photoId = searchParams.get('photoId')
  if (!photoId) return NextResponse.json({ error: 'photoId necessário' }, { status: 400 })

  await prisma.stayPhoto.delete({ where: { id: photoId } })
  return NextResponse.json({ success: true })
}
