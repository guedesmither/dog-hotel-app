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
    // Lógica simples: agrupar vendas pelo saleDate, somar finalPrice por dia
    const allSales = await prisma.sales.findMany({
      where: {
        saleDate: {
          gte: new Date(`${startDate}T00:00:00.000Z`),
          lte: new Date(`${endDate}T23:59:59.999Z`)
        },
        paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
        dogId: { not: null }
      },
      include: {
        dog: {
          select: { id: true, name: true, isBolsista: true }
        }
      }
    })

    // Buscar entradas do roster para contagem de cães por dia
    const rosterEntries = await prisma.dailyRoster.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: {
        dog: { select: { id: true, isBolsista: true } }
      },
      orderBy: { date: 'asc' }
    })

    // Inicializar todos os dias do período
    const reportsByDate: Record<string, DailyReport> = {}
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
          pacotes:     { pago: 0, pendente: 0, agendado: 0, total: 0 },
          servicos:    { pago: 0, pendente: 0, agendado: 0, total: 0 },
          total:       { pago: 0, pendente: 0, agendado: 0, total: 0 }
        },
        details: []
      }
    }

    // Contagem de cães por dia (roster)
    for (const entry of rosterEntries) {
      const report = reportsByDate[entry.date]
      if (!report) continue
      report.totalDogs++
      if (entry.dog?.isBolsista) report.bolsistaDogs++
      else report.nonBolsistaDogs++
    }

    // Agrupar vendas por saleDate — simples e direto
    for (const sale of allSales) {
      if (!sale.dog) continue

      const dateStr = sale.saleDate.toISOString().split('T')[0]
      const report = reportsByDate[dateStr]
      if (!report) continue

      const value = sale.finalPrice || 0
      const status = getStatusKey(sale.paymentStatus || 'AGENDADO')
      const saleType = sale.saleType

      if (saleType === 'MENSAL') {
        report.revenue.mensalidade[status] += value
        report.revenue.mensalidade.total += value
      } else if (saleType === 'PACOTE' || saleType === 'AVULSO') {
        report.revenue.pacotes[status] += value
        report.revenue.pacotes.total += value
      } else {
        // HOTEL e outros
        report.revenue.servicos[status] += value
        report.revenue.servicos.total += value
      }
      report.revenue.total[status] += value
      report.revenue.total.total += value

      report.details.push({
        dogName: sale.dog.name,
        dogId: sale.dogId ?? '',
        isBolsista: sale.dog.isBolsista,
        type: saleType,
        revenue: value,
        status: sale.paymentStatus ?? 'AGENDADO',
        breakdown: `${saleType} R$${value} em ${dateStr} (${sale.paymentStatus})`
      })
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

function getStatusKey(status: string): 'pago' | 'pendente' | 'agendado' {
  if (status === 'PAGO') return 'pago'
  if (status === 'PENDENTE') return 'pendente'
  return 'agendado'
}

function roundValues(obj: RevenueByStatus): RevenueByStatus {
  return {
    pago: Math.round(obj.pago * 100) / 100,
    pendente: Math.round(obj.pendente * 100) / 100,
    agendado: Math.round(obj.agendado * 100) / 100,
    total: Math.round(obj.total * 100) / 100
  }
}
