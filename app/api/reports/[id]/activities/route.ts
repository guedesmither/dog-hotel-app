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

  const data = await req.json()

  const activity = await prisma.activity.create({
    data: {
      reportId: params.id,
      name: data.name,
      participated: data.participated !== undefined ? data.participated : true,
      notes: data.notes || null,
    },
  })

  return NextResponse.json(activity, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const activityId = searchParams.get('activityId')

  if (!activityId) return NextResponse.json({ error: 'activityId necessário' }, { status: 400 })

  await prisma.activity.delete({ where: { id: activityId } })

  return NextResponse.json({ success: true })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const data = await req.json()

  const activity = await prisma.activity.update({
    where: { id: data.id },
    data: {
      name: data.name,
      participated: data.participated,
      notes: data.notes || null,
    },
  })

  return NextResponse.json(activity)
}
