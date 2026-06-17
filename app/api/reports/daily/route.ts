import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RevenueByStatus {
  pago: number
  pendente: number
  agendado: number
  total: number
}

interface DailyReport {
  date: string
  totalDogs: number
  nonBolsistaDogs: number
  bolsistaDogs: number
  revenue: {
    mensalidade: RevenueByStatus
    pacotes: RevenueByStatus
    servicos: RevenueByStatus
    total: RevenueByStatus
  }
  details: Array<{
    dogName: string
    dogId: string
    isBolsista: boolean
    type: string
    revenue: number
    status: string
    breakdown: string
  }>
}

interface SalesAllocation {
  sale: any
  dog: any
  days: number
  daysInPeriod: number
  valuePerDay: number
}

// GET /api/reports/daily?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role?: string })?.role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: startDate e endDate' }, { status: 400 })
  }

  try {
    // Buscar TODAS as vendas no período do relatório (não só dos cães no roster)
    const periodStartDate = new Date(startDate)
    const periodEndDate = new Date(endDate)

    const allSales = await prisma.sales.findMany({
      where: {
        paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
        dogId: { not: null },
        OR: [
          // MENSAL: apenas as do mês (saleDate no período) — não incluir mensalidades de meses anteriores
          {
            saleType: 'MENSAL',
            saleDate: { gte: periodStartDate, lte: periodEndDate }
          },
          // HOTEL: vendas com datas de estadia que se sobrepõem ao período
          {
            saleType: 'HOTEL',
            startDate: { not: null },
            AND: [
              { startDate: { lte: periodEndDate } },
              { OR: [{ endDate: null }, { endDate: { gte: periodStartDate } }] }
            ]
          },
          // PACOTE: vendas com datas que se sobrepõem ao período
          {
            saleType: 'PACOTE',
            AND: [
              { OR: [{ startDate: null }, { startDate: { lte: periodEndDate } }] },
              { OR: [{ endDate: null }, { endDate: { gte: periodStartDate } }] },
              { saleDate: { gte: new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() - 6, 1), lte: periodEndDate } }
            ]
          },
          // AVULSO e demais: saleDate no período
          {
            saleType: { notIn: ['MENSAL', 'HOTEL', 'PACOTE'] },
            saleDate: { gte: periodStartDate, lte: periodEndDate }
          }
        ]
      },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            isBolsista: true,
            scheduledDays: true,
            serviceType: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // Buscar todas as entradas da agenda no período
    const rosterEntries = await prisma.dailyRoster.findMany({
      where: {
        date: { gte: startDate, lte: endDate }
      },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            isBolsista: true,
            dogStatus: true,
            serviceType: true,
            scheduledDays: true
          }
        },
        package: true
      },
      orderBy: { date: 'asc' }
    })

    // Agrupar por data
    const reportsByDate: Record<string, DailyReport> = {}

    // Inicializar todos os dias do período
    const periodStart = new Date(startDate)
    const periodEnd = new Date(endDate)
    for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      reportsByDate[dateStr] = {
        date: dateStr,
        totalDogs: 0,
        nonBolsistaDogs: 0,
        bolsistaDogs: 0,
        revenue: {
          mensalidade: { pago: 0, pendente: 0, agendado: 0, total: 0 },
          pacotes: { pago: 0, pendente: 0, agendado: 0, total: 0 },
          servicos: { pago: 0, pendente: 0, agendado: 0, total: 0 },
          total: { pago: 0, pendente: 0, agendado: 0, total: 0 }
        },
        details: []
      }
    }

    // Processar entradas do roster para contagem de cães
    for (const entry of rosterEntries) {
      const date = entry.date
      if (!reportsByDate[date]) continue

      const report = reportsByDate[date]
      const dog = entry.dog
      
      report.totalDogs++
      if (dog.isBolsista) {
        report.bolsistaDogs++
      } else {
        report.nonBolsistaDogs++
      }
    }

    // Processar TODAS as vendas para alocação de receita
    for (const sale of allSales) {
      if (!sale.dog) continue

      const saleType = sale.saleType
      const finalPrice = sale.finalPrice || 0
      const paymentStatus = sale.paymentStatus
      const status = getStatusKey(paymentStatus || 'AGENDADO')
      const saleStartDate = sale.startDate ? new Date(sale.startDate) : new Date(sale.saleDate)
      const saleEndDate = sale.endDate ? new Date(sale.endDate) : null

      const addRevenue = (day: string, value: number, breakdown: string) => {
        const report = reportsByDate[day]
        if (!report) return
        const v = Math.round(value * 100) / 100
        if (saleType === 'MENSAL') {
          report.revenue.mensalidade[status] += v
          report.revenue.mensalidade.total += v
        } else if (saleType === 'PACOTE' || saleType === 'AVULSO') {
          report.revenue.pacotes[status] += v
          report.revenue.pacotes.total += v
        } else {
          report.revenue.servicos[status] += v
          report.revenue.servicos.total += v
        }
        report.revenue.total[status] += v
        report.revenue.total.total += v
        report.details.push({
          dogName: sale.dog!.name,
          dogId: sale.dogId ?? '',
          isBolsista: sale.dog!.isBolsista,
          type: saleType,
          revenue: v,
          status: paymentStatus ?? 'AGENDADO',
          breakdown
        })
      }

      if (saleType === 'MENSAL') {
        // Distribuir proporcionalmente pelos dias agendados do mês
        const scheduledDays = sale.dog.scheduledDays || ''
        const reportMonth = new Date(startDate)
        const totalDays = countScheduledDaysInMonth(
          scheduledDays,
          `${reportMonth.getFullYear()}-${String(reportMonth.getMonth() + 1).padStart(2, '0')}-01`
        ) || 1
        const valuePerDay = finalPrice / totalDays
        const days = generateDaysInPeriod(saleStartDate, saleEndDate, startDate, endDate, scheduledDays, 'MENSAL')
        for (const day of days) {
          addRevenue(day, valuePerDay, `MENSAL R$${finalPrice} ÷ ${totalDays} dias = R$${valuePerDay.toFixed(2)}/dia`)
        }

      } else if (saleType === 'HOTEL') {
        // Distribuir pelos dias de estadia dentro do período
        const totalDays = getDaysBetween(saleStartDate.toISOString(), saleEndDate?.toISOString() ?? null) || 1
        const valuePerDay = finalPrice / totalDays
        const days = generateDaysInPeriod(saleStartDate, saleEndDate, startDate, endDate, null, 'HOTEL')
        for (const day of days) {
          addRevenue(day, valuePerDay, `HOTEL R$${finalPrice} ÷ ${totalDays} dias = R$${valuePerDay.toFixed(2)}/dia`)
        }

      } else {
        // PACOTE, AVULSO, outros: contabilizar UMA VEZ no dia da venda
        const saleDateStr = sale.saleDate.toISOString().split('T')[0]
        if (reportsByDate[saleDateStr]) {
          addRevenue(saleDateStr, finalPrice, `${saleType} R$${finalPrice} (única vez em ${saleDateStr})`)
        }
      }
    }

    // Converter para array e calcular médias
    const reports = Object.values(reportsByDate).sort((a, b) => a.date.localeCompare(b.date))
    
    // Calcular totais e estatísticas
    const totals = {
      mensalidade: { pago: 0, pendente: 0, agendado: 0, total: 0 },
      pacotes: { pago: 0, pendente: 0, agendado: 0, total: 0 },
      servicos: { pago: 0, pendente: 0, agendado: 0, total: 0 },
      geral: { pago: 0, pendente: 0, agendado: 0, total: 0 }
    }

    for (const report of reports) {
      totals.mensalidade.pago += report.revenue.mensalidade.pago
      totals.mensalidade.pendente += report.revenue.mensalidade.pendente
      totals.mensalidade.agendado += report.revenue.mensalidade.agendado
      totals.mensalidade.total += report.revenue.mensalidade.total
      
      totals.pacotes.pago += report.revenue.pacotes.pago
      totals.pacotes.pendente += report.revenue.pacotes.pendente
      totals.pacotes.agendado += report.revenue.pacotes.agendado
      totals.pacotes.total += report.revenue.pacotes.total
      
      totals.servicos.pago += report.revenue.servicos.pago
      totals.servicos.pendente += report.revenue.servicos.pendente
      totals.servicos.agendado += report.revenue.servicos.agendado
      totals.servicos.total += report.revenue.servicos.total
      
      totals.geral.pago += report.revenue.total.pago
      totals.geral.pendente += report.revenue.total.pendente
      totals.geral.agendado += report.revenue.total.agendado
      totals.geral.total += report.revenue.total.total
    }

    const totalDays = reports.length
    const avgNonBolsistaDogs = totalDays > 0 
      ? reports.reduce((sum, r) => sum + r.nonBolsistaDogs, 0) / totalDays 
      : 0

    // Separar passado e futuro
    const today = new Date().toISOString().split('T')[0]
    const pastReports = reports.filter(r => r.date < today)
    const futureReports = reports.filter(r => r.date >= today)

    const avgPastRevenue = pastReports.length > 0
      ? pastReports.reduce((sum, r) => sum + r.revenue.total.total, 0) / pastReports.length
      : 0

    const avgFutureRevenue = futureReports.length > 0
      ? futureReports.reduce((sum, r) => sum + r.revenue.total.total, 0) / futureReports.length
      : 0

    return NextResponse.json({
      period: { startDate, endDate },
      summary: {
        totalDays,
        avgNonBolsistaDogs: Math.round(avgNonBolsistaDogs * 100) / 100,
        avgDailyRevenue: totalDays > 0 ? Math.round((totals.geral.total / totalDays) * 100) / 100 : 0,
        avgPastRevenue: Math.round(avgPastRevenue * 100) / 100,
        avgFutureRevenue: Math.round(avgFutureRevenue * 100) / 100,
        totals: {
          mensalidade: roundValues(totals.mensalidade),
          pacotes: roundValues(totals.pacotes),
          servicos: roundValues(totals.servicos),
          geral: roundValues(totals.geral)
        }
      },
      dailyReports: reports.map(r => ({
        ...r,
        revenue: {
          mensalidade: roundValues(r.revenue.mensalidade),
          pacotes: roundValues(r.revenue.pacotes),
          servicos: roundValues(r.revenue.servicos),
          total: roundValues(r.revenue.total)
        }
      }))
    })

  } catch (error) {
    console.error('Erro ao gerar relatório diário:', error)
    return NextResponse.json({ error: 'Erro interno ao gerar relatório' }, { status: 500 })
  }
}

// Funções auxiliares
function isDateInRange(date: string, startDate: string | null, endDate: string | null, saleDate: string): boolean {
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  
  const start = startDate ? new Date(startDate) : new Date(saleDate)
  start.setHours(0, 0, 0, 0)
  
  const end = endDate ? new Date(endDate) : new Date(start)
  if (!endDate) {
    end.setMonth(end.getMonth() + 1)
  }
  end.setHours(23, 59, 59, 999)
  
  return target >= start && target <= end
}

function countScheduledDaysInMonth(scheduledDays: string, dateStr: string): number {
  if (!scheduledDays || scheduledDays.trim() === '') return 0
  
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const dayMap: Record<string, number> = {
    'domingo': 0, 'dom': 0,
    'segunda': 1, 'seg': 1,
    'terca': 2, 'ter': 2, 'terça': 2,
    'quarta': 3, 'qua': 3,
    'quinta': 4, 'qui': 4,
    'sexta': 5, 'sex': 5,
    'sabado': 6, 'sab': 6, 'sábado': 6, 'sáb': 6
  }
  
  const scheduled = scheduledDays.toLowerCase().split(',').map(s => s.trim())
  const targetDayIndices = scheduled
    .map(day => dayMap[day])
    .filter((idx): idx is number => idx !== undefined)
  
  let count = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day)
    if (targetDayIndices.includes(currentDate.getDay())) {
      count++
    }
  }
  
  return count
}

function getDaysBetween(startDate: string, endDate: string | null): number {
  if (!endDate) return 1
  
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

function getStatusKey(status: string): 'pago' | 'pendente' | 'agendado' {
  if (status === 'PAGO') return 'pago'
  if (status === 'PENDENTE') return 'pendente'
  return 'agendado' // AGENDADO, PROGRAMADA
}

function isDateInRangeString(date: string, startDate: string, endDate: string): boolean {
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)
  return target >= start && target <= end
}

function countScheduledDaysInPeriod(
  scheduledDays: string,
  periodStart: string,
  periodEnd: string,
  saleStartDate: Date,
  saleEndDate: Date | null
): number {
  if (!scheduledDays || scheduledDays.trim() === '') return 0
  
  const dayMap: Record<string, number> = {
    'domingo': 0, 'dom': 0,
    'segunda': 1, 'seg': 1,
    'terca': 2, 'ter': 2, 'terça': 2,
    'quarta': 3, 'qua': 3,
    'quinta': 4, 'qui': 4,
    'sexta': 5, 'sex': 5,
    'sabado': 6, 'sab': 6, 'sábado': 6, 'sáb': 6
  }
  
  const scheduled = scheduledDays.toLowerCase().split(',').map(s => s.trim())
  const targetDayIndices = scheduled
    .map(day => dayMap[day])
    .filter((idx): idx is number => idx !== undefined)
  
  const pStart = new Date(periodStart)
  const pEnd = new Date(periodEnd)
  const sStart = new Date(saleStartDate)
  const sEnd = saleEndDate ? new Date(saleEndDate) : new Date(sStart.getFullYear(), sStart.getMonth() + 1, 0)
  
  let count = 0
  for (let d = new Date(pStart); d <= pEnd; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const dayOfWeek = d.getDay()
    
    // Verifica se é um dia agendado
    if (!targetDayIndices.includes(dayOfWeek)) continue
    
    // Verifica se está dentro do período da venda
    const checkDate = new Date(dateStr)
    if (checkDate >= sStart && checkDate <= sEnd) {
      count++
    }
  }
  
  return count
}

function countDaysInPeriod(
  saleStart: Date,
  saleEnd: Date | null,
  periodStart: string,
  periodEnd: string
): number {
  const sStart = new Date(saleStart)
  const sEnd = saleEnd || new Date(periodEnd)
  const pStart = new Date(periodStart)
  const pEnd = new Date(periodEnd)
  
  // Interseção entre períodos
  const actualStart = sStart > pStart ? sStart : pStart
  const actualEnd = sEnd < pEnd ? sEnd : pEnd
  
  if (actualStart > actualEnd) return 0
  
  const diffTime = Math.abs(actualEnd.getTime() - actualStart.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

function generateDaysInPeriod(
  saleStart: Date,
  saleEnd: Date | null,
  periodStart: string,
  periodEnd: string,
  scheduledDays: string | null,
  saleType: string
): string[] {
  const days: string[] = []
  
  const sStart = new Date(saleStart)
  // Para vendas sem endDate, limitar ao fim do período do relatório (não vazar para outros meses)
  const sEnd = saleEnd || new Date(periodEnd)
  const pStart = new Date(periodStart)
  const pEnd = new Date(periodEnd)
  
  // Para vendas mensais, respeitar dias agendados
  if (saleType === 'MENSAL' && scheduledDays) {
    const dayMap: Record<string, number> = {
      'domingo': 0, 'dom': 0,
      'segunda': 1, 'seg': 1,
      'terca': 2, 'ter': 2, 'terça': 2,
      'quarta': 3, 'qua': 3,
      'quinta': 4, 'qui': 4,
      'sexta': 5, 'sex': 5,
      'sabado': 6, 'sab': 6, 'sábado': 6, 'sáb': 6
    }
    
    const scheduled = scheduledDays.toLowerCase().split(',').map(s => s.trim())
    const targetDayIndices = scheduled
      .map(day => dayMap[day])
      .filter((idx): idx is number => idx !== undefined)
    
    for (let d = new Date(pStart); d <= pEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const checkDate = new Date(dateStr)
      
      // Verifica se é dia agendado
      if (!targetDayIndices.includes(d.getDay())) continue
      
      // Verifica se está dentro do período da venda
      if (checkDate >= sStart && checkDate <= sEnd) {
        days.push(dateStr)
      }
    }
  } else {
    // Hotel e outros: todos os dias do período
    for (let d = new Date(pStart); d <= pEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const checkDate = new Date(dateStr)
      
      if (checkDate >= sStart && checkDate <= sEnd) {
        days.push(dateStr)
      }
    }
  }
  
  return days
}

function roundValues(obj: RevenueByStatus): RevenueByStatus {
  return {
    pago: Math.round(obj.pago * 100) / 100,
    pendente: Math.round(obj.pendente * 100) / 100,
    agendado: Math.round(obj.agendado * 100) / 100,
    total: Math.round(obj.total * 100) / 100
  }
}
