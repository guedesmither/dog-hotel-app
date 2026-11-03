import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcMensalPeriod, calcMensalQuota, getMensalWindow, isCrecheSale } from '@/lib/roster-seed'

export const dynamic = 'force-dynamic'

const ACTIVE_SALE_STATUSES = ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA']

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

type DayEntry = { date: string; type: string; present: boolean | null }

function countDays(days: DayEntry[], today: string) {
  return {
    present: days.filter(d => d.present === true).length,
    absent: days.filter(d => d.present === false).length,
    scheduled: days.filter(d => d.present === null && d.date >= today).length,
    unmarked: days.filter(d => d.present === null && d.date < today).length,
  }
}

// GET /api/presencas?ref=YYYY-MM-DD — days acquired vs consumed per dog, plus replacements
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const today = toDateStr(new Date())
  const refParam = searchParams.get('ref')
  const ref = refParam && /^\d{4}-\d{2}-\d{2}$/.test(refParam) ? refParam : today
  const refDate = new Date(ref + 'T12:00:00')

  const dogs = await prisma.dog.findMany({
    where: { isActive: true, isBolsista: false, NOT: { dogStatus: 'BOLSISTA' } },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      photoUrl: true,
      serviceType: true,
      scheduledDays: true,
      sales: {
        where: { paymentStatus: { in: ACTIVE_SALE_STATUSES } },
        include: { items: { include: { product: { select: { name: true, category: true } } } } },
      },
      packages: {
        where: {
          purchaseDate: { lte: new Date(ref + 'T23:59:59.999Z') },
          expiryDate: { gte: new Date(ref + 'T00:00:00.000Z') },
        },
        orderBy: { purchaseDate: 'asc' },
        include: { sale: { select: { manualBaixa: true } } },
      },
    },
  })

  type MensalPlan = { dogId: string; saleId: string; start: string; end: string; acquired: number | null }
  const mensalPlans: MensalPlan[] = []
  for (const dog of dogs) {
    const covering = dog.sales
      .filter(s => isCrecheSale(s))
      .filter(s => {
        const period = calcMensalPeriod(s)
        return !!period && refDate >= period.start && refDate <= period.end
      })
      .sort((a, b) => (calcMensalPeriod(b)!.start.getTime() - calcMensalPeriod(a)!.start.getTime()))[0]
    if (!covering) continue
    const window = getMensalWindow(covering, ref)
    if (!window) continue
    const quota = calcMensalQuota(covering, dog.scheduledDays, window.start, window.end)
    mensalPlans.push({
      dogId: dog.id,
      saleId: covering.id,
      start: toDateStr(window.start),
      end: toDateStr(window.end),
      acquired: Number.isFinite(quota) ? quota : null,
    })
  }

  const dogIds = dogs.map(d => d.id)
  const packageIds = dogs.flatMap(d => d.packages.map(p => p.id))
  const minStart = mensalPlans.reduce((m, p) => (p.start < m ? p.start : m), ref)
  const maxEnd = mensalPlans.reduce((m, p) => (p.end > m ? p.end : m), ref)

  const [mensalRoster, packageRoster, replacements] = await Promise.all([
    mensalPlans.length
      ? prisma.dailyRoster.findMany({
          where: {
            dogId: { in: mensalPlans.map(p => p.dogId) },
            type: { in: ['CRECHE', 'REPOSICAO'] },
            date: { gte: minStart, lte: maxEnd },
          },
          select: { dogId: true, date: true, type: true, present: true },
          orderBy: { date: 'asc' },
        })
      : Promise.resolve([]),
    packageIds.length
      ? prisma.dailyRoster.findMany({
          where: { packageId: { in: packageIds } },
          select: { packageId: true, date: true, type: true, present: true },
          orderBy: { date: 'asc' },
        })
      : Promise.resolve([]),
    prisma.replacement.findMany({
      where: {
        dogId: { in: dogIds },
        OR: [{ status: { in: ['PENDING', 'SCHEDULED'] } }, { absentDate: { gte: minStart, lte: maxEnd } }],
      },
      select: { id: true, dogId: true, absentDate: true, billingMonthEnd: true, scheduledDate: true, status: true },
      orderBy: { absentDate: 'asc' },
    }),
  ])

  const result = dogs.map(dog => {
    const dogReplacements = replacements.filter(r => r.dogId === dog.id)
    const coveredAbsences = new Set(
      dogReplacements.filter(r => r.status !== 'EXPIRED').map(r => r.absentDate)
    )
    const plans: any[] = []

    const mensal = mensalPlans.find(p => p.dogId === dog.id)
    if (mensal) {
      const days: DayEntry[] = mensalRoster
        .filter(e => e.dogId === dog.id && e.date >= mensal.start && e.date <= mensal.end)
        .map(e => ({ date: e.date, type: e.type, present: e.present }))
      const counts = countDays(days, today)
      const absentLost = days.filter(d => d.present === false && d.type === 'CRECHE' && !coveredAbsences.has(d.date)).length
      const balance = mensal.acquired === null
        ? null
        : mensal.acquired - counts.present - counts.scheduled - counts.unmarked - absentLost
      plans.push({ kind: 'MENSAL', id: mensal.saleId, start: mensal.start, end: mensal.end, acquired: mensal.acquired, ...counts, absentLost, balance, days, closed: false })
    }

    for (const pkg of dog.packages) {
      const days: DayEntry[] = packageRoster
        .filter(e => e.packageId === pkg.id)
        .map(e => ({ date: e.date, type: e.type, present: e.present }))
      const counts = countDays(days, today)
      plans.push({
        kind: 'PACOTE',
        id: pkg.id,
        start: toDateStr(pkg.purchaseDate),
        end: toDateStr(pkg.expiryDate),
        acquired: pkg.totalDays,
        ...counts,
        absentLost: 0,
        balance: pkg.remainingDays,
        days,
        closed: !pkg.isActive || !!pkg.sale?.manualBaixa,
      })
    }

    return {
      dog: { id: dog.id, name: dog.name, photoUrl: dog.photoUrl, serviceType: dog.serviceType, scheduledDays: dog.scheduledDays },
      plans,
      replacements: dogReplacements.map(({ dogId: _dogId, ...r }) => r),
    }
  }).filter(d => d.plans.length > 0 || d.replacements.some(r => r.status === 'PENDING' || r.status === 'SCHEDULED'))

  return NextResponse.json({ ref, today, dogs: result })
}
