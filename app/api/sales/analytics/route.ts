import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { eachDayOfInterval, getDay, parseISO, startOfMonth, endOfMonth } from 'date-fns'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const yearMonth = searchParams.get('yearMonth')
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')

  const salesWhere: any = {}
  let rosterDateFilter: any = {}

  if (yearMonth) {
    const [year, month] = yearMonth.split('-').map(Number)
    salesWhere.saleDate = {
      gte: new Date(year, month - 1, 1),
      lte: new Date(year, month, 0, 23, 59, 59, 999),
    }
    const endDay = new Date(year, month, 0)
    rosterDateFilter = { gte: `${yearMonth}-01`, lte: endDay.toISOString().split('T')[0] }
  } else if (startDateParam && endDateParam) {
    salesWhere.saleDate = {
      gte: new Date(startDateParam),
      lte: new Date(endDateParam + 'T23:59:59'),
    }
    rosterDateFilter = { gte: startDateParam, lte: endDateParam }
  }

  const sales = await prisma.sales.findMany({
    where: salesWhere,
    include: {
      dog: { select: { id: true, name: true, ownerName: true, matricula: true, scheduledDays: true, frequencyDays: true } },
      items: { include: { product: { select: { id: true, name: true, category: true } } } },
    },
    orderBy: { saleDate: 'asc' },
  })

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalGross     = sales.reduce((s, x) => s + x.basePrice, 0)
  const totalDiscount  = sales.reduce((s, x) => s + (x.discount ?? 0), 0)
  const totalNet       = sales.reduce((s, x) => s + x.finalPrice, 0)
  const totalReceived  = sales.filter(x => x.paymentStatus === 'PAGO').reduce((s, x) => s + (x.amountReceived ?? x.finalPrice), 0)
  const totalProgrammed = sales.filter(x => x.paymentStatus === 'PROGRAMADA' || x.paymentStatus === 'AGENDADO').reduce((s, x) => s + x.finalPrice, 0)
  const totalPending   = sales.filter(x => x.paymentStatus === 'PENDENTE').reduce((s, x) => s + x.finalPrice, 0)
  const salesWithDiscount    = sales.filter(x => (x.discount ?? 0) > 0).length
  const salesWithoutDiscount = sales.filter(x => (x.discount ?? 0) === 0).length

  // ── By month ──────────────────────────────────────────────────────────────
  const monthMap = new Map<string, { gross: number; discount: number; net: number; received: number; count: number }>()
  for (const s of sales) {
    const m = new Date(s.saleDate).toISOString().slice(0, 7)
    if (!monthMap.has(m)) monthMap.set(m, { gross: 0, discount: 0, net: 0, received: 0, count: 0 })
    const e = monthMap.get(m)!
    e.gross += s.basePrice; e.discount += (s.discount ?? 0); e.net += s.finalPrice; e.count++
    if (s.paymentStatus === 'PAGO') e.received += s.amountReceived ?? s.finalPrice
  }
  const byMonth = Array.from(monthMap.entries()).map(([month, d]) => ({ month, ...d })).sort((a, b) => a.month.localeCompare(b.month))

  // ── By day ────────────────────────────────────────────────────────────────
  const dayMap = new Map<string, { gross: number; net: number; received: number; count: number }>()
  for (const s of sales) {
    const d = new Date(s.saleDate).toISOString().split('T')[0]
    if (!dayMap.has(d)) dayMap.set(d, { gross: 0, net: 0, received: 0, count: 0 })
    const e = dayMap.get(d)!
    e.gross += s.basePrice; e.net += s.finalPrice; e.count++
    if (s.paymentStatus === 'PAGO') e.received += s.amountReceived ?? s.finalPrice
  }
  const byDay = Array.from(dayMap.entries()).map(([date, d]) => ({ date, ...d })).sort((a, b) => a.date.localeCompare(b.date))

  // ── By category & product ─────────────────────────────────────────────────
  const catMap = new Map<string, { gross: number; net: number; discount: number; qty: number }>()
  const prodMap = new Map<string, { productId: string; productName: string; category: string; gross: number; net: number; qty: number }>()
  for (const s of sales) {
    if (s.items.length === 0) {
      const cat = s.saleType
      if (!catMap.has(cat)) catMap.set(cat, { gross: 0, net: 0, discount: 0, qty: 0 })
      const e = catMap.get(cat)!; e.gross += s.basePrice; e.net += s.finalPrice; e.discount += (s.discount ?? 0); e.qty++
    }
    for (const item of s.items) {
      const cat = item.product?.category || 'SEM CATEGORIA'
      if (!catMap.has(cat)) catMap.set(cat, { gross: 0, net: 0, discount: 0, qty: 0 })
      const ec = catMap.get(cat)!; ec.gross += item.unitPrice * item.quantity; ec.net += item.totalPrice; ec.qty += item.quantity; ec.discount += 0

      const pid = item.product?.id || 'unknown'
      if (!prodMap.has(pid)) prodMap.set(pid, { productId: pid, productName: item.product?.name || '-', category: cat, gross: 0, net: 0, qty: 0 })
      const ep = prodMap.get(pid)!; ep.gross += item.unitPrice * item.quantity; ep.net += item.totalPrice; ep.qty += item.quantity
    }
  }
  const byCategory = Array.from(catMap.entries()).map(([category, d]) => ({ category, ...d })).sort((a, b) => b.net - a.net)
  const byProduct   = Array.from(prodMap.values()).sort((a, b) => b.net - a.net)

  // ── By dog ────────────────────────────────────────────────────────────────
  // DOW name → number mapping
  const DOW_MAP: Record<string, number> = {
    domingo: 0, segunda: 1, 'segunda-feira': 1, terça: 2, terca: 2, 'terça-feira': 2,
    quarta: 3, 'quarta-feira': 3, quinta: 4, 'quinta-feira': 4,
    sexta: 5, 'sexta-feira': 5, sabado: 6, sábado: 6,
  }
  function parseScheduledDOWs(scheduledDays: string | null): number[] {
    if (!scheduledDays) return []
    return scheduledDays.split(',').map(d => DOW_MAP[d.trim().toLowerCase()]).filter(n => n !== undefined)
  }
  // Count how many days in the period match the dog's scheduled DOWs
  function countScheduledDaysInPeriod(scheduledDays: string | null, frequencyDays: number | null, periodStart: Date, periodEnd: Date): number {
    const dows = parseScheduledDOWs(scheduledDays)
    if (dows.length > 0) {
      return eachDayOfInterval({ start: periodStart, end: periodEnd }).filter(d => dows.includes(getDay(d))).length
    }
    // Fallback: use frequencyDays * weeks in period
    if (frequencyDays) {
      const weeks = (periodEnd.getTime() - periodStart.getTime()) / (7 * 24 * 3600 * 1000)
      return Math.round(frequencyDays * weeks)
    }
    return 0
  }

  // Determine period for scheduled-days calculation
  const periodStart = yearMonth
    ? startOfMonth(parseISO(yearMonth + '-01'))
    : startDateParam ? parseISO(startDateParam) : startOfMonth(new Date())
  const periodEnd = yearMonth
    ? endOfMonth(parseISO(yearMonth + '-01'))
    : endDateParam ? parseISO(endDateParam) : endOfMonth(new Date())

  // Types that do NOT count toward day divisor (no day-rate concept)
  const NO_DAY_TYPES = new Set(['PRODUTO', 'SERVICO', 'BANHO'])

  // Calculate contracted days per sale based on saleType
  function contractedDaysForSale(s: (typeof sales)[number]): number {
    const t = s.saleType?.toUpperCase() ?? ''
    if (NO_DAY_TYPES.has(t)) return 0
    if (t === 'MENSAL') {
      // Use scheduled DOWs in the billing period
      const dog = s.dog as any
      return countScheduledDaysInPeriod(dog?.scheduledDays ?? null, dog?.frequencyDays ?? null, periodStart, periodEnd)
    }
    if (t === 'HOTEL' || t === 'AVULSO') {
      if (s.startDate && s.endDate) {
        const start = new Date(s.startDate); start.setHours(0,0,0,0)
        const end   = new Date(s.endDate);   end.setHours(0,0,0,0)
        const days = Math.round((end.getTime() - start.getTime()) / (24*3600*1000)) + 1
        return Math.max(1, days)
      }
      return 1 // single-day avulso
    }
    if (t === 'PACOTE') {
      // Extract total days from product name e.g. "Pacote 10 Dias" → 10
      const productName: string = (s as any).items?.[0]?.product?.name || ''
      const match = productName.match(/(\d+)\s*Dia/i)
      if (match) return parseInt(match[1], 10)
      // Fallback: quantity from items
      const qty = (s as any).items?.[0]?.quantity ?? 1
      return qty
    }
    return 0
  }

  const dogMap = new Map<string, { dogId: string; dogName: string; ownerName: string; totalGross: number; totalDiscount: number; totalNet: number; totalReceived: number; salesCount: number; contractedDays: number }>()
  for (const s of sales) {
    if (!s.dogId || !s.dog) continue
    if (!dogMap.has(s.dogId)) dogMap.set(s.dogId, {
      dogId: s.dogId, dogName: s.dog.name, ownerName: s.dog.ownerName,
      totalGross: 0, totalDiscount: 0, totalNet: 0, totalReceived: 0, salesCount: 0,
      contractedDays: 0,
    })
    const e = dogMap.get(s.dogId)!
    e.totalGross += s.basePrice; e.totalDiscount += (s.discount ?? 0); e.totalNet += s.finalPrice; e.salesCount++
    if (s.paymentStatus === 'PAGO') e.totalReceived += s.amountReceived ?? s.finalPrice
    e.contractedDays += contractedDaysForSale(s)
  }

  const dogIds = Array.from(dogMap.keys())
  const attendance = dogIds.length > 0 ? await prisma.dailyRoster.groupBy({
    by: ['dogId'],
    where: { dogId: { in: dogIds }, present: true, ...(Object.keys(rosterDateFilter).length > 0 ? { date: rosterDateFilter } : {}) },
    _count: { id: true },
  }) : []
  const attendMap = new Map(attendance.map(a => [a.dogId, a._count.id]))

  const byDog = Array.from(dogMap.values()).map(d => {
    const daysAttended = attendMap.get(d.dogId) ?? 0
    // contractedDays = days from the sale contract (mensal schedule, hotel range, avulso qty, package qty)
    // Fall back to days attended if no contract days computed
    const divisor = d.contractedDays > 0 ? d.contractedDays : daysAttended
    return {
      dogId: d.dogId, dogName: d.dogName, ownerName: d.ownerName,
      totalGross: d.totalGross, totalDiscount: d.totalDiscount, totalNet: d.totalNet,
      totalReceived: d.totalReceived, salesCount: d.salesCount,
      daysAttended,
      scheduledInPeriod: d.contractedDays,
      dailyNet:      divisor > 0 ? d.totalNet      / divisor : 0,
      dailyReceived: divisor > 0 ? d.totalReceived / divisor : 0,
    }
  }).sort((a, b) => b.totalNet - a.totalNet)

  // ── By tutor ──────────────────────────────────────────────────────────────
  const tutorMap = new Map<string, { ownerName: string; totalNet: number; totalReceived: number; dogSet: Set<string>; salesCount: number }>()
  for (const s of sales) {
    if (!s.dog) continue
    const owner = s.dog.ownerName
    if (!tutorMap.has(owner)) tutorMap.set(owner, { ownerName: owner, totalNet: 0, totalReceived: 0, dogSet: new Set(), salesCount: 0 })
    const e = tutorMap.get(owner)!
    e.totalNet += s.finalPrice; e.salesCount++
    if (s.dogId) e.dogSet.add(s.dogId)
    if (s.paymentStatus === 'PAGO') e.totalReceived += s.amountReceived ?? s.finalPrice
  }
  const byTutor = Array.from(tutorMap.values()).map(t => ({ ownerName: t.ownerName, totalNet: t.totalNet, totalReceived: t.totalReceived, dogs: t.dogSet.size, salesCount: t.salesCount })).sort((a, b) => b.totalNet - a.totalNet)

  return NextResponse.json({
    summary: { totalGross, totalDiscount, totalNet, totalReceived, totalProgrammed, totalPending, salesCount: sales.length, salesWithDiscount, salesWithoutDiscount },
    byMonth, byDay, byCategory, byProduct, byDog, byTutor,
  })
}
