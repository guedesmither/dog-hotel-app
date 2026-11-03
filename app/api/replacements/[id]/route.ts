import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { removeReposicaoRosterEntry } from '@/lib/replacements'

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

  const { scheduledDate, status } = await req.json() as { scheduledDate?: string | null; status?: string }

  const current = await prisma.replacement.findUnique({ where: { id: params.id } })
  if (!current) return NextResponse.json({ error: 'Reposição não encontrada' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (scheduledDate) {
    data.scheduledDate = scheduledDate
    data.status = 'SCHEDULED'
  } else if (scheduledDate === null || status === 'PENDING' || status === 'EXPIRED') {
    data.scheduledDate = null
    data.status = status && status !== 'SCHEDULED' ? status : 'PENDING'
  }
  if (status !== undefined && data.status === undefined) data.status = status

  // Keep the agenda in sync: drop the REPOSICAO entry from the previous date when it moves or is cleared
  if (current.scheduledDate && current.scheduledDate !== scheduledDate && data.scheduledDate !== undefined) {
    await removeReposicaoRosterEntry(current.dogId, current.scheduledDate)
  }

  const replacement = await prisma.replacement.update({
    where: { id: params.id },
    data,
    include: {
      dog: { select: { id: true, name: true, photoUrl: true } },
    },
  })

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

  const deleted = await prisma.replacement.delete({ where: { id: params.id } })
  if (deleted.scheduledDate) await removeReposicaoRosterEntry(deleted.dogId, deleted.scheduledDate)
  return NextResponse.json({ success: true })
}
