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
  const bolsistaDogs = await prisma.dog.findMany({
    where: { isBolsista: true, isActive: true, serviceType: 'CRECHE' },
    select: { id: true, name: true, scheduledDays: true },
  })

  for (const dog of bolsistaDogs) {
    if (!dog.scheduledDays || dog.scheduledDays.trim() === '') continue
    if (!isDayScheduled(dog.scheduledDays, targetDateObj.getDay())) continue
    await upsertRosterEntry(dog.id, date, 'CRECHE', 'AUTO', added)
  }
}

async function seedMensalCreche(date: string, targetDateObj: Date, added: string[]) {
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

  for (const sale of mensalSales) {
    if (!sale.dogId || !sale.dog) continue
    if (!isCrecheSale(sale)) continue
    const dog = sale.dog
    if (!dog.isActive || dog.serviceType !== 'CRECHE') continue

    const period = calcMensalPeriod(sale)
    if (!period) continue

    if (targetDateObj < period.start || targetDateObj > period.end) continue
    if (!isDayScheduled(dog.scheduledDays, targetDateObj.getDay())) continue

    const cap = await calcMensalAllowed(sale, dog, date)
    if (cap.allowed !== Infinity && cap.used >= cap.allowed) continue

    await upsertRosterEntry(dog.id, date, 'CRECHE', 'AUTO', added)
  }
}

async function seedAvulso(date: string, targetDateObj: Date, added: string[]) {
  const avulsoSales = await prisma.sales.findMany({
    where: {
      saleType: 'AVULSO',
      paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
      manualBaixa: false,
      dogId: { not: null },
    },
    include: {
      dog: true,
      items: { include: { product: true } },
    },
  })

  for (const sale of avulsoSales) {
    if (!sale.dogId || !sale.dog) continue
    const dog = sale.dog
    if (!dog.isActive) continue

    const period = calcAvulsoPeriod(sale)
    if (!period) continue

    if (targetDateObj < period.start || targetDateObj > period.end) continue

    const purchasedDays = countPurchasedAvulsoDays(sale)
    if (purchasedDays === 0) {
      // Sale without explicit day items: allow one day within period
      const used = await prisma.dailyRoster.count({
        where: {
          dogId: dog.id,
          type: 'AVULSO',
          date: { gte: period.start.toISOString().split('T')[0], lte: period.end.toISOString().split('T')[0] },
        },
      })
      if (used === 0) await upsertRosterEntry(dog.id, date, 'AVULSO', 'AUTO', added)
      continue
    }

    const used = await prisma.dailyRoster.count({
      where: {
        dogId: dog.id,
        type: 'AVULSO',
        date: { gte: period.start.toISOString().split('T')[0], lte: period.end.toISOString().split('T')[0] },
      },
    })

    if (used < purchasedDays) {
      await upsertRosterEntry(dog.id, date, 'AVULSO', 'AUTO', added)
      break
    }
  }
}

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

  for (const stay of scheduledStays) {
    if (!stay.dog) continue
    const dog = stay.dog
    if (!dog.isActive) continue

    const start = new Date(stay.scheduledCheckIn!)
    start.setHours(0, 0, 0, 0)
    const end = new Date(stay.scheduledCheckOut!)
    end.setHours(23, 59, 59, 999)

    if (targetDateObj < start || targetDateObj > end) continue

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

  for (const sale of hotelSales) {
    if (!sale.dogId || !sale.dog) continue
    const dog = sale.dog
    if (!dog.isActive) continue

    const period = calcHotelPeriod(sale)
    if (!period) continue

    if (targetDateObj < period.start || targetDateObj > period.end) continue

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

export async function seedDate(date: string): Promise<{ added: string[] }> {
  const added: string[] = []
  const targetDateObj = new Date(date + 'T12:00:00Z')

  await seedBolsistas(date, targetDateObj, added)
  await seedMensalCreche(date, targetDateObj, added)
  await seedHotel(date, targetDateObj, added)
  // AVULSO e PACOTE não são auto-lançados na agenda.
  // Devem ser adicionados manualmente pelo usuário, com controle de créditos.

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

  // Re-run base seeding (bolsistas, creche, hotel)
  await seedDate(date)

  // Replicate previous week's entries that still have valid sales
  const previousDate = new Date(date + 'T12:00:00Z')
  previousDate.setDate(previousDate.getDate() - 7)
  const previousDateStr = previousDate.toISOString().split('T')[0]

  const targetDateObj = new Date(date + 'T12:00:00Z')

  // Fetch all entries from the same weekday in the previous week
  const previousEntries = await prisma.dailyRoster.findMany({
    where: { date: previousDateStr },
    include: { dog: true },
  })

  console.log(`[refreshDay ${date}] previousDate=${previousDateStr} entries=${previousEntries.length} removed=${removed.count}`)

  // Group by type to process each modality
  for (const entry of previousEntries) {
    if (!entry.dog || !entry.dog.isActive) {
      console.log(`[refreshDay ${date}] SKIP ${entry.dogId}: inactive/no dog`)
      continue
    }

    // Skip if already in roster for target date (seedDate may have added it)
    const existing = await prisma.dailyRoster.findFirst({
      where: { dogId: entry.dogId, date },
    })
    if (existing) {
      console.log(`[refreshDay ${date}] SKIP ${entry.dogId} ${entry.dog.name}: already exists on ${date}`)
      continue
    }

    const dog = entry.dog

    if (entry.type === 'CRECHE') {
      if (dog.serviceType !== 'CRECHE') {
        console.log(`[refreshDay ${date}] SKIP ${dog.name}: serviceType=${dog.serviceType} !== CRECHE`)
        continue
      }
      if (!isDayScheduled(dog.scheduledDays, targetDateObj.getDay())) {
        console.log(`[refreshDay ${date}] SKIP ${dog.name}: not scheduled for ${targetDateObj.getDay()} scheduledDays=${dog.scheduledDays}`)
        continue
      }

      const activeSales = await prisma.sales.findMany({
        where: {
          dogId: entry.dogId,
          OR: [
            { saleType: 'MENSAL' },
            { items: { some: { product: { category: 'CRECHE' } } } },
          ],
          paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
          manualBaixa: false,
        },
        include: { items: { include: { product: true } } },
      })

      console.log(`[refreshDay ${date}] CRECHE ${dog.name}: activeSales=${activeSales.length}`)

      let addedCreche = false
      for (const sale of activeSales) {
        if (!isCrecheSale(sale)) {
          console.log(`[refreshDay ${date}] CRECHE ${dog.name}: sale ${sale.id} not creche sale`)
          continue
        }
        const period = calcMensalPeriod(sale)
        if (!period) {
          console.log(`[refreshDay ${date}] CRECHE ${dog.name}: sale ${sale.id} no period`)
          continue
        }
        if (targetDateObj < period.start || targetDateObj > period.end) {
          console.log(`[refreshDay ${date}] CRECHE ${dog.name}: sale ${sale.id} target ${date} outside ${period.start.toISOString()} - ${period.end.toISOString()}`)
          continue
        }

        const cap = await calcMensalAllowed(sale, dog, date)
        console.log(`[refreshDay ${date}] CRECHE ${dog.name}: sale ${sale.id} cap used=${cap.used} allowed=${cap.allowed}`)
        if (cap.allowed !== Infinity && cap.used >= cap.allowed) {
          console.log(`[refreshDay ${date}] CRECHE ${dog.name}: cap reached`)
          continue
        }

        await upsertRosterEntry(entry.dogId, date, 'CRECHE', 'AUTO', added)
        addedCreche = true
        console.log(`[refreshDay ${date}] ADD CRECHE ${dog.name}`)
        break
      }
      if (!addedCreche) {
        console.log(`[refreshDay ${date}] CRECHE ${dog.name}: no valid sale found`)
      }
    } else if (entry.type === 'HOTEL') {
      // Check for valid hotel sale or scheduled stay
      const activeSales = await prisma.sales.findMany({
        where: {
          dogId: entry.dogId,
          saleType: 'HOTEL',
          paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
          manualBaixa: false,
        },
        include: { items: { include: { product: true } } },
      })

      let hasValidHotel = false
      for (const sale of activeSales) {
        const period = calcHotelPeriod(sale)
        if (!period) continue
        if (targetDateObj >= period.start && targetDateObj <= period.end) {
          hasValidHotel = true
          break
        }
      }

      // Also check scheduled stays
      if (!hasValidHotel) {
        const stays = await prisma.stay.findMany({
          where: {
            dogId: entry.dogId,
            isScheduled: true,
            scheduledCheckIn: { not: null },
            scheduledCheckOut: { not: null },
          },
        })
        for (const stay of stays) {
          const start = new Date(stay.scheduledCheckIn!)
          start.setHours(0, 0, 0, 0)
          const end = new Date(stay.scheduledCheckOut!)
          end.setHours(23, 59, 59, 999)
          if (targetDateObj >= start && targetDateObj <= end) {
            hasValidHotel = true
            break
          }
        }
      }

      if (hasValidHotel) {
        await upsertRosterEntry(entry.dogId, date, 'HOTEL', 'AUTO', added)
        console.log(`[refreshDay ${date}] ADD HOTEL ${dog.name}`)
      } else {
        console.log(`[refreshDay ${date}] SKIP HOTEL ${dog.name}: no valid hotel/stay`)
      }
    } else if (entry.type === 'AVULSO' || entry.type === 'PACOTE') {
      // Check for valid avulso/pacote sale with remaining days
      const activeSales = await prisma.sales.findMany({
        where: {
          dogId: entry.dogId,
          saleType: { in: ['AVULSO', 'PACOTE'] },
          paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
          manualBaixa: false,
        },
        include: { items: { include: { product: true } } },
      })

      let addedAvulso = false
      for (const sale of activeSales) {
        const period = sale.saleType === 'AVULSO' ? calcAvulsoPeriod(sale) : calcMensalPeriod(sale)
        if (!period) continue
        if (targetDateObj < period.start || targetDateObj > period.end) continue

        const purchasedDays = countPurchasedAvulsoDays(sale)
        if (purchasedDays === 0) continue

        const used = await prisma.dailyRoster.count({
          where: {
            dogId: entry.dogId,
            type: entry.type,
            date: { gte: period.start.toISOString().split('T')[0], lte: period.end.toISOString().split('T')[0] },
          },
        })

        if (used < purchasedDays) {
          await upsertRosterEntry(entry.dogId, date, entry.type, 'AUTO', added)
          addedAvulso = true
          console.log(`[refreshDay ${date}] ADD ${entry.type} ${dog.name}`)
          break
        }
      }
      if (!addedAvulso) {
        console.log(`[refreshDay ${date}] SKIP ${entry.type} ${dog.name}: no valid sale`)
      }
    }
  }

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
