import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function getCycleRange(
  monthlyStartDay: number | null,
  enrollmentDate: string | null,
): { start: string; end: string; label: string } {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  if (monthlyStartDay) {
    // Billing cycle based on monthly start day
    let cycleStart: Date
    if (today.getDate() >= monthlyStartDay) {
      cycleStart = new Date(today.getFullYear(), today.getMonth(), monthlyStartDay)
    } else {
      cycleStart = new Date(today.getFullYear(), today.getMonth() - 1, monthlyStartDay)
    }
    const cycleEnd = new Date(cycleStart)
    cycleEnd.setMonth(cycleEnd.getMonth() + 1)
    cycleEnd.setDate(cycleEnd.getDate() - 1)
    return {
      start: cycleStart.toISOString().split('T')[0],
      end: cycleEnd.toISOString().split('T')[0],
      label: 'Ciclo de cobrança',
    }
  }

  if (enrollmentDate) {
    // From enrollment date to today
    return {
      start: enrollmentDate,
      end: todayStr,
      label: 'Desde a matrícula',
    }
  }

  // Fallback: last 30 days
  const start = new Date(today)
  start.setDate(start.getDate() - 30)
  return {
    start: start.toISOString().split('T')[0],
    end: todayStr,
    label: 'Últimos 30 dias',
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const dog = await prisma.dog.findUnique({
    where: { id: params.id },
    select: { monthlyStartDay: true, scheduledDays: true, enrollmentDate: true },
  })
  if (!dog) return NextResponse.json({ error: 'Cão não encontrado' }, { status: 404 })

  const { start, end, label } = getCycleRange(dog.monthlyStartDay, dog.enrollmentDate ?? null)
  const today = new Date().toISOString().split('T')[0]

  // Fetch all roster entries for this dog in the current cycle
  const entries = await prisma.dailyRoster.findMany({
    where: {
      dogId: params.id,
      date: { gte: start, lte: end },
    },
    select: { date: true, present: true },
    orderBy: { date: 'asc' },
  })

  // Fetch replacements pending/scheduled for this cycle
  const replacements = await prisma.replacement.findMany({
    where: {
      dogId: params.id,
      absentDate: { gte: start, lte: end },
      status: { in: ['PENDING', 'SCHEDULED'] },
    },
    select: { absentDate: true, status: true, scheduledDate: true },
  })

  type Entry = { date: string; present: boolean | null }
  const presentDays   = entries.filter((e: Entry) => e.present === true).length
  const absentDays    = entries.filter((e: Entry) => e.present === false).length
  const upcomingDays  = entries.filter((e: Entry) => e.present === null && e.date > today).length
  const totalExpected = entries.filter((e: Entry) => e.date <= today).length

  return NextResponse.json({
    cycleStart: start,
    cycleEnd: end,
    cycleLabel: label,
    presentDays,
    absentDays,
    upcomingDays,
    totalExpected,
    totalRosterDays: entries.length,
    replacements,
  })
}
