import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseSaleDate, calcAvulsoPeriod, isCrecheSale } from '@/lib/roster-seed'

const DAY_NAME_MAP: Record<number, string[]> = {
  0: ['domingo', 'dom'],
  1: ['segunda', 'seg'],
  2: ['terça', 'ter', 'terca'],
  3: ['quarta', 'qua'],
  4: ['quinta', 'qui'],
  5: ['sexta', 'sex'],
  6: ['sábado', 'sab', 'sabado'],
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

// GET /api/dogs/[id]/check-eligibility?date=YYYY-MM-DD&type=CRECHE|HOTEL|AVULSO
// Check if a dog is eligible for scheduling based on active sales/packages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') // Format: YYYY-MM-DD
    const type = searchParams.get('type') // CRECHE, HOTEL, AVULSO

    if (!date || !type) {
      return NextResponse.json({ error: 'Parâmetros date e type são obrigatórios' }, { status: 400 })
    }

    const dog = await prisma.dog.findUnique({
      where: { id: params.id },
      include: {
        packages: true,
        sales: {
          where: {
            paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
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
    })

    if (!dog) {
      return NextResponse.json({ error: 'Cão não encontrado' }, { status: 404 })
    }

    // Parse date string in local timezone to avoid UTC conversion issues
    const [year, month, day] = date.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day)
    targetDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let eligible = false
    let reason = ''
    let eligibleSales: any[] = []

    // Check eligibility based on type
    if (type === 'CRECHE') {
      const monthlySales = dog.sales.filter((s: any) => isCrecheSale(s))

      for (const sale of monthlySales) {
        const saleDate = sale.startDate ? new Date(sale.startDate) : new Date(sale.saleDate)
        saleDate.setHours(0, 0, 0, 0)

        if (targetDate < saleDate) continue

        // If no explicit endDate, MENSAL is valid indefinitely from startDate
        // Expiry is controlled by manualBaixa, not a calculated date
        const expiryDate = sale.endDate
          ? (() => { const d = new Date(sale.endDate); d.setHours(23, 59, 59, 999); return d })()
          : null

        if (expiryDate && targetDate > expiryDate) continue

        if (!dog.scheduledDays) {
          eligible = true
          eligibleSales.push(sale)
          reason = 'Mensalidade ativa'
          break
        }

        const scheduledLower = dog.scheduledDays.toLowerCase()
        const targetDayOfWeek = targetDate.getDay()
        const dayAliases = DAY_NAME_MAP[targetDayOfWeek] || []
        const isScheduledDay = dayAliases.some((alias: string) => scheduledLower.includes(alias))

        if (isScheduledDay) {
          eligible = true
          eligibleSales.push(sale)
          reason = 'Mensalidade ativa (dia programado)'
          break
        }

        // Not a scheduled day — check makeup credits
        // If no expiry (open-ended subscription), use end of current month as window
        const effectiveExpiry = expiryDate ?? (() => {
          const d = new Date(targetDate)
          d.setMonth(d.getMonth() + 1)
          d.setDate(0)
          d.setHours(23, 59, 59, 999)
          return d
        })()
        const totalScheduled = countScheduledOccurrences(dog.scheduledDays, saleDate, effectiveExpiry)
        const saleDateStr = saleDate.toISOString().split('T')[0]
        const expiryDateStr = effectiveExpiry.toISOString().split('T')[0]
        const usedDays = await prisma.dailyRoster.count({
          where: {
            dogId: dog.id,
            type: 'CRECHE',
            date: { gte: saleDateStr, lte: expiryDateStr },
          },
        })

        if (usedDays < totalScheduled) {
          eligible = true
          eligibleSales.push(sale)
          reason = `Reposição disponível — ${totalScheduled - usedDays} dia(s) restante(s) na mensalidade`
        } else {
          reason = `Sem créditos de reposição — ${usedDays}/${totalScheduled} dias utilizados`
        }
        break
      }
    } else if (type === 'AVULSO') {
      // Avulso: contabilizar créditos vendidos dentro do período de 30 dias.
      const avulsoSales = dog.sales.filter((s: any) =>
        s.saleType === 'AVULSO' ||
        (s.items.some((i: any) => i.product?.category === 'AVULSO' || /dia|diária|diaria|avulso/i.test(i.product?.name || '')))
      )

      for (const sale of avulsoSales) {
        const period = calcAvulsoPeriod(sale)
        if (!period) continue
        if (targetDate < period.start || targetDate > period.end) continue

        const purchasedDays = (sale.items || [])
          .filter(
            (item: any) =>
              item.product?.category === 'AVULSO' ||
              /dia|diária|diaria|avulso/i.test(item.product?.name || '')
          )
          .reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)

        if (purchasedDays === 0) {
          // Venda avulsa sem itens de dia: permite um dia dentro do período
          const used = await prisma.dailyRoster.count({
            where: {
              dogId: dog.id,
              type: 'AVULSO',
              date: { gte: period.start.toISOString().split('T')[0], lte: period.end.toISOString().split('T')[0] },
            },
          })
          if (used === 0) {
            eligible = true
            eligibleSales.push(sale)
            reason = 'Diária avulsa disponível'
            break
          }
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
          eligible = true
          eligibleSales.push(sale)
          reason = `Diária avulsa disponível: ${purchasedDays - used} dia(s) restante(s)`
          break
        } else {
          reason = `Dias esgotados: ${used}/${purchasedDays} dia(s) já agendado(s)`
        }
      }
    } else if (type === 'HOTEL') {
      // Prefer explicit startDate/endDate from sale; fall back to window calculation.
      const activeSales: any[] = []
      for (const s of dog.sales) {
        const isHotel = s.saleType === 'HOTEL' ||
          s.items.some((i: any) => i.product?.category === 'HOTEL' || i.product?.name.includes('Hotel'))
        if (!isHotel) continue

        let windowStart: Date
        let windowEnd: Date
        let saleTotalDays = 0

        if (s.startDate && s.endDate) {
          windowStart = new Date(s.startDate)
          windowStart.setHours(0, 0, 0, 0)
          windowEnd = new Date(s.endDate)
          windowEnd.setHours(23, 59, 59, 999)
          saleTotalDays = Math.round((windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
        } else {
          for (const item of s.items) {
            const productName = item.product?.name || ''
            const daysMatch = productName.match(/(\d+)\s*Di[aá]s?/i)
            if (daysMatch) {
              saleTotalDays += parseInt(daysMatch[1], 10) * (item.quantity || 1)
            } else {
              saleTotalDays += item.quantity || 1
            }
          }
          const saleDate = new Date(s.saleDate)
          windowStart = new Date(saleDate)
          windowStart.setDate(windowStart.getDate() - 30)
          windowEnd = new Date(saleDate)
          windowEnd.setDate(windowEnd.getDate() + saleTotalDays + 14)
        }

        if (targetDate >= windowStart && targetDate <= windowEnd) {
          activeSales.push({ sale: s, totalDays: saleTotalDays, windowStart })
        }
      }

      if (activeSales.length > 0) {
        const totalDaysPurchased = activeSales.reduce((sum, e) => sum + e.totalDays, 0)
        const earliestWindowStart = activeSales.reduce(
          (min, e) => e.windowStart < min ? e.windowStart : min,
          activeSales[0].windowStart
        )

        const usedDays = await prisma.dailyRoster.count({
          where: {
            dogId: dog.id,
            type: 'HOTEL',
            date: { gte: earliestWindowStart.toISOString().split('T')[0] },
          },
        })

        if (usedDays < totalDaysPurchased) {
          eligible = true
          eligibleSales = activeSales.map(e => e.sale)
          reason = `Venda de hotel disponível (${totalDaysPurchased - usedDays} dias restantes)`
        } else {
          reason = `Todos os dias de hotel já foram utilizados (${usedDays}/${totalDaysPurchased})`
        }
      } else {
        reason = 'Não há venda de hotel válida para este período'
      }
    }

    // Also check for active packages
    if (!eligible && type !== 'CRECHE') {
      const activePackages = dog.packages.filter((p: any) => 
        p.isActive && 
        p.remainingDays > 0 && 
        new Date(p.expiryDate) >= targetDate
      )

      if (activePackages.length > 0) {
        eligible = true
        reason = 'Pacote ativo com dias restantes'
        eligibleSales = activePackages
      }
    }

    return NextResponse.json({
      eligible,
      reason,
      eligibleSales,
      dogName: dog.name,
    })
  } catch (error) {
    console.error('Erro ao verificar elegibilidade:', error)
    return NextResponse.json({ error: 'Erro ao verificar elegibilidade' }, { status: 500 })
  }
}

