import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const INAUGURATION_DATE = new Date('2026-02-07T12:00:00Z')

function calcPeriod(date: Date) {
  return date < INAUGURATION_DATE
    ? 'PRE_INAUGURACAO'
    : `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const entries = await prisma.financialEntry.findMany({ select: { id: true, date: true, period: true } })

  let fixed = 0
  const updates: { id: string; oldPeriod: string; newPeriod: string; date: string }[] = []

  for (const e of entries) {
    const newPeriod = calcPeriod(e.date)
    if (newPeriod !== e.period) {
      updates.push({ id: e.id, oldPeriod: e.period, newPeriod, date: e.date.toISOString().split('T')[0] })
      await prisma.financialEntry.update({ where: { id: e.id }, data: { period: newPeriod } })
      fixed++
    }
  }

  return NextResponse.json({ total: entries.length, fixed, updates })
}
