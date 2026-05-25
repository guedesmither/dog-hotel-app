import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('photo') as File
  const caption = formData.get('caption') as string

  if (!file) {
    return NextResponse.json({ error: 'Arquivo necessário' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Foto muito grande (máx. 5MB)' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mimeType = file.type || 'image/jpeg'
  const url = `data:${mimeType};base64,${base64}`

  const photo = await prisma.reportPhoto.create({
    data: {
      reportId: params.id,
      url,
      caption: caption || null,
    },
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

  await prisma.reportPhoto.delete({ where: { id: photoId } })

  return NextResponse.json({ success: true })
}
