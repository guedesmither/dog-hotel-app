import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'TUTOR' || role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { scheduledDate, status } = await req.json()

  const data: Record<string, unknown> = {}
  if (scheduledDate !== undefined) {
    data.scheduledDate = scheduledDate
    data.status = 'SCHEDULED'
  }
  if (status !== undefined) data.status = status

  const replacement = await prisma.replacement.update({
    where: { id: params.id },
    data,
    include: {
      dog: { select: { id: true, name: true, photoUrl: true } },
    },
  })

  // If scheduling a replacement date, also create/upsert the DailyRoster entry
  if (scheduledDate && replacement.dogId) {
    await prisma.dailyRoster.upsert({
      where: { dogId_date: { dogId: replacement.dogId, date: scheduledDate } },
      update: { source: 'MANUAL', type: 'REPOSICAO' },
      create: { dogId: replacement.dogId, date: scheduledDate, source: 'MANUAL', type: 'REPOSICAO' },
    })
  }

  return NextResponse.json(replacement)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await prisma.replacement.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
