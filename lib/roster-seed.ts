import { prisma } from './prisma'

const DAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const DAY_NAME_MAP: Record<number, string[]> = {
  0: ['domingo', 'dom'],
  1: ['segunda', 'seg'],
  2: ['terça', 'ter', 'terca'],
  3: ['quarta', 'qua'],
  4: ['quinta', 'qui'],
  5: ['sexta', 'sex'],
  6: ['sábado', 'sab', 'sabado'],
}

export function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return DAYS_PT[d.getDay()]
}

export function parseSaleDate(dateValue: any): Date | null {
  if (!dateValue) return null
  if (typeof dateValue === 'string') {
    if (dateValue.includes('/')) {
      const parts = dateValue.split('/')
      if (parts.length !== 3) return null
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const year = parseInt(parts[2], 10)
      return new Date(year, month, day)
    }
    return new Date(dateValue)
  }
  if (dateValue instanceof Date) return dateValue
  return null
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function isDayScheduled(scheduledDays: string | null | undefined, dayOfWeek: number): boolean {
  if (!scheduledDays || scheduledDays.trim() === '') return true
  const scheduledLower = scheduledDays.toLowerCase()
  const aliases = DAY_NAME_MAP[dayOfWeek] || []
  return aliases.some((alias) => scheduledLower.includes(alias))
}

export function countScheduledOccurrences(scheduledDays: string, start: Date, end: Date): number {
  const scheduledLower = scheduledDays.toLowerCase()
  let count = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endNorm = new Date(end)
  endNorm.setHours(23, 59, 59, 999)
  while (cur <= endNorm) {
    const aliases = DAY_NAME_MAP[cur.getDay()] || []
    if (aliases.some((a) => scheduledLower.includes(a))) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function getFrequencyFromProduct(sale: any): number {
  for (const item of sale.items || []) {
    const name: string = item.product?.name || ''
    const m = name.match(/(\d+)\s*x/i)
    if (m) return parseInt(m[1], 10)
  }
  return 0
}

export function isCrecheSale(sale: any): boolean {
  if (sale.saleType === 'MENSAL') return true
  return (sale.items || []).some((item: any) => {
    const category = item.product?.category
    const name = (item.product?.name || '').toLowerCase()
    return (
      category === 'CRECHE' ||
      ((name.includes('creche') || name.includes('mensal')) && !name.includes('pacote'))
    )
  })
}

export function calcMensalPeriod(sale: any): { start: Date; end: Date } | null {
  const start = parseSaleDate(sale.startDate) || parseSaleDate(sale.saleDate)
  if (!start) return null
  start.setHours(0, 0, 0, 0)

  let end = parseSaleDate(sale.endDate)
  if (!end) {
    // No explicit endDate: open-ended subscription, valid indefinitely
    end = new Date('2099-12-31')
  }
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function calcAvulsoPeriod(sale: any): { start: Date; end: Date } | null {
  const start = parseSaleDate(sale.startDate) || parseSaleDate(sale.saleDate)
  if (!start) return null
  start.setHours(0, 0, 0, 0)

  let end = parseSaleDate(sale.endDate)
  if (!end) {
    end = new Date(start)
    end.setDate(end.getDate() + 30) // AVULSO: 30 dias para usar os créditos
  }
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function calcHotelPeriod(sale: any): { start: Date; end: Date; nights: number } | null {
  let start = parseSaleDate(sale.startDate)
  let end = parseSaleDate(sale.endDate)
  let nights = 0

  if (start && end) {
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return { start, end, nights }
  }

  // Fallback: legacy sales without explicit dates
  const saleDate = parseSaleDate(sale.saleDate)
  if (!saleDate) return null
  start = new Date(saleDate)
  start.setHours(0, 0, 0, 0)
  let totalDays = 0
  for (const item of sale.items || []) {
    const name: string = item.product?.name || ''
    const daysMatch = name.match(/(\d+)\s*Di[aá]s?/i)
    if (daysMatch) {
      totalDays += parseInt(daysMatch[1], 10) * (item.quantity || 1)
    } else {
      totalDays += item.quantity || 1
    }
  }
  end = new Date(start)
  end.setDate(end.getDate() + totalDays + 14)
  end.setHours(23, 59, 59, 999)
  return { start, end, nights: totalDays }
}

function countPurchasedAvulsoDays(sale: any): number {
  return (sale.items || [])
    .filter(
      (item: any) =>
        item.product?.category === 'AVULSO' ||
        /dia|diária|diaria|avulso/i.test(item.product?.name || '')
    )
    .reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
}

export async function calcMensalAllowed(
  sale: any,
  dog: any,
  date: string
): Promise<{ allowed: number; used: number }> {
  const period = calcMensalPeriod(sale)
  if (!period) return { allowed: Infinity, used: 0 }

  // If sale has no explicit endDate, calculate window for the target month only
  const hasExplicitEnd = !!sale.endDate
  const targetDate = new Date(date + 'T12:00:00')
  const windowStart = hasExplicitEnd
    ? period.start
    : (() => {
        const d = new Date(targetDate)
        d.setDate(1)
        d.setHours(0, 0, 0, 0)
        return d
      })()
  const windowEnd = hasExplicitEnd
    ? period.end
    : (() => {
        const d = new Date(targetDate)
        d.setDate(1)
        d.setMonth(d.getMonth() + 1)
        d.setDate(0)
        d.setHours(23, 59, 59, 999)
        return d
      })()

  let allowed: number
  if (dog.scheduledDays && dog.scheduledDays.trim() !== '') {
    allowed = countScheduledOccurrences(dog.scheduledDays, windowStart, windowEnd)
  } else {
    const freq = getFrequencyFromProduct(sale)
    if (freq > 0) {
      const weeks = Math.ceil((windowEnd.getTime() - windowStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
      allowed = freq * weeks
    } else {
      allowed = Infinity
    }
  }

  const used = await prisma.dailyRoster.count({
    where: {
      dogId: dog.id,
      type: 'CRECHE',
      date: { gte: windowStart.toISOString().split('T')[0], lte: windowEnd.toISOString().split('T')[0] },
    },
  })

  return { allowed, used }
}

async function upsertRosterEntry(
  dogId: string,
  date: string,
  type: string,
  source: string,
  added: string[]
) {
  await prisma.dailyRoster.upsert({
    where: { dogId_date: { dogId, date } },
    update: { type, source },
    create: { dogId, date, type, source },
  })
  added.push(`[${type}] ${dogId}`)
}

async function seedBolsistas(date: string, targetDateObj: Date, added: string[]) {
  const allBolsistaDogs = await prisma.dog.findMany({
    where: { isBolsista: true, isActive: true },
    select: { id: true, name: true, scheduledDays: true, serviceType: true },
  })
  const bolsistaDogs = allBolsistaDogs.filter((d) => (d.serviceType || '').toUpperCase() === 'CRECHE')

  for (const dog of bolsistaDogs) {
    if (!dog.scheduledDays || dog.scheduledDays.trim() === '') continue
    if (!isDayScheduled(dog.scheduledDays, targetDateObj.getDay())) continue
    await upsertRosterEntry(dog.id, date, 'CRECHE', 'AUTO', added)
  }
}

async function seedMensalCreche(date: string, targetDateObj: Date, added: string[]) {
  // Fallback: only seed dogs that were NOT in the previous week's SAME DAY.
  // Dogs that were on this day last week are handled by replicateFromPreviousWeek.
  // Dogs that were on a different day last week should still be eligible here
  // (e.g. Betina was on Monday but has Wednesday in cadastro — she should be seeded on Wednesday).
  const previousDate = new Date(date + 'T12:00:00Z')
  previousDate.setDate(previousDate.getDate() - 7)
  const prevSameDayStr = previousDate.toISOString().split('T')[0]

  const prevSameDayEntries = await prisma.dailyRoster.findMany({
    where: {
      date: prevSameDayStr,
      type: 'CRECHE',
    },
    select: { dogId: true },
  })
  const dogsInPrevSameDay = new Set(prevSameDayEntries.map(e => e.dogId))

  const mensalSales = await prisma.sales.findMany({
    where: {
      OR: [
        { saleType: 'MENSAL' },
        { items: { some: { product: { category: 'CRECHE' } } } },
      ],
      paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
      manualBaixa: false,
      dogId: { not: null },
    },
    include: {
      dog: true,
      items: { include: { product: true } },
    },
  })

  // Pre-compute mensal period windows to batch roster counts
  const targetDate = new Date(date + 'T12:00:00')
  const hasExplicitEndMap = new Map<string, boolean>()
  const windowStartMap = new Map<string, Date>()
  const windowEndMap = new Map<string, Date>()
  const dogIdsForCount = new Set<string>()

  for (const sale of mensalSales) {
    if (!sale.dogId || !sale.dog) continue
    if (!isCrecheSale(sale)) continue
    const dog = sale.dog
    if (!dog.isActive || (dog.serviceType || '').toUpperCase() !== 'CRECHE') continue
    if (dogsInPrevSameDay.has(dog.id)) continue
    if (!dog.scheduledDays || dog.scheduledDays.trim() === '') continue
    if (!isDayScheduled(dog.scheduledDays, targetDateObj.getDay())) continue

    const period = calcMensalPeriod(sale)
    if (!period) continue
    if (targetDateObj < period.start || targetDateObj > period.end) continue

    const hasExplicitEnd = !!sale.endDate
    hasExplicitEndMap.set(sale.id, hasExplicitEnd)
    if (hasExplicitEnd) {
      windowStartMap.set(sale.id, period.start)
      windowEndMap.set(sale.id, period.end)
    } else {
      const ws = new Date(targetDate)
      ws.setDate(1)
      ws.setHours(0, 0, 0, 0)
      const we = new Date(targetDate)
      we.setDate(1)
      we.setMonth(we.getMonth() + 1)
      we.setDate(0)
      we.setHours(23, 59, 59, 999)
      windowStartMap.set(sale.id, ws)
      windowEndMap.set(sale.id, we)
    }
    if (sale.dogId) dogIdsForCount.add(sale.dogId)
  }

  // Batch: count CRECHE roster entries per dog for the relevant windows
  const crecheCounts = new Map<string, number>()
  if (dogIdsForCount.size > 0) {
    const counts = await prisma.dailyRoster.groupBy({
      by: ['dogId'],
      where: {
        dogId: { in: Array.from(dogIdsForCount) },
        type: 'CRECHE',
      },
      _count: { _all: true },
    })
    for (const c of counts) {
      if (c.dogId) crecheCounts.set(c.dogId, c._count._all)
    }
  }

  for (const sale of mensalSales) {
    if (!sale.dogId || !sale.dog) continue
    if (!isCrecheSale(sale)) continue
    const dog = sale.dog
    if (!dog.isActive || (dog.serviceType || '').toUpperCase() !== 'CRECHE') continue

    // Skip dogs that were in the previous week's same day — they're managed by replication
    if (dogsInPrevSameDay.has(dog.id)) continue

    // First time: must have scheduledDays in cadastro, and this day must be scheduled
    if (!dog.scheduledDays || dog.scheduledDays.trim() === '') continue
    if (!isDayScheduled(dog.scheduledDays, targetDateObj.getDay())) continue

    const period = calcMensalPeriod(sale)
    if (!period) continue

    if (targetDateObj < period.start || targetDateObj > period.end) continue

    // Use batched count instead of individual calcMensalAllowed
    const ws = windowStartMap.get(sale.id)!
    const we = windowEndMap.get(sale.id)!
    let allowed: number
    if (dog.scheduledDays && dog.scheduledDays.trim() !== '') {
      allowed = countScheduledOccurrences(dog.scheduledDays, ws, we)
    } else {
      const freq = getFrequencyFromProduct(sale)
      if (freq > 0) {
        const weeks = Math.ceil((we.getTime() - ws.getTime()) / (7 * 24 * 60 * 60 * 1000))
        allowed = freq * weeks
      } else {
        allowed = Infinity
      }
    }

    if (allowed !== Infinity) {
      const used = crecheCounts.get(sale.dogId) || 0
      if (used >= allowed) continue
    }

    await upsertRosterEntry(dog.id, date, 'CRECHE', 'AUTO', added)
  }
}

// seedAvulso removed — was dead code (never called in seedDate).
// AVULSO/PACOTE seeding is handled by replicateFromPreviousWeek and seedPacote.

async function seedHotel(date: string, targetDateObj: Date, added: string[]) {
  // Auto-seed from scheduled hotel stays
  const scheduledStays = await prisma.stay.findMany({
    where: {
      isScheduled: true,
      scheduledCheckIn: { not: null },
      scheduledCheckOut: { not: null },
    },
    include: { dog: true },
  })

  // Batch: fetch completed stays (non-scheduled, with checkOut) to detect consumed hotel periods
  const allDogIds = Array.from(new Set(scheduledStays.map(s => s.dogId).filter(Boolean) as string[]))
  const completedStaysByDog = new Map<string, { checkIn: Date | null; checkOut: Date | null }[]>()
  if (allDogIds.length > 0) {
    const completedStays = await prisma.stay.findMany({
      where: {
        dogId: { in: allDogIds },
        isScheduled: false,
        checkOut: { not: null },
      },
      select: { dogId: true, checkIn: true, checkOut: true },
    })
    for (const cs of completedStays) {
      if (!cs.dogId) continue
      const arr = completedStaysByDog.get(cs.dogId) || []
      arr.push({ checkIn: cs.checkIn, checkOut: cs.checkOut })
      completedStaysByDog.set(cs.dogId, arr)
    }
  }

  for (const stay of scheduledStays) {
    if (!stay.dog) continue
    const dog = stay.dog
    if (!dog.isActive) continue

    const start = new Date(stay.scheduledCheckIn!)
    start.setHours(0, 0, 0, 0)
    const end = new Date(stay.scheduledCheckOut!)
    end.setHours(23, 59, 59, 999)

    if (targetDateObj < start || targetDateObj > end) continue

    // Skip if dog already checked out from this hotel period
    const dogCompleted = completedStaysByDog.get(dog.id) || []
    const isConsumed = dogCompleted.some(cs => {
      if (!cs.checkOut) return false
      const co = new Date(cs.checkOut)
      co.setHours(0, 0, 0, 0)
      // If checkOut is on or after the scheduled checkIn, the dog already went through this period
      return co >= start
    })
    if (isConsumed) continue

    await upsertRosterEntry(dog.id, date, 'HOTEL', 'AUTO', added)
  }

  // Also seed from active hotel sales with explicit dates as fallback
  const hotelSales = await prisma.sales.findMany({
    where: {
      saleType: 'HOTEL',
      paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
      manualBaixa: false,
      dogId: { not: null },
      startDate: { not: null },
      endDate: { not: null },
    },
    include: { dog: true },
  })

  // Batch: fetch completed stays for hotel sale dogs too
  const saleDogIds = Array.from(new Set(hotelSales.map(s => s.dogId).filter(Boolean) as string[]))
  const saleCompletedByDog = new Map<string, { checkIn: Date | null; checkOut: Date | null }[]>()
  const missingSaleDogIds = saleDogIds.filter(id => !completedStaysByDog.has(id))
  if (missingSaleDogIds.length > 0) {
    const extraCompleted = await prisma.stay.findMany({
      where: {
        dogId: { in: missingSaleDogIds },
        isScheduled: false,
        checkOut: { not: null },
      },
      select: { dogId: true, checkIn: true, checkOut: true },
    })
    for (const cs of extraCompleted) {
      if (!cs.dogId) continue
      const arr = saleCompletedByDog.get(cs.dogId) || []
      arr.push({ checkIn: cs.checkIn, checkOut: cs.checkOut })
      saleCompletedByDog.set(cs.dogId, arr)
    }
  }

  for (const sale of hotelSales) {
    if (!sale.dogId || !sale.dog) continue
    const dog = sale.dog
    if (!dog.isActive) continue

    const period = calcHotelPeriod(sale)
    if (!period) continue

    if (targetDateObj < period.start || targetDateObj > period.end) continue

    // Skip if dog already checked out from this hotel period
    const dogCompleted = completedStaysByDog.get(dog.id) || saleCompletedByDog.get(dog.id) || []
    const isConsumed = dogCompleted.some(cs => {
      if (!cs.checkOut) return false
      const co = new Date(cs.checkOut)
      co.setHours(0, 0, 0, 0)
      return co >= period.start
    })
    if (isConsumed) continue

    const alreadyFromStay = scheduledStays.some((s) => {
      if (s.dogId !== dog.id) return false
      const stayStart = new Date(s.scheduledCheckIn!)
      stayStart.setHours(0, 0, 0, 0)
      const stayEnd = new Date(s.scheduledCheckOut!)
      stayEnd.setHours(23, 59, 59, 999)
      return targetDateObj >= stayStart && targetDateObj <= stayEnd
    })
    if (alreadyFromStay) continue

    await upsertRosterEntry(dog.id, date, 'HOTEL', 'AUTO', added)
  }
}

async function replicateFromPreviousWeek(date: string, targetDateObj: Date, added: string[]) {
  const previousDate = new Date(date + 'T12:00:00Z')
  previousDate.setDate(previousDate.getDate() - 7)
  const previousDateStr = previousDate.toISOString().split('T')[0]

  const previousEntries = await prisma.dailyRoster.findMany({
    where: { date: previousDateStr },
    include: { dog: true },
  })

  // Batch: fetch all existing roster entries for the target date (avoid N+1 findFirst)
  const existingEntries = await prisma.dailyRoster.findMany({
    where: { date },
    select: { dogId: true },
  })
  const existingDogIds = new Set(existingEntries.map(e => e.dogId))

  // Batch: fetch all relevant sales for dogs in the previous week's roster
  const dogIdsInPrev = previousEntries.map(e => e.dogId).filter(Boolean) as string[]
  const allSales = dogIdsInPrev.length > 0 ? await prisma.sales.findMany({
    where: {
      dogId: { in: dogIdsInPrev },
      paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
      manualBaixa: false,
    },
    include: { items: { include: { product: true } }, package: true },
  }) : []
  const salesByDog = new Map<string, typeof allSales>()
  for (const sale of allSales) {
    if (!sale.dogId) continue
    if (!salesByDog.has(sale.dogId)) salesByDog.set(sale.dogId, [])
    salesByDog.get(sale.dogId)!.push(sale)
  }

  // Batch: fetch active packages for dogs with PACOTE entries
  const pacoteDogIds = previousEntries
    .filter(e => e.type === 'PACOTE')
    .map(e => e.dogId)
    .filter(Boolean) as string[]
  const activePackagesByDog = new Map<string, any[]>()
  if (pacoteDogIds.length > 0) {
    const activePkgs = await prisma.package.findMany({
      where: {
        dogId: { in: pacoteDogIds },
        isActive: true,
        remainingDays: { gt: 0 },
        expiryDate: { gte: date },
      },
    })
    for (const pkg of activePkgs) {
      if (!activePackagesByDog.has(pkg.dogId)) activePackagesByDog.set(pkg.dogId, [])
      activePackagesByDog.get(pkg.dogId)!.push(pkg)
    }
  }

  // Batch: count roster usage per dog per type for AVULSO/PACOTE validation
  const avulsoPacoteDogIds = previousEntries
    .filter(e => e.type === 'AVULSO' || e.type === 'PACOTE')
    .map(e => e.dogId)
    .filter(Boolean) as string[]
  const rosterCountsByType = new Map<string, number>() // key: `${dogId}:${type}`
  if (avulsoPacoteDogIds.length > 0) {
    const counts = await prisma.dailyRoster.groupBy({
      by: ['dogId', 'type'],
      where: { dogId: { in: avulsoPacoteDogIds } },
      _count: { _all: true },
    })
    for (const c of counts) {
      if (c.dogId) rosterCountsByType.set(`${c.dogId}:${c.type}`, c._count._all)
    }
  }

  for (const entry of previousEntries) {
    if (!entry.dog || !entry.dog.isActive) continue

    // Skip if already in roster for target date (using batched set)
    if (entry.dogId && existingDogIds.has(entry.dogId)) continue

    const dog = entry.dog

    // HOTEL: never replicate from previous week — hotel is period-based (stay dates)
    if (entry.type === 'HOTEL') continue

    // BANHO: never replicate — bath is a one-time service
    if (entry.type === 'BANHO') continue

    if (entry.type === 'CRECHE') {
      if ((dog.serviceType || '').toUpperCase() !== 'CRECHE') continue
      // NÃO checar isDayScheduled aqui — a agenda ajustada pelo usuário é a fonte de verdade (regra #1)
      // Se o cão estava na semana anterior neste dia da semana, ele deve ser replicado

      // Validate there's still an active creche sale covering this date
      if (!dog.isBolsista) {
        const dogSales = salesByDog.get(entry.dogId!) || []
        const hasValidSale = dogSales.some(sale => {
          if (!isCrecheSale(sale)) return false
          const period = calcMensalPeriod(sale)
          if (!period) return false
          return targetDateObj >= period.start && targetDateObj <= period.end
        })

        if (!hasValidSale) continue
      }
    }

    // AVULSO/PACOTE: validate there's still an active sale with remaining days
    if (entry.type === 'AVULSO' || entry.type === 'PACOTE') {
      // For PACOTE: check if dog has an active package with remaining days
      if (entry.type === 'PACOTE') {
        const activePkgs = activePackagesByDog.get(entry.dogId!) || []
        if (activePkgs.length === 0) continue // No active package — don't replicate
      }

      const dogSales = (salesByDog.get(entry.dogId!) || []).filter(s => s.saleType === 'AVULSO' || s.saleType === 'PACOTE')

      let hasValidSale = false
      for (const sale of dogSales) {
        // Skip sales whose linked package is exhausted
        if (sale.package && (!sale.package.isActive || sale.package.remainingDays <= 0)) continue

        const period = sale.saleType === 'AVULSO' ? calcAvulsoPeriod(sale) : calcMensalPeriod(sale)
        if (!period) continue
        if (targetDateObj < period.start || targetDateObj > period.end) continue

        const purchasedDays = countPurchasedAvulsoDays(sale)
        if (purchasedDays === 0) { hasValidSale = true; break }

        // Use per-type batched count
        const used = rosterCountsByType.get(`${entry.dogId}:${entry.type}`) || 0
        if (used < purchasedDays) { hasValidSale = true; break }
      }

      // For PACOTE, also accept if there's an active package (even without a matching sale)
      if (!hasValidSale && entry.type === 'PACOTE') {
        const activePkgs = activePackagesByDog.get(entry.dogId!) || []
        if (activePkgs.length > 0) hasValidSale = true
      }

      if (!hasValidSale) continue
    }

    // Copy the entry — agenda is the source of truth (Rule #1)
    if (!entry.dogId) continue
    await upsertRosterEntry(entry.dogId, date, entry.type, 'AUTO', added)
  }
}

async function seedPacote(date: string, targetDateObj: Date, added: string[]) {
  const activePackages = await prisma.package.findMany({
    where: {
      isActive: true,
      remainingDays: { gt: 0 },
      expiryDate: { gte: date },
    },
    include: {
      dog: { select: { id: true, name: true, isActive: true, scheduledDays: true, serviceType: true } },
    },
  })

  if (activePackages.length === 0) return

  // Batch: fetch all existing roster entries for this date to avoid N+1
  const dogIds = activePackages.map(p => p.dogId)
  const existingEntries = await prisma.dailyRoster.findMany({
    where: { dogId: { in: dogIds }, date },
    select: { dogId: true },
  })
  const existingDogIds = new Set(existingEntries.map(e => e.dogId))

  for (const pkg of activePackages) {
    const dog = pkg.dog
    if (!dog || !dog.isActive) continue

    // Skip if dog already has a roster entry for this date (using batched set)
    if (existingDogIds.has(dog.id)) continue

    // If dog has scheduledDays, only seed on scheduled days
    if (dog.scheduledDays && dog.scheduledDays.trim() !== '') {
      if (!isDayScheduled(dog.scheduledDays, targetDateObj.getDay())) continue
    }

    await upsertRosterEntry(dog.id, date, 'PACOTE', 'AUTO', added)
  }
}

export async function seedDate(date: string): Promise<{ added: string[] }> {
  const added: string[] = []
  const targetDateObj = new Date(date + 'T12:00:00Z')

  // Rule #1: replicate from previous week's adjusted agenda first
  await replicateFromPreviousWeek(date, targetDateObj, added)

  // Fallback: seed from cadastro/vendas for dogs NOT in the previous week's roster
  await seedBolsistas(date, targetDateObj, added)
  await seedMensalCreche(date, targetDateObj, added)
  await seedPacote(date, targetDateObj, added)
  await seedHotel(date, targetDateObj, added)

  // Mark this date as seeded so it's never re-seeded after manual clears
  await prisma.dailyRosterSeed.upsert({
    where: { date },
    update: {},
    create: { date },
  })

  return { added }
}

export async function seedRange(startDate: string, endDate: string): Promise<{ dates: string[]; totalAdded: number }> {
  const dates: string[] = []
  let totalAdded = 0

  const start = new Date(startDate + 'T12:00:00')
  const end = new Date(endDate + 'T12:00:00')

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    dates.push(dateStr)
    const result = await seedDate(dateStr)
    totalAdded += result.added.length
  }

  return { dates, totalAdded }
}

export async function refreshDay(date: string): Promise<{ added: string[]; removed: number }> {
  const added: string[] = []

  // Remove only AUTO entries for this day (keep MANUAL entries)
  const removed = await prisma.dailyRoster.deleteMany({
    where: { date, source: 'AUTO' },
  })

  // Clear seed so seedDate runs fresh
  await prisma.dailyRosterSeed.deleteMany({ where: { date } })

  // Re-run seeding (replication from previous week + cadastro fallback)
  await seedDate(date)

  console.log(`[refreshDay ${date}] result: added=${added.length} removed=${removed.count}`)
  return { added, removed: removed.count }
}

export async function resetSeedTracking(date: string) {
  await prisma.dailyRosterSeed.deleteMany({ where: { date } })
}

export async function markSeeded(date: string) {
  await prisma.dailyRosterSeed.upsert({
    where: { date },
    update: {},
    create: { date },
  })
}
