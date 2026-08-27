import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { seedDate, refreshDay, isCrecheSale, calcMensalPeriod, calcMensalAllowed, calcAvulsoPeriod, calcHotelPeriod, isDayScheduled } from '@/lib/roster-seed'

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

async function diagnoseRefreshDay(date: string) {
  const previousDate = new Date(date + 'T12:00:00Z')
  previousDate.setDate(previousDate.getDate() - 7)
  const previousDateStr = previousDate.toISOString().split('T')[0]
  const targetDateObj = new Date(date + 'T12:00:00Z')

  const previousEntries = await prisma.dailyRoster.findMany({
    where: { date: previousDateStr },
    include: { dog: true },
    orderBy: { dog: { name: 'asc' } },
  })

  const diagnostics: any[] = []

  for (const entry of previousEntries) {
    const dog = entry.dog
    if (!dog || !dog.isActive) {
      diagnostics.push({
        dogId: entry.dogId,
        name: dog?.name || '?',
        type: entry.type,
        result: 'SKIP',
        reason: !dog ? 'cão não encontrado' : 'cão inativo',
      })
      continue
    }

    const existing = await prisma.dailyRoster.findFirst({
      where: { dogId: entry.dogId, date },
    })
    if (existing) {
      diagnostics.push({
        dogId: entry.dogId,
        name: dog.name,
        type: entry.type,
        result: 'SKIP',
        reason: 'já existe no dia alvo',
      })
      continue
    }

    if (entry.type === 'CRECHE') {
      if ((dog.serviceType || '').toUpperCase() !== 'CRECHE') {
        diagnostics.push({
          dogId: entry.dogId,
          name: dog.name,
          type: entry.type,
          result: 'SKIP',
          reason: `serviceType é ${dog.serviceType || 'vazio'}, não CRECHE`,
        })
        continue
      }
      if (!isDayScheduled(dog.scheduledDays, targetDateObj.getDay())) {
        diagnostics.push({
          dogId: entry.dogId,
          name: dog.name,
          type: entry.type,
          result: 'SKIP',
          reason: `não é dia programado. scheduledDays="${dog.scheduledDays || ''}" dia=${DAYS_PT[targetDateObj.getDay()]}`,
        })
        continue
      }

      if (dog.isBolsista) {
        diagnostics.push({
          dogId: entry.dogId,
          name: dog.name,
          type: entry.type,
          result: 'ADD',
          reason: 'bolsista',
        })
        continue
      }

      const activeSales = await prisma.sales.findMany({
        where: {
          dogId: entry.dogId,
          OR: [{ saleType: 'MENSAL' }, { items: { some: { product: { category: 'CRECHE' } } } }],
          paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
          manualBaixa: false,
        },
        include: { items: { include: { product: true } } },
      })

      if (activeSales.length === 0) {
        diagnostics.push({
          dogId: entry.dogId,
          name: dog.name,
          type: entry.type,
          result: 'SKIP',
          reason: 'nenhuma venda CRECHE/MENSAL ativa (paga/pendente/agendada não baixada)',
        })
        continue
      }

      const saleDetails: any[] = []
      let added = false
      for (const sale of activeSales) {
        if (!isCrecheSale(sale)) {
          saleDetails.push({ saleId: sale.id.slice(-6), reason: 'não é venda creche' })
          continue
        }
        const period = calcMensalPeriod(sale)
        if (!period) {
          saleDetails.push({ saleId: sale.id.slice(-6), reason: 'sem período válido' })
          continue
        }
        if (targetDateObj < period.start || targetDateObj > period.end) {
          saleDetails.push({
            saleId: sale.id.slice(-6),
            reason: `fora do período: ${period.start.toISOString().split('T')[0]} a ${period.end.toISOString().split('T')[0]}`,
            startDate: sale.startDate,
            endDate: sale.endDate,
            saleDate: sale.saleDate,
          })
          continue
        }

        const cap = await calcMensalAllowed(sale, dog, date)
        if (cap.allowed !== Infinity && cap.used >= cap.allowed) {
          saleDetails.push({
            saleId: sale.id.slice(-6),
            reason: `limite atingido: ${cap.used}/${cap.allowed} dias usados`,
          })
          continue
        }

        diagnostics.push({
          dogId: entry.dogId,
          name: dog.name,
          type: entry.type,
          result: 'ADD',
          reason: `venda ${sale.id.slice(-6)} válida (${cap.used}/${cap.allowed} dias usados)`,
          saleDetails,
        })
        added = true
        break
      }

      if (!added) {
        diagnostics.push({
          dogId: entry.dogId,
          name: dog.name,
          type: entry.type,
          result: 'SKIP',
          reason: 'nenhuma venda creche válida para o dia',
          saleDetails,
        })
      }
    } else if (entry.type === 'HOTEL') {
      diagnostics.push({
        dogId: entry.dogId,
        name: dog.name,
        type: entry.type,
        result: 'INFO',
        reason: 'replicação de HOTEL não verificada neste diagnóstico',
      })
    } else {
      diagnostics.push({
        dogId: entry.dogId,
        name: dog.name,
        type: entry.type,
        result: 'INFO',
        reason: 'replicação de AVULSO/PACOTE não verificada neste diagnóstico',
      })
    }
  }

  return { date, previousDate: previousDateStr, totalPrevious: previousEntries.length, diagnostics }
}

// Calculate the cap of allowed days for a MENSAL sale in its validity period
async function calcAllowedDays(sale: any, scheduledDays: string | null, prismaClient: any, dogId: string, targetDateStr?: string): Promise<{ allowed: number; used: number; periodStart: string; periodEnd: string }> {
  const saleStartRaw = parseSaleDate(sale.startDate) || parseSaleDate(sale.saleDate)
  if (!saleStartRaw) return { allowed: Infinity, used: 0, periodStart: '', periodEnd: '' }
  saleStartRaw.setHours(0, 0, 0, 0)

  const hasExplicitEnd = !!sale.endDate
  const ref = targetDateStr ? new Date(targetDateStr + 'T12:00:00') : new Date()
  let saleStart = hasExplicitEnd ? saleStartRaw : new Date(ref.getFullYear(), ref.getMonth(), 1)
  let saleEnd = parseSaleDate(sale.endDate)
  if (!saleEnd) {
    // No explicit endDate: use end of the target month (or current month)
    saleEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
  }
  saleEnd.setHours(23, 59, 59, 999)

  const periodStart = saleStart.toISOString().split('T')[0]
  const periodEnd = saleEnd.toISOString().split('T')[0]

  const freq = getFrequencyFromProduct(sale)
  let allowed: number
  if (freq > 0) {
    const weeks = Math.ceil((saleEnd.getTime() - saleStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    allowed = freq * weeks
  } else if (scheduledDays && scheduledDays.trim() !== '') {
    allowed = countScheduledOccurrences(scheduledDays, saleStart, saleEnd)
  } else {
    allowed = Infinity
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
    if (sale.saleType === 'MENSAL' || sale.saleType === 'CRECHE') {
      // MENSAL without explicit endDate: valid indefinitely from startDate
      effectiveEndDate = new Date('2099-12-31')
    } else if (sale.saleType === 'PACOTE') {
      effectiveEndDate = new Date(startDate)
      effectiveEndDate.setMonth(effectiveEndDate.getMonth() + 6)
    } else if (sale.saleType === 'HOTEL') {
      effectiveEndDate = new Date(startDate)
      effectiveEndDate.setDate(effectiveEndDate.getDate() + 30)
    } else if (sale.saleType === 'AVULSO') {
      effectiveEndDate = new Date(startDate)
      effectiveEndDate.setDate(effectiveEndDate.getDate() + 30)
    } else {
      effectiveEndDate = new Date(startDate)
      effectiveEndDate.setDate(effectiveEndDate.getDate() + 30)
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
      select: { id: true, dogId: true, date: true, source: true, type: true, present: true, isPernoite: true, hasBanho: true, packageId: true, guestName: true, dog: { select: dogSelect } } as any,
      orderBy: [{ date: 'asc' }, { dogId: 'asc' }],
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
      select: { id: true, dogId: true, date: true, source: true, type: true, present: true, isPernoite: true, hasBanho: true, packageId: true, guestName: true, dog: { select: dogSelect } } as any,
      orderBy: [{ dogId: 'asc' }],
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
  const { dogId, date, type, isPernoite, packageId, hasBanho, guestName } = body
  const entryType = type || 'CRECHE'

  // ── ADAPTACAO: guest dog without registration — no sale checks needed ──
  if (guestName && !dogId) {
    const entry = await prisma.dailyRoster.create({
      data: {
        date,
        source: 'MANUAL',
        type: entryType,
        guestName: guestName.trim(),
        isPernoite: isPernoite || false,
      },
      select: {
        id: true, dogId: true, date: true, source: true, type: true,
        present: true, isPernoite: true, hasBanho: true, packageId: true,
        guestName: true, dog: { select: { id: true, name: true, breed: true, ownerName: true, photoUrl: true, serviceType: true, scheduledDays: true, monthlyStartDay: true } },
      } as any,
    })
    return NextResponse.json(entry, { status: 201 })
  }

  // Toggle-only update (hasBanho or isPernoite without adding to roster)
  if (hasBanho !== undefined && !type && !packageId) {
    // Use upsert to create entry if it doesn't exist
    await prisma.dailyRoster.upsert({
      where: { dogId_date: { dogId, date } },
      update: { hasBanho },
      create: { dogId, date, hasBanho, source: 'MANUAL', type: 'CRECHE' },
    })

    // Auto-baixa: when marking banho, find uncompleted BANHO/SERVICO sale and complete it
    if (hasBanho === true) {
      const banhoSale = await prisma.sales.findFirst({
        where: {
          dogId,
          saleType: { in: ['AVULSO', 'PRODUTO', 'SERVICO'] },
          paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
          manualBaixa: false,
          items: { some: { product: { category: { in: ['SERVICO', 'BANHO'] } } } },
        },
        orderBy: { saleDate: 'asc' },
      })

      if (banhoSale) {
        await prisma.sales.update({
          where: { id: banhoSale.id },
          data: { manualBaixa: true, manualBaixaDate: new Date(), serviceDate: new Date(date + 'T12:00:00') },
        })
      } else {
        // No uncompleted bath sale found — block the toggle
        await prisma.dailyRoster.update({
          where: { dogId_date: { dogId, date } },
          data: { hasBanho: false },
        })
        return NextResponse.json({
          error: 'Não há venda de banho não baixada para este cão',
          dogName: '',
        }, { status: 403 })
      }
    } else {
      // Reverting banho: find the sale that was auto-completed for this date and revert it
      const completedBanhoSale = await prisma.sales.findFirst({
        where: {
          dogId,
          manualBaixa: true,
          serviceDate: new Date(date + 'T12:00:00'),
          items: { some: { product: { category: { in: ['SERVICO', 'BANHO'] } } } },
        },
      })

      if (completedBanhoSale) {
        await prisma.sales.update({
          where: { id: completedBanhoSale.id },
          data: { manualBaixa: false, manualBaixaDate: null, serviceDate: null },
        })
      }
    }

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

    // Cães do mesmo tutor (mesmo CPF do responsável) podem compartilhar um pacote vendido para outro cão
    const [targetDog, packageOwner] = await Promise.all([
      prisma.dog.findUnique({ where: { id: dogId }, select: { ownerCpf: true } }),
      prisma.dog.findUnique({ where: { id: pkg.dogId }, select: { ownerCpf: true } })
    ])

    if (pkg.dogId !== dogId && targetDog?.ownerCpf !== packageOwner?.ownerCpf) {
      return NextResponse.json({ 
        error: 'Pacote não pertence a este cão',
        details: 'Este pacote só pode ser usado pelo cão titular ou por cães do mesmo tutor'
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

    // ── BANHO: standalone walk-in bath — requires uncompleted BANHO/SERVICO sale ──
    if (entryType === 'BANHO') {
      const banhoSale = await prisma.sales.findFirst({
        where: {
          dogId,
          paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
          manualBaixa: false,
          items: { some: { product: { category: { in: ['SERVICO', 'BANHO'] } } } },
        },
        orderBy: { saleDate: 'asc' },
      })

      if (!banhoSale) {
        return NextResponse.json({
          error: 'Não há venda de banho não baixada para este cão',
          dogName: dog?.name || '',
        }, { status: 403 })
      }

      // Auto-baixa the bath sale
      await prisma.sales.update({
        where: { id: banhoSale.id },
        data: { manualBaixa: true, manualBaixaDate: new Date(), serviceDate: new Date(date + 'T12:00:00') },
      })
    } else
    // ── BOLSISTA: always eligible, skip all checks ──────────────────────────
    if (dog.dogStatus === 'BOLSISTA' || dog.isBolsista === true) {
      // Fall through directly to upsert below
      console.log(`[DEBUG] Dog ${dogId} is BOLSISTA - skipping eligibility checks`)
    } else {

    let eligible = false
    let reason = ''

    // ── ADMIN / MANAGER: check sale validity + scheduledDays ──────────────
    if (isAdminOrManager) {
      if (entryType === 'CRECHE') {
        // Must have a valid Creche/Mensal sale covering the target date
        const mensalSales = dog.sales.filter((s: any) => isCrecheSale(s))

        if (mensalSales.length === 0) {
          eligible = false
          reason = 'Não há mensalidade de creche para este cão'
        } else {
          const validSale = mensalSales.find((s: any) => isDateInSaleRange(s, targetDate))
          if (!validSale) {
            eligible = false
            const fmt = (d: any) => d ? new Date(d).toISOString().split('T')[0] : null
            const allSalesInfo = dog.sales.map((s: any) => {
              const productNames = (s.items || []).map((i: any) => i.product?.name || '?').join(', ')
              return {
                id: s.id.slice(-6),
                type: s.saleType,
                status: s.paymentStatus,
                manualBaixa: s.manualBaixa,
                startDate: fmt(s.startDate),
                endDate: fmt(s.endDate),
                saleDate: fmt(s.saleDate),
                isCreche: isCrecheSale(s),
                inRange: isCrecheSale(s) ? isDateInSaleRange(s, new Date(targetDate.getTime())) : null,
                products: productNames,
              }
            })
            reason = `Alvo: ${targetDate.toISOString().split('T')[0]}. Todas as vendas: ${JSON.stringify(allSalesInfo)}`
          } else {
            // Check monthly cap: days purchased vs days already in roster for this period
            const cap = await calcAllowedDays(validSale, dog.scheduledDays, prisma, dog.id, date)
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
      const monthlySales = dog.sales.filter((s: any) => isCrecheSale(s))

      console.log(`[DEBUG] CRECHE check: found ${monthlySales.length} creche sales`)
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

        const hasExplicitEnd = !!sale.endDate
        let expiryDate = parseSaleDate(sale.endDate)
        if (!expiryDate) {
          // No explicit endDate: MENSAL valid indefinitely, use end of target month for counting
          expiryDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)
        }
        expiryDate.setHours(23, 59, 59, 999)
        console.log(`[DEBUG] Sale ${sale.id}: saleDate=${saleDate.toISOString()}, expiryDate=${expiryDate.toISOString()}, targetDate=${targetDate.toISOString()}`)

        if (targetDate < saleDate || targetDate > expiryDate) {
          console.log(`[DEBUG] Sale ${sale.id}: targetDate outside range`)
          continue
        }

        // For counting allowed/used days, use the target month window when there's no explicit endDate
        const countStart = hasExplicitEnd ? saleDate : new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
        const countStartStr = countStart.toISOString().split('T')[0]
        const expiryDateStr = expiryDate.toISOString().split('T')[0]

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
        const frequency = getFrequencyFromProduct(sale)
        const totalScheduled = frequency > 0
          ? frequency * Math.ceil((expiryDate.getTime() - countStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
          : countScheduledOccurrences(dog.scheduledDays, countStart, expiryDate)

        // Days already used (in roster) within the subscription period
        const usedDays = await prisma.dailyRoster.count({
          where: {
            dogId,
            type: 'CRECHE',
            date: { gte: countStartStr, lte: expiryDateStr },
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

  // Before upserting, check if there's an existing entry with a different type — revert its auto-baixa
  const existingEntry = await prisma.dailyRoster.findFirst({ where: { dogId, date } })
  if (existingEntry && existingEntry.type !== entryType) {
    const serviceDate = new Date(date + 'T12:00:00')
    if (existingEntry.type === 'AVULSO') {
      const completedSale = await prisma.sales.findFirst({
        where: { dogId, saleType: 'AVULSO', manualBaixa: true, serviceDate },
      })
      if (completedSale) {
        await prisma.sales.update({
          where: { id: completedSale.id },
          data: { manualBaixa: false, manualBaixaDate: null, serviceDate: null },
        })
      }
    }
    if (existingEntry.type === 'BANHO' || (existingEntry.hasBanho && entryType !== 'BANHO')) {
      const completedBanhoSale = await prisma.sales.findFirst({
        where: { dogId, manualBaixa: true, serviceDate, items: { some: { product: { category: { in: ['SERVICO', 'BANHO'] } } } } },
      })
      if (completedBanhoSale) {
        await prisma.sales.update({
          where: { id: completedBanhoSale.id },
          data: { manualBaixa: false, manualBaixaDate: null, serviceDate: null },
        })
      }
    }
  }

  const updateData: any = { source: 'MANUAL', type: entryType }
  if (isPernoite !== undefined) updateData.isPernoite = isPernoite
  if (hasBanho !== undefined) updateData.hasBanho = hasBanho
  if (packageId) {
    updateData.packageId = packageId
    // Decrement package remaining days
    const updatedPkg = await prisma.package.update({
      where: { id: packageId },
      data: { remainingDays: { decrement: 1 } },
    })
    // Baixa automática: desativa o pacote quando atinge o número máximo de utilizações
    if (updatedPkg.remainingDays <= 0 && updatedPkg.isActive) {
      await prisma.package.update({
        where: { id: packageId },
        data: { isActive: false },
      })
    }
  }

  const entry = await prisma.dailyRoster.upsert({
    where: { dogId_date: { dogId, date } },
    update: updateData,
    create: { dogId, date, source: 'MANUAL', type: entryType, isPernoite: isPernoite || false, packageId },
    select: { id: true, dogId: true, date: true, source: true, type: true, present: true, isPernoite: true, hasBanho: true, packageId: true, dog: { select: { id: true, name: true, breed: true, ownerName: true, photoUrl: true, serviceType: true, scheduledDays: true, monthlyStartDay: true } } } as any,
  })

  // Auto-baixa for AVULSO: find uncompleted AVULSO sale and mark it as completed
  if (entryType === 'AVULSO') {
    const avulsoSale = await prisma.sales.findFirst({
      where: {
        dogId,
        saleType: 'AVULSO',
        paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
        manualBaixa: false,
      },
      orderBy: { saleDate: 'asc' },
    })

    if (avulsoSale) {
      await prisma.sales.update({
        where: { id: avulsoSale.id },
        data: { manualBaixa: true, manualBaixaDate: new Date(), serviceDate: new Date(date + 'T12:00:00') },
      })
    }
  }

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
  const entryId = searchParams.get('entryId')

  if (reset === 'future') {
    // Kept for backwards compat but should not be used in UI anymore
    if (role !== 'ADMIN') return NextResponse.json({ error: 'Apenas ADMIN pode resetar o futuro inteiro' }, { status: 403 })
    const today = new Date().toISOString().split('T')[0]
    await prisma.dailyRoster.deleteMany({ where: { date: { gt: today } } })
    await prisma.dailyRosterSeed.deleteMany({ where: { date: { gt: today } } })
    return NextResponse.json({ success: true, message: 'Roster futuro limpo' })
  }

  if (reset === 'diagnostic' && date) {
    if (role !== 'ADMIN' && role !== 'MANAGER') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    const result = await diagnoseRefreshDay(date)
    return NextResponse.json({ success: true, ...result })
  }

  if (reset === 'day' && date) {
    if (role !== 'ADMIN' && role !== 'MANAGER') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    // Refresh the day: re-seed + replicate previous week's CRECHE dogs still valid
    const result = await refreshDay(date)
    return NextResponse.json({
      success: true,
      message: `Dia ${date} re-semeado`,
      removed: result.removed,
      added: result.added,
    })
  }

  // Delete by entryId (for adaptação entries that have no dogId)
  if (entryId) {
    await prisma.dailyRoster.deleteMany({ where: { id: entryId } })
    return NextResponse.json({ success: true })
  }

  if (dogId && date) {
    // Get the entry before deleting to check if it was using a package
    const entry = await prisma.dailyRoster.findFirst({
      where: { dogId, date },
    })

    if (entry && entry.packageId) {
      // Return the day to the package (nunca excede totalDays, evita duplo crédito em race conditions)
      const pkg = await prisma.package.findUnique({ where: { id: entry.packageId } })
      if (pkg) {
        const restoredDays = Math.min(pkg.remainingDays + 1, pkg.totalDays)
        await prisma.package.update({
          where: { id: entry.packageId },
          data: { remainingDays: restoredDays, isActive: restoredDays > 0 ? true : pkg.isActive },
        })
      }
    }

    // Revert auto-baixa for AVULSO/BANHO when removing from roster
    if (entry && (entry.type === 'AVULSO' || entry.type === 'BANHO' || entry.hasBanho)) {
      const serviceDate = new Date(date + 'T12:00:00')

      if (entry.type === 'AVULSO') {
        // Revert AVULSO sale
        const completedSale = await prisma.sales.findFirst({
          where: {
            dogId,
            saleType: 'AVULSO',
            manualBaixa: true,
            serviceDate,
          },
        })
        if (completedSale) {
          await prisma.sales.update({
            where: { id: completedSale.id },
            data: { manualBaixa: false, manualBaixaDate: null, serviceDate: null },
          })
        }
      }

      if (entry.type === 'BANHO' || entry.hasBanho) {
        // Revert BANHO/SERVICO sale
        const completedBanhoSale = await prisma.sales.findFirst({
          where: {
            dogId,
            manualBaixa: true,
            serviceDate,
            items: { some: { product: { category: { in: ['SERVICO', 'BANHO'] } } } },
          },
        })
        if (completedBanhoSale) {
          await prisma.sales.update({
            where: { id: completedBanhoSale.id },
            data: { manualBaixa: false, manualBaixaDate: null, serviceDate: null },
          })
        }
      }
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
