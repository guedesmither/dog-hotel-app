import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { seedDate } from '@/lib/roster-seed'

// POST /api/roster/reseed
// Force re-seed of specific dates (removes DailyRosterSeed entries and re-runs seedDate)
// This is needed when:
// 1. A new MENSAL sale is created (need to add dog to future dates)
// 2. Bolsistas are not showing up (need to re-seed)
// 3. scheduledDays changed for a dog

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const { dates, dogId, allFuture } = body

  const results: Array<{ date: string; action: string; added: string[] }> = []

  // Handle specific dates
  if (dates && Array.isArray(dates) && dates.length > 0) {
    for (const date of dates) {
      // Remove existing seed record to force re-seed
      await prisma.dailyRosterSeed.deleteMany({ where: { date } })
      // Delete AUTO entries for this date (keep MANUAL entries)
      await prisma.dailyRoster.deleteMany({ where: { date, source: 'AUTO' } })
      // Re-seed
      const { added } = await seedDate(date)
      results.push({ date, action: 'RESEED', added })
    }
  }

  // Handle all future dates (for new MENSAL sale)
  if (allFuture && dogId) {
    const today = new Date().toISOString().split('T')[0]
    const futureSeeds = await prisma.dailyRosterSeed.findMany({
      where: { date: { gte: today } },
      select: { date: true },
    })

    for (const { date } of futureSeeds) {
      // Remove existing seed record
      await prisma.dailyRosterSeed.deleteMany({ where: { date } })
      // Delete AUTO entries for this date
      await prisma.dailyRoster.deleteMany({ where: { date, source: 'AUTO' } })
      // Re-seed
      const { added } = await seedDate(date)
      results.push({ date, action: 'RESEED_FUTURE', added })
    }
  }

  return NextResponse.json({
    message: `${results.length} dias re-semeados`,
    results,
  })
}

