import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface DailyReport {
  date: string
  totalDogs: number
  nonBolsistaDogs: number
  bolsistaDogs: number
  revenue: {
    mensalidade: number
    pacotes: number
    servicos: number
    total: number
  }
  details: Array<{
    dogName: string
    dogId: string
    isBolsista: boolean
    type: string
    revenue: number
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

    // Buscar vendas/serviços associados aos cães
    const dogIds = Array.from(new Set(rosterEntries.map(e => e.dogId)))
    
    const sales = await prisma.sales.findMany({
      where: {
        dogId: { in: dogIds },
        paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO'] }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // Agrupar por data
    const reportsByDate: Record<string, DailyReport> = {}

    for (const entry of rosterEntries) {
      const date = entry.date
      if (!reportsByDate[date]) {
        reportsByDate[date] = {
          date,
          totalDogs: 0,
          nonBolsistaDogs: 0,
          bolsistaDogs: 0,
          revenue: { mensalidade: 0, pacotes: 0, servicos: 0, total: 0 },
          details: []
        }
      }

      const report = reportsByDate[date]
      const dog = entry.dog
      
      report.totalDogs++
      if (dog.isBolsista) {
        report.bolsistaDogs++
      } else {
        report.nonBolsistaDogs++
      }

      // Calcular receita alocada
      let revenue = 0
      let breakdown = ''

      if (entry.type === 'CRECHE' && !dog.isBolsista) {
        // Buscar venda mensal do cão
        const mensalSale = sales.find(s => 
          s.dogId === dog.id && 
          s.saleType === 'MENSAL' &&
          isDateInRange(date, s.startDate?.toISOString() || null, s.endDate?.toISOString() || null, s.saleDate.toISOString())
        )

        if (mensalSale) {
          const totalValue = mensalSale.finalPrice || 0
          const scheduledDays = dog.scheduledDays || ''
          const daysInMonth = countScheduledDaysInMonth(scheduledDays, date)
          
          if (daysInMonth > 0) {
            revenue = totalValue / daysInMonth
            breakdown = `Mensalidade R$${totalValue} ÷ ${daysInMonth} dias = R$${revenue.toFixed(2)}/dia`
            report.revenue.mensalidade += revenue
          }
        }
      } else if (entry.type === 'PACOTE' || entry.type === 'AVULSO') {
        // Usar pacote associado
        if (entry.package) {
          const pkg = entry.package
          const daysTotal = pkg.totalDays
          const pricePaid = pkg.pricePaid || 0
          
          if (daysTotal > 0) {
            revenue = pricePaid / daysTotal
            breakdown = `Pacote R$${pricePaid} ÷ ${daysTotal} dias = R$${revenue.toFixed(2)}/dia`
            report.revenue.pacotes += revenue
          }
        }
      } else if (entry.type === 'HOTEL') {
        // Buscar venda de hotel
        const hotelSale = sales.find(s => 
          s.dogId === dog.id && 
          s.saleType === 'HOTEL' &&
          isDateInRange(date, s.startDate?.toISOString() || null, s.endDate?.toISOString() || null, s.saleDate.toISOString())
        )
        
        if (hotelSale) {
          const totalValue = hotelSale.finalPrice || 0
          const start = hotelSale.startDate?.toISOString() || hotelSale.saleDate.toISOString()
          const end = hotelSale.endDate?.toISOString() || null
          const days = getDaysBetween(start, end)
          
          if (days > 0) {
            revenue = totalValue / days
            breakdown = `Hotel R$${totalValue} ÷ ${days} dias = R$${revenue.toFixed(2)}/dia`
            report.revenue.servicos += revenue
          }
        }
      }

      // Adicionar serviços extras (banho, etc)
      if (entry.hasBanho) {
        // Buscar preço de banho nas vendas
        const banhoItem = sales
          .filter(s => s.dogId === dog.id)
          .flatMap(s => s.items)
          .find(item => 
            item.product?.name?.toLowerCase().includes('banho') ||
            item.product?.category === 'BANHO'
          )
        
        if (banhoItem) {
          const banhoValue = (banhoItem.unitPrice || 0) * (banhoItem.quantity || 1)
          revenue += banhoValue
          breakdown += breakdown ? ` + Banho R$${banhoValue}` : `Banho R$${banhoValue}`
          report.revenue.servicos += banhoValue
        }
      }

      report.revenue.total += revenue
      
      report.details.push({
        dogName: dog.name,
        dogId: dog.id,
        isBolsista: dog.isBolsista,
        type: entry.type,
        revenue: Math.round(revenue * 100) / 100,
        breakdown
      })
    }

    // Converter para array e calcular médias
    const reports = Object.values(reportsByDate).sort((a, b) => a.date.localeCompare(b.date))
    
    // Calcular estatísticas
    const totalDays = reports.length
    const avgNonBolsistaDogs = totalDays > 0 
      ? reports.reduce((sum, r) => sum + r.nonBolsistaDogs, 0) / totalDays 
      : 0
    
    const avgDailyRevenue = totalDays > 0
      ? reports.reduce((sum, r) => sum + r.revenue.total, 0) / totalDays
      : 0

    // Separar passado e futuro
    const today = new Date().toISOString().split('T')[0]
    const pastReports = reports.filter(r => r.date < today)
    const futureReports = reports.filter(r => r.date >= today)

    const avgPastRevenue = pastReports.length > 0
      ? pastReports.reduce((sum, r) => sum + r.revenue.total, 0) / pastReports.length
      : 0

    const avgFutureRevenue = futureReports.length > 0
      ? futureReports.reduce((sum, r) => sum + r.revenue.total, 0) / futureReports.length
      : 0

    return NextResponse.json({
      period: { startDate, endDate },
      summary: {
        totalDays,
        avgNonBolsistaDogs: Math.round(avgNonBolsistaDogs * 100) / 100,
        avgDailyRevenue: Math.round(avgDailyRevenue * 100) / 100,
        avgPastRevenue: Math.round(avgPastRevenue * 100) / 100,
        avgFutureRevenue: Math.round(avgFutureRevenue * 100) / 100,
        totalRevenue: reports.reduce((sum, r) => sum + r.revenue.total, 0)
      },
      dailyReports: reports
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
