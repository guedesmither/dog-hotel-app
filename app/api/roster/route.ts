import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

// Extract frequency number from product name: "Mensal 2x" → 2
function getFrequencyFromProduct(sale: any): number {
  for (const item of (sale.items || [])) {
    const name: string = item.product?.name || ''
    const m = name.match(/(\d+)\s*x/i)
    if (m) return parseInt(m[1])
  }
  return 0
}

// Calculate the cap of allowed days for a MENSAL sale in its validity period
async function calcAllowedDays(sale: any, scheduledDays: string | null, prismaClient: any, dogId: string): Promise<{ allowed: number; used: number; periodStart: string; periodEnd: string }> {
  const saleStart = parseSaleDate(sale.startDate) || parseSaleDate(sale.saleDate)
  if (!saleStart) return { allowed: Infinity, used: 0, periodStart: '', periodEnd: '' }
  saleStart.setHours(0, 0, 0, 0)
  let saleEnd = parseSaleDate(sale.endDate)
  if (!saleEnd) {
    saleEnd = new Date(saleStart)
    const dm = daysInMonth(saleStart.getFullYear(), saleStart.getMonth())
    saleEnd.setDate(saleEnd.getDate() + dm - 1)
  }
  saleEnd.setHours(23, 59, 59, 999)

  const periodStart = saleStart.toISOString().split('T')[0]
  const periodEnd = saleEnd.toISOString().split('T')[0]

  let allowed: number
  if (scheduledDays && scheduledDays.trim() !== '') {
    allowed = countScheduledOccurrences(scheduledDays, saleStart, saleEnd)
  } else {
    const freq = getFrequencyFromProduct(sale)
    if (freq > 0) {
      const weeks = Math.ceil((saleEnd.getTime() - saleStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
      allowed = freq * weeks
    } else {
      allowed = Infinity
    }
  }

  const used = await prismaClient.dailyRoster.count({
    where: { dogId, type: 'CRECHE', date: { gte: periodStart, lte: periodEnd } }
  })

  return { allowed, used, periodStart, periodEnd }
}

const countScheduledOccurrences = (scheduledDays: string, start: Date, end: Date): number => {
  const scheduledLower = scheduledDays.toLowerCase()
  let count = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endNorm = new Date(end)
  endNorm.setHours(23, 59, 59, 999)
  while (cur <= endNorm) {
    const aliases = DAY_NAME_MAP[cur.getDay()] || []
    if (aliases.some((a: string) => scheduledLower.includes(a))) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function parseBrazilianDate(dateStr: string): Date | null {
  try {
    const parts = dateStr.split('/')
    if (parts.length !== 3) return null
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    return new Date(year, month, day)
  } catch {
    return null
  }
}

// Parse sale date - handles both ISO DateTime and DD/MM/YYYY formats
function parseSaleDate(dateValue: any): Date | null {
  if (!dateValue) return null
  if (typeof dateValue === 'string') {
    // Check if it's DD/MM/YYYY format
    if (dateValue.includes('/')) {
      return parseBrazilianDate(dateValue)
    }
    // ISO format
    return new Date(dateValue)
  }
  if (dateValue instanceof Date) return dateValue
  return null
}

// Returns number of days in a given month (year, month 0-indexed)
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// Check if target date is within sale validity period
function isDateInSaleRange(sale: any, targetDate: Date): boolean {
  const saleDate = parseSaleDate(sale.saleDate)
  const startDate = parseSaleDate(sale.startDate) || saleDate
  const endDate = parseSaleDate(sale.endDate)

  if (!startDate) return false

  // Calculate effective end date
  let effectiveEndDate: Date
  if (endDate) {
    effectiveEndDate = endDate
  } else {
    effectiveEndDate = new Date(startDate)
    if (sale.saleType === 'PACOTE') {
      effectiveEndDate.setMonth(effectiveEndDate.getMonth() + 6)
    } else if (sale.saleType === 'HOTEL') {
      effectiveEndDate.setDate(effectiveEndDate.getDate() + 30)
    } else if (sale.saleType === 'AVULSO') {
      effectiveEndDate.setDate(effectiveEndDate.getDate() + 30) // AVULSO sem endDate = 30 dias para usar os créditos
    } else {
      // MENSAL: vigência = dias reais do mês de início (ex: começa 06/05 → +31 dias = 05/06)
      const daysThisMonth = daysInMonth(startDate.getFullYear(), startDate.getMonth())
      effectiveEndDate.setDate(effectiveEndDate.getDate() + daysThisMonth - 1)
    }
  }

  effectiveEndDate.setHours(23, 59, 59, 999)
  targetDate.setHours(0, 0, 0, 0)
  startDate.setHours(0, 0, 0, 0)

  return targetDate >= startDate && targetDate <= effectiveEndDate
}

function getDayName(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return DAYS_PT[d.getDay()]
}

async function seedDate(date: string) {
  const dayName = getDayName(date)
  const targetDateObj = new Date(date + 'T12:00:00Z')

  // 1. Add bolsista dogs — no MENSAL sale required
  // scheduledDays set → seeds on those days only
  // scheduledDays empty → manual only (not auto-seeded)
  // Only CRECHE service type
  const bolsistaDogs = await (prisma.dog as any).findMany({
    where: { isBolsista: true, isActive: true, serviceType: 'CRECHE' },
    select: { id: true, name: true, serviceType: true, scheduledDays: true },
  })
  for (const d of bolsistaDogs) {
    const hasSchedule = d.scheduledDays && d.scheduledDays.trim() !== ''
    if (!hasSchedule) continue // sem dias cadastrados = não semeia automaticamente
    if (!d.scheduledDays.includes(dayName)) continue
    await prisma.dailyRoster.upsert({
      where: { dogId_date: { dogId: d.id, date } },
      update: {},
      create: { dogId: d.id, date, source: 'AUTO', type: 'CRECHE' },
    })
  }

  // 2. Find dogIds with an active MENSAL sale whose period covers this date
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
    // Only add dogs that (1) have an active MENSAL sale covering this date
    // AND (2) are scheduled to attend on this day of the week
    // AND (3) are CRECHE service type (not HOTEL or other)
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
    }
  }

  // 3. Add dogs with active packages (PACOTE) that have remaining days
  // Only CRECHE service type to avoid mixing with hotel dogs
  const dogsWithPackages = await prisma.dog.findMany({
    where: { isActive: true, serviceType: 'CRECHE' },
    include: {
      packages: {
        where: {
          isActive: true,
          remainingDays: { gt: 0 },
          expiryDate: { gte: targetDateObj }
        },
        take: 1
      }
    }
  })

  for (const d of dogsWithPackages) {
    if (d.packages.length > 0) {
      // Check if already in roster for this date
      const exists = await prisma.dailyRoster.findFirst({
        where: { dogId: d.id, date }
      })
      if (!exists) {
        await prisma.dailyRoster.upsert({
          where: { dogId_date: { dogId: d.id, date } },
          update: {},
          create: { dogId: d.id, date, source: 'AUTO', type: 'PACOTE', packageId: d.packages[0].id },
        })
      }
    }
  }

  // Mark this date as seeded so it's never re-seeded even if all entries are deleted
  await prisma.dailyRosterSeed.upsert({
    where: { date },
    update: {},
    create: { date },
  })
}

// GET /api/roster?date=YYYY-MM-DD        → single day (auto-seeded)
// GET /api/roster?weekStart=YYYY-MM-DD   → 7 days starting that Monday
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const weekStart = searchParams.get('weekStart')

  const dogSelect = {
    id: true,
    name: true,
    breed: true,
    ownerName: true,
    photoUrl: true,
    serviceType: true,
    scheduledDays: true,
    monthlyStartDay: true,
    dogStatus: true,
    isBolsista: true, // Bolsista flag for UI
  }

  if (weekStart) {
    const dates: string[] = []
    const start = new Date(weekStart + 'T12:00:00')
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }

    // Seed each day if not yet seeded (use DailyRosterSeed to avoid re-seeding after manual clears)
    for (const d of dates) {
      const seeded = await prisma.dailyRosterSeed.findUnique({ where: { date: d } })
      if (!seeded) await seedDate(d)
    }

    const entries = await prisma.dailyRoster.findMany({
      where: { date: { in: dates } },
      select: { id: true, dogId: true, date: true, source: true, type: true, present: true, isPernoite: true, hasBanho: true, packageId: true, dog: { select: dogSelect } } as any,
      orderBy: [{ date: 'asc' }, { dog: { name: 'asc' } }],
    })

    // Also return all active dogs for the pool
    const allDogs = await prisma.dog.findMany({
      where: { isActive: true },
      select: dogSelect,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ entries, allDogs, dates })
  }

  if (date) {
    const seeded = await prisma.dailyRosterSeed.findUnique({ where: { date } })
    if (!seeded) await seedDate(date)

    const entries = await prisma.dailyRoster.findMany({
      where: { date },
      select: { id: true, dogId: true, date: true, source: true, type: true, present: true, isPernoite: true, hasBanho: true, packageId: true, dog: { select: dogSelect } } as any,
      orderBy: { dog: { name: 'asc' } },
    })

    return NextResponse.json(entries)
  }

  return NextResponse.json({ error: 'Parâmetro date ou weekStart obrigatório' }, { status: 400 })
}

// POST /api/roster  { dogId, date, type?, isPernoite?, packageId? }
export async function POST(req: NextRequest) {
  console.log('[DEBUG] POST /api/roster called')
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'TUTOR' || role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  const { dogId, date, type, isPernoite, packageId, hasBanho } = body
  const entryType = type || 'CRECHE'

  // Toggle-only update (hasBanho or isPernoite without adding to roster)
  if (hasBanho !== undefined && !type && !packageId) {
    // Use upsert to create entry if it doesn't exist
    await prisma.dailyRoster.upsert({
      where: { dogId_date: { dogId, date } },
      update: { hasBanho },
      create: { dogId, date, hasBanho, source: 'MANUAL', type: 'CRECHE' },
    })
    return NextResponse.json({ success: true })
  }

  // Validate package if provided (always enforced regardless of role)
  if (packageId) {
    // Validate package exists and has remaining days
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: { dog: true },
    })

    if (!pkg) {
      return NextResponse.json({ 
        error: 'Pacote não encontrado',
        details: 'O pacote especificado não existe'
      }, { status: 404 })
    }

    if (!pkg.isActive || pkg.remainingDays <= 0) {
      return NextResponse.json({ 
        error: 'Pacote inválido',
        details: 'Este pacote não está ativo ou não tem dias restantes'
      }, { status: 403 })
    }

    if (pkg.dogId !== dogId) {
      return NextResponse.json({ 
        error: 'Pacote não pertence a este cão',
        details: 'Este pacote não está associado ao cão especificado'
      }, { status: 403 })
    }

    // Check how many times the dog has been scheduled this week using this package
    const weekStart = new Date(date)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setUTCHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setUTCHours(23, 59, 59, 999)

    const packageUsage = await prisma.dailyRoster.count({
      where: {
        dogId,
        packageId,
        date: {
          gte: weekStart.toISOString(),
          lte: weekEnd.toISOString(),
        },
      },
    })

    if (packageUsage >= pkg.remainingDays) {
      return NextResponse.json({ 
        error: 'Pacote esgotado',
        details: `Este pacote tem apenas ${pkg.remainingDays} dias restantes e já foi usado ${packageUsage} vezes esta semana`
      }, { status: 403 })
    }
  } else {
    // Eligibility check — varies by role:
    // ADMIN/MANAGER: light check (active sale of correct type must exist, no date restrictions)
    // FUNCIONARIO: full check (date ranges, scheduled days, makeup credits)
    const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER'
    const [year, month, day] = date.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day)
    targetDate.setHours(0, 0, 0, 0)
    const dayName = getDayName(date)

    const dog = await prisma.dog.findUnique({
      where: { id: dogId },
      select: {
        id: true,
        name: true,
        dogStatus: true,
        isBolsista: true,
        serviceType: true,
        scheduledDays: true,
        isActive: true,
        packages: true,
        sales: {
          where: {
            paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
            manualBaixa: false,
          },
          orderBy: { saleDate: 'desc' },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    }) as any

    if (!dog) {
      return NextResponse.json({ error: 'Cão não encontrado' }, { status: 404 })
    }

    // ── BOLSISTA: always eligible, skip all checks ──────────────────────────
    console.log(`[DEBUG] Dog ${dogId} status: "${dog.dogStatus}", isBolsista: ${dog.isBolsista}`)
    if (dog.dogStatus === 'BOLSISTA' || dog.isBolsista === true) {
      // Fall through directly to upsert below
      console.log(`[DEBUG] Dog ${dogId} is BOLSISTA - skipping eligibility checks`)
    } else {

    let eligible = false
    let reason = ''

    // ── ADMIN / MANAGER: check sale validity + scheduledDays ──────────────
    if (isAdminOrManager) {
      if (entryType === 'CRECHE') {
        // Must have a valid MENSAL sale covering the target date
        const mensalSales = dog.sales.filter((s: any) =>
          s.saleType === 'MENSAL' ||
          s.items.some((i: any) => i.product?.category === 'CRECHE' || i.product?.name.toLowerCase().includes('mensal'))
        )

        if (mensalSales.length === 0) {
          eligible = false
          reason = 'Não há mensalidade de creche para este cão'
        } else {
          const validSale = mensalSales.find((s: any) => isDateInSaleRange(s, targetDate))
          if (!validSale) {
            eligible = false
            reason = 'Data fora da vigência de todas as mensalidades deste cão'
          } else {
            // Check monthly cap: days purchased vs days already in roster for this period
            const cap = await calcAllowedDays(validSale, dog.scheduledDays, prisma, dog.id)
            if (cap.allowed !== Infinity && cap.used >= cap.allowed) {
              eligible = false
              reason = `Limite mensal atingido: ${cap.used}/${cap.allowed} dias já agendados no período (${cap.periodStart} a ${cap.periodEnd})`
            } else {
              eligible = true
              reason = cap.allowed !== Infinity
                ? `Admin: ${cap.allowed - cap.used} dia(s) disponível(is) no período`
                : 'Admin: cão de creche com venda válida'
            }
          }
        }
      } else if (entryType === 'HOTEL') {
        // Check for HOTEL sale that covers the target date
        const hasValidSale = dog.sales.some((s: any) => {
          const isHotel = s.saleType === 'HOTEL' ||
            s.items.some((i: any) => i.product?.category === 'HOTEL' || i.product?.name.toLowerCase().includes('hotel'))
          if (!isHotel) return false
          const startD = parseSaleDate(s.startDate) || parseSaleDate(s.saleDate)
          if (!startD) return false
          startD.setHours(0, 0, 0, 0)
          let endD = parseSaleDate(s.endDate)
          if (!endD) {
            endD = new Date(startD)
            endD.setDate(endD.getDate() + 30)
          }
          endD.setHours(23, 59, 59, 999)
          return targetDate >= startD && targetDate <= endD
        })
        eligible = hasValidSale
        reason = eligible ? 'Admin: venda de hotel encontrada' : 'Não há venda de hotel válida para esta data'
      } else if (entryType === 'AVULSO') {
        // X dias comprados → máximo X entradas na agenda dentro do período da venda
        const candidateSales = dog.sales.filter((s: any) => {
          const isAvulso = s.saleType === 'AVULSO' || s.saleType === 'PACOTE' ||
            s.items.some((i: any) => i.product?.category === 'AVULSO' || i.product?.category === 'PACOTE')
          if (!isAvulso) return false
          return isDateInSaleRange(s, targetDate)
        })
        eligible = false
        reason = 'Não há venda avulsa ou pacote válida para esta data'
        for (const sale of candidateSales) {
          const purchasedDays = sale.items
            .filter((i: any) => i.product?.category === 'AVULSO' || (i.product?.name && /dia|diária|diaria/i.test(i.product.name)))
            .reduce((sum: number, i: any) => sum + (i.quantity || 1), 0)
          if (purchasedDays === 0) { eligible = true; reason = 'Admin: venda avulso sem itens de dia'; break }
          const saleStart = parseSaleDate(sale.startDate) || parseSaleDate(sale.saleDate)
          if (!saleStart) continue
          const saleEnd = parseSaleDate(sale.endDate) || (() => { const d = new Date(saleStart); d.setDate(d.getDate() + 30); return d })()
          const usedDays = await prisma.dailyRoster.count({
            where: { dogId: dog.id, type: 'AVULSO', date: { gte: saleStart.toISOString().split('T')[0], lte: saleEnd.toISOString().split('T')[0] } }
          })
          if (usedDays < purchasedDays) {
            eligible = true
            reason = `Admin: ${purchasedDays - usedDays} dia(s) disponível(is) nesta venda`
            break
          } else {
            reason = `Dias esgotados: ${usedDays}/${purchasedDays} dia(s) já agendado(s) para esta venda`
          }
        }
      } else if (entryType === 'PACOTE') {
        // Check for PACOTE sale that covers the target date
        const hasValidPacote = dog.sales.some((s: any) => {
          if (s.saleType !== 'PACOTE') return false
          return isDateInSaleRange(s, targetDate)
        })
        const hasValidPackage = dog.packages.some((p: any) =>
          p.isActive &&
          p.remainingDays > 0 &&
          new Date(p.expiryDate) >= targetDate
        )
        eligible = hasValidPacote || hasValidPackage
        reason = eligible ? 'Admin: venda de pacote encontrada' : 'Não há pacote de diárias válido para esta data'
      }

      // Note: Admin also requires valid sale - no free scheduling
      // Future: Isenção de pagamento should be a sale type like 'ISENTO'

      if (!eligible) {
        return NextResponse.json({
          error: 'Sem venda válida para este cão',
          reason,
          dogName: dog.name,
        }, { status: 403 })
      }

    } else {
    // ── FUNCIONARIO: full eligibility check ────────────────────────────────

    // Check eligibility based on type — PACOTE sales also qualify for AVULSO slots
    if (entryType === 'CRECHE') {
      const monthlySales = dog.sales.filter((s: any) => 
        s.saleType === 'MENSAL' || 
        (s.items.some((i: any) => i.product?.category === 'CRECHE' || i.product?.name.includes('MENSAL')))
      )

      console.log(`[DEBUG] CRECHE check: found ${monthlySales.length} monthly sales`)
      for (const sale of monthlySales) {
        // Parse dates using helper that handles DD/MM/YYYY format
        console.log(`[DEBUG] Sale ${sale.id}: startDate=${sale.startDate}, saleDate=${sale.saleDate}, endDate=${sale.endDate}`)
        const saleDate = parseSaleDate(sale.startDate) || parseSaleDate(sale.saleDate)
        console.log(`[DEBUG] Parsed saleDate: ${saleDate}`)
        if (!saleDate) {
          console.log(`[DEBUG] Skipping sale ${sale.id}: no valid saleDate`)
          continue
        }
        saleDate.setHours(0, 0, 0, 0)

        let expiryDate = parseSaleDate(sale.endDate)
        if (!expiryDate) {
          // Vigência = dias reais do mês de início (ex: começa 06/05 → +31 dias = 05/06)
          expiryDate = new Date(saleDate)
          const daysThisMonth = daysInMonth(saleDate.getFullYear(), saleDate.getMonth())
          expiryDate.setDate(expiryDate.getDate() + daysThisMonth - 1)
        }
        expiryDate.setHours(23, 59, 59, 999)
        console.log(`[DEBUG] Sale ${sale.id}: saleDate=${saleDate.toISOString()}, expiryDate=${expiryDate.toISOString()}, targetDate=${targetDate.toISOString()}`)

        if (targetDate < saleDate || targetDate > expiryDate) {
          console.log(`[DEBUG] Sale ${sale.id}: targetDate outside range`)
          continue
        }

        if (!dog.scheduledDays) {
          // No scheduled days restriction
          eligible = true
          reason = 'Mensalidade ativa'
          break
        }

        const scheduledLower = dog.scheduledDays.toLowerCase()
        const targetDayOfWeek = targetDate.getDay()
        const dayAliases = DAY_NAME_MAP[targetDayOfWeek] || []
        const isScheduledDay = dayAliases.some((alias: string) => scheduledLower.includes(alias))

        // Allow scheduling on ANY day within the subscription period
        // as long as monthly quota (totalScheduled) is not exceeded
        // Scheduled days are for organization only, not strict restriction
        const totalScheduled = countScheduledOccurrences(dog.scheduledDays, saleDate, expiryDate)

        // Days already used (in roster) within the subscription period
        const saleDateStr = saleDate.toISOString().split('T')[0]
        const expiryDateStr = expiryDate.toISOString().split('T')[0]
        const usedDays = await prisma.dailyRoster.count({
          where: {
            dogId,
            type: 'CRECHE',
            date: { gte: saleDateStr, lte: expiryDateStr },
          },
        })

        if (usedDays < totalScheduled) {
          eligible = true
          if (isScheduledDay) {
            reason = `Mensalidade ativa (${totalScheduled - usedDays} dias restantes este mês)`
          } else {
            reason = `Reposição disponível — ${totalScheduled - usedDays} dia(s) restante(s) na mensalidade`
          }
        } else {
          reason = `Limite mensal atingido — ${usedDays}/${totalScheduled} dias utilizados`
        }
        break
      }
    } else if (entryType === 'AVULSO') {
      // An avulso or pacote sale can be scheduled on any date within its valid window.
      const avulsoSales = dog.sales.filter((s: any) => 
        s.saleType === 'AVULSO' || 
        s.saleType === 'PACOTE' ||
        (s.items.some((i: any) => i.product?.category === 'AVULSO' || i.product?.category === 'PACOTE' || i.product?.name.includes('Diária')))
      )
      console.log(`[DEBUG AVULSO] found ${avulsoSales.length} avulso/pacote sales for dog ${dogId}`)

      for (const sale of avulsoSales) {
        console.log(`[DEBUG AVULSO] checking sale ${sale.id}, type=${sale.saleType}, startDate=${sale.startDate}, saleDate=${sale.saleDate}, endDate=${sale.endDate}`)
        const saleDate = parseSaleDate(sale.startDate) || parseSaleDate(sale.saleDate)
        if (!saleDate) {
          console.log(`[DEBUG AVULSO] skipping sale ${sale.id}: no valid saleDate`)
          continue
        }
        saleDate.setHours(0, 0, 0, 0)

        let expiryDate = parseSaleDate(sale.endDate)
        if (!expiryDate) {
          expiryDate = new Date(saleDate)
          expiryDate.setDate(expiryDate.getDate() + 90)
        }
        expiryDate.setHours(23, 59, 59, 999)
        console.log(`[DEBUG AVULSO] sale ${sale.id}: saleDate=${saleDate.toISOString()}, expiryDate=${expiryDate.toISOString()}, targetDate=${targetDate.toISOString()}`)

        if (targetDate < saleDate || targetDate > expiryDate) {
          console.log(`[DEBUG AVULSO] sale ${sale.id}: targetDate outside range`)
          continue
        }

        // Count purchased days vs days already in roster (scheduled or attended)
        const saleDateStr = saleDate.toISOString().split('T')[0]
        const expiryDateStr = expiryDate.toISOString().split('T')[0]
        const purchasedDays = sale.items
          .filter((i: any) => i.product?.category === 'AVULSO' || (i.product?.name && /dia|diária|diaria/i.test(i.product.name)))
          .reduce((sum: number, i: any) => sum + (i.quantity || 1), 0)
        if (purchasedDays === 0) { eligible = true; reason = 'Diária avulsa disponível'; break }
        const usedDays = await prisma.dailyRoster.count({
          where: { dogId, type: 'AVULSO', date: { gte: saleDateStr, lte: expiryDateStr } },
        })
        console.log(`[DEBUG AVULSO] purchasedDays=${purchasedDays} usedDays=${usedDays}`)
        if (usedDays < purchasedDays) {
          eligible = true
          reason = `Diária avulsa disponível: ${purchasedDays - usedDays} dia(s) restante(s)`
          break
        } else {
          reason = `Dias esgotados: ${usedDays}/${purchasedDays} dia(s) já agendado(s)`
        }
      }
    } else if (entryType === 'HOTEL') {
      // Prefer sales that have explicit startDate/endDate set at sale time.
      // Fall back to window calculation for older sales without dates.
      const activeSales: any[] = []
      for (const s of dog.sales) {
        const isHotel = s.saleType === 'HOTEL' ||
          s.items.some((i: any) => i.product?.category === 'HOTEL' || i.product?.name.includes('Hotel'))
        if (!isHotel) continue

        let windowStart: Date | null = null
        let windowEnd: Date | null = null
        let saleTotalDays = 0

        if (s.startDate || s.endDate) {
          // Use explicit dates from sale to define the window
          windowStart = parseSaleDate(s.startDate) || parseSaleDate(s.saleDate)
          if (!windowStart) continue
          windowStart.setHours(0, 0, 0, 0)
          windowEnd = parseSaleDate(s.endDate)
          if (!windowEnd) {
            // Default 30 days if no end date
            windowEnd = new Date(windowStart)
            windowEnd.setDate(windowEnd.getDate() + 30)
          }
          windowEnd.setHours(23, 59, 59, 999)
          // Calculate purchased days from product items (NOT from date range)
          for (const item of s.items) {
            const productName = item.product?.name || ''
            const daysMatch = productName.match(/(\d+)\s*Di[aá]s?/i)
            if (daysMatch) {
              saleTotalDays += parseInt(daysMatch[1], 10) * (item.quantity || 1)
            } else {
              saleTotalDays += item.quantity || 1
            }
          }
        } else {
          // Legacy: compute window from product name + grace period
          for (const item of s.items) {
            const productName = item.product?.name || ''
            const daysMatch = productName.match(/(\d+)\s*Di[aá]s?/i)
            if (daysMatch) {
              saleTotalDays += parseInt(daysMatch[1], 10) * (item.quantity || 1)
            } else {
              saleTotalDays += item.quantity || 1
            }
          }
          const saleDate = parseSaleDate(s.saleDate)
          if (!saleDate) continue
          windowStart = new Date(saleDate)
          windowStart.setDate(windowStart.getDate() - 30)
          windowEnd = new Date(saleDate)
          windowEnd.setDate(windowEnd.getDate() + saleTotalDays + 14)
        }

        if (targetDate >= windowStart && targetDate <= windowEnd) {
          activeSales.push({ sale: s, totalDays: saleTotalDays, windowStart, windowEnd })
        }
      }

      if (activeSales.length > 0) {
        const totalNightsPurchased = activeSales.reduce((sum, e) => sum + e.totalDays, 0)
        const earliestWindowStart = activeSales.reduce(
          (min, e) => e.windowStart < min ? e.windowStart : min,
          activeSales[0].windowStart
        )
        const latestWindowEnd = activeSales.reduce(
          (max, e) => e.windowEnd > max ? e.windowEnd : max,
          activeSales[0].windowEnd
        )

        // Count nights from Stay records (checkIn to checkOut)
        const stays = await prisma.stay.findMany({
          where: {
            dogId,
            checkIn: { gte: earliestWindowStart, lte: latestWindowEnd },
          },
          select: { checkIn: true, checkOut: true },
        })

        let usedNights = 0
        for (const stay of stays) {
          if (stay.checkOut) {
            const nights = Math.round((stay.checkOut.getTime() - stay.checkIn.getTime()) / (1000 * 60 * 60 * 24))
            usedNights += Math.max(0, nights)
          } else {
            // Still checked in - count nights up to today
            const today = new Date()
            today.setHours(0,0,0,0)
            const checkIn = new Date(stay.checkIn)
            checkIn.setHours(0,0,0,0)
            const nights = Math.round((today.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
            usedNights += Math.max(0, nights)
          }
        }

        if (usedNights < totalNightsPurchased) {
          eligible = true
          reason = `Venda de hotel disponível (${totalNightsPurchased - usedNights} diárias restantes)`
        } else {
          reason = `Todas as diárias de hotel já foram utilizadas (${usedNights}/${totalNightsPurchased})`
        }
      } else {
        reason = 'Não há venda de hotel válida para este período'
      }
    }

    // PACOTE entryType: check sale date window
    if (!eligible && entryType === 'PACOTE') {
      const pacoteSales = dog.sales.filter((s: any) => s.saleType === 'PACOTE')
      for (const sale of pacoteSales) {
        const startD = sale.startDate ? new Date(sale.startDate) : new Date(sale.saleDate)
        startD.setHours(0, 0, 0, 0)
        const endD = sale.endDate
          ? new Date(sale.endDate)
          : (() => { const d = new Date(startD); d.setMonth(d.getMonth() + 6); return d })()
        endD.setHours(23, 59, 59, 999)
        if (targetDate >= startD && targetDate <= endD) {
          eligible = true
          reason = 'Pacote de diárias ativo'
          break
        }
      }
    }

    // Check for active packages (allow any type with package)
    if (!eligible) {
      const activePackages = dog.packages.filter((p: any) => 
        p.isActive && 
        p.remainingDays > 0 && 
        new Date(p.expiryDate) >= targetDate
      )

      if (activePackages.length > 0) {
        eligible = true
        reason = 'Pacote ativo com dias restantes'
      }
    }

    if (!eligible) {
      return NextResponse.json({ 
        error: 'Cão não elegível para agendamento',
        reason: reason || 'Não há venda válida para este serviço nesta data',
        dogName: dog.name
      }, { status: 403 })
    }
    } // end else (FUNCIONARIO full check)
    } // end else (not BOLSISTA)
  }

  const updateData: any = { source: 'MANUAL', type: entryType }
  if (isPernoite !== undefined) updateData.isPernoite = isPernoite
  if (hasBanho !== undefined) updateData.hasBanho = hasBanho
  if (packageId) {
    updateData.packageId = packageId
    // Decrement package remaining days
    await prisma.package.update({
      where: { id: packageId },
      data: { remainingDays: { decrement: 1 } },
    })
  }

  const entry = await prisma.dailyRoster.upsert({
    where: { dogId_date: { dogId, date } },
    update: updateData,
    create: { dogId, date, source: 'MANUAL', type: entryType, isPernoite: isPernoite || false, packageId },
    select: { id: true, dogId: true, date: true, source: true, type: true, present: true, isPernoite: true, hasBanho: true, packageId: true, dog: { select: { id: true, name: true, breed: true, ownerName: true, photoUrl: true, serviceType: true, scheduledDays: true, monthlyStartDay: true } } } as any,
  })

  return NextResponse.json(entry, { status: 201 })
}

// DELETE /api/roster?dogId=xxx&date=YYYY-MM-DD
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'MONITOR' || role === 'TUTOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const dogId = searchParams.get('dogId')
  const date = searchParams.get('date')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const reset = searchParams.get('reset')

  if (reset === 'future') {
    // Kept for backwards compat but should not be used in UI anymore
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Apenas ADMIN pode resetar o futuro inteiro' }, { status: 403 })
    const today = new Date().toISOString().split('T')[0]
    await prisma.dailyRoster.deleteMany({ where: { date: { gt: today } } })
    await prisma.dailyRosterSeed.deleteMany({ where: { date: { gt: today } } })
    return NextResponse.json({ success: true, message: 'Roster futuro limpo' })
  }

  if (reset === 'day' && date) {
    if (role !== 'ADMIN' && role !== 'MANAGER') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    // Delete only AUTO entries for this day (keep MANUAL ones)
    await prisma.dailyRoster.deleteMany({ where: { date, source: 'AUTO' } })
    // Clear seed so the day gets re-seeded on next load
    await prisma.dailyRosterSeed.deleteMany({ where: { date } })
    // Re-seed immediately
    await seedDate(date)
    return NextResponse.json({ success: true, message: `Dia ${date} re-semeado` })
  }

  if (dogId && date) {
    // Get the entry before deleting to check if it was using a package
    const entry = await prisma.dailyRoster.findFirst({
      where: { dogId, date },
    })

    if (entry && entry.packageId) {
      // Return the day to the package
      await prisma.package.update({
        where: { id: entry.packageId },
        data: { remainingDays: { increment: 1 } },
      })
    }

    await prisma.dailyRoster.deleteMany({ where: { dogId, date } })
    return NextResponse.json({ success: true })
  }

  if (from && to) {
    await prisma.dailyRoster.deleteMany({
      where: { date: { gte: from, lte: to } },
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
}
