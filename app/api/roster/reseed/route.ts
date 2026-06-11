import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  // Helper: seed a single date (copied from main route)
  async function seedDate(date: string) {
    const dayName = getDayName(date)
    const targetDateObj = new Date(date + 'T12:00:00Z')
    const added: string[] = []

    // 1. Add bolsista dogs
    const bolsistaDogs = await (prisma.dog as any).findMany({
      where: { isBolsista: true, isActive: true, serviceType: 'CRECHE' },
      select: { id: true, name: true, serviceType: true, scheduledDays: true },
    })
    for (const d of bolsistaDogs) {
      const hasSchedule = d.scheduledDays && d.scheduledDays.trim() !== ''
      if (!hasSchedule) continue
      if (!d.scheduledDays.includes(dayName)) continue
      await prisma.dailyRoster.upsert({
        where: { dogId_date: { dogId: d.id, date } },
        update: {},
        create: { dogId: d.id, date, source: 'AUTO', type: 'CRECHE' },
      })
      added.push(`[BOLSISTA] ${d.name}`)
    }

    // 2. Add MENSAL dogs with valid sales covering this date
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const mensalSales = await prisma.sales.findMany({
      where: {
        saleType: 'MENSAL',
        paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
        manualBaixa: false,
        OR: [{ endDate: null }, { endDate: { gte: today } }],
        dogId: { not: null },
      },
      select: { dogId: true, startDate: true, endDate: true, saleDate: true },
    })

    const eligibleIds = new Set<string>()
    for (const s of mensalSales) {
      const start = s.startDate ? new Date(s.startDate) : new Date(s.saleDate)
      start.setHours(0, 0, 0, 0)
      const end = s.endDate
        ? new Date(s.endDate)
        : (() => { const d = new Date(start); d.setMonth(d.getMonth() + 1); return d })()
      end.setHours(23, 59, 59, 999)
      if (s.dogId && targetDateObj >= start && targetDateObj <= end) {
        eligibleIds.add(s.dogId)
      }
    }

    if (eligibleIds.size > 0) {
      const crecheDogs = await prisma.dog.findMany({
        where: {
          id: { in: Array.from(eligibleIds) },
          isActive: true,
          serviceType: 'CRECHE',
          AND: [
            { scheduledDays: { not: null } },
            { scheduledDays: { not: '' } },
            { scheduledDays: { contains: dayName } },
          ],
        },
        select: { id: true, name: true, serviceType: true },
      })

      for (const d of crecheDogs) {
        await prisma.dailyRoster.upsert({
          where: { dogId_date: { dogId: d.id, date } },
          update: {},
          create: { dogId: d.id, date, source: 'AUTO', type: 'CRECHE' },
        })
        added.push(`[MENSAL] ${d.name}`)
      }
    }

    // Mark as seeded
    await prisma.dailyRosterSeed.upsert({
      where: { date },
      update: {},
      create: { date },
    })

    return added
  }

  // Handle specific dates
  if (dates && Array.isArray(dates) && dates.length > 0) {
    for (const date of dates) {
      // Remove existing seed record to force re-seed
      await prisma.dailyRosterSeed.deleteMany({ where: { date } })
      // Delete AUTO entries for this date (keep MANUAL entries)
      await prisma.dailyRoster.deleteMany({ where: { date, source: 'AUTO' } })
      // Re-seed
      const added = await seedDate(date)
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
      const added = await seedDate(date)
      results.push({ date, action: 'RESEED_FUTURE', added })
    }
  }

  return NextResponse.json({
    message: `${results.length} dias re-semeados`,
    results,
  })
}

function getDayName(dateStr: string): string {
  const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
  const d = new Date(dateStr + 'T12:00:00Z')
  return days[d.getDay()]
}
