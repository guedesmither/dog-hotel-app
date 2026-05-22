import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/alerts - Get expiry alerts for sales and packages
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    const nextMonth = new Date(today)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    const alerts: any[] = []

    // Check for expiring packages
    const expiringPackages = await prisma.package.findMany({
      where: {
        isActive: true,
        remainingDays: { gt: 0 },
        expiryDate: {
          gte: today,
          lte: nextMonth,
        },
      },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            ownerName: true,
          },
        },
      },
      orderBy: { expiryDate: 'asc' },
    })

    expiringPackages.forEach((pkg: any) => {
      const expiryDate = new Date(pkg.expiryDate)
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      let urgency = 'info'
      if (daysUntilExpiry <= 3) urgency = 'critical'
      else if (daysUntilExpiry <= 7) urgency = 'warning'
      else if (daysUntilExpiry <= 14) urgency = 'info'

      alerts.push({
        type: 'PACKAGE_EXPIRY',
        urgency,
        message: `Pacote de ${pkg.dog.name} expira em ${daysUntilExpiry} dias`,
        details: `Dias restantes: ${pkg.remainingDays}`,
        dogId: pkg.dog.id,
        dogName: pkg.dog.name,
        expiryDate: pkg.expiryDate,
        daysUntilExpiry,
      })
    })

    // Check for expiring monthly subscriptions (MENSAL sales)
    const monthlySales = await prisma.sales.findMany({
      where: {
        saleType: 'MENSAL',
        paymentStatus: { in: ['PAGO', 'PROGRAMADA'] },
      },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            ownerName: true,
          },
        },
      },
      orderBy: { saleDate: 'desc' },
    })

    monthlySales.forEach((sale: any) => {
      const saleDate = new Date(sale.saleDate)
      const expiryDate = new Date(saleDate)
      expiryDate.setMonth(expiryDate.getMonth() + 1)
      
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        let urgency = 'info'
        if (daysUntilExpiry <= 3) urgency = 'critical'
        else if (daysUntilExpiry <= 7) urgency = 'warning'

        alerts.push({
          type: 'MONTHLY_EXPIRY',
          urgency,
          message: `Mensalidade de ${sale.dog.name} expira em ${daysUntilExpiry} dias`,
          details: `Venda em ${sale.saleDate.toISOString().split('T')[0]}`,
          dogId: sale.dog.id,
          dogName: sale.dog.name,
          expiryDate: expiryDate.toISOString(),
          daysUntilExpiry,
        })
      }
    })

    // Check for pending payments
    const pendingPayments = await prisma.sales.findMany({
      where: {
        paymentStatus: 'PENDENTE',
        saleDate: {
          gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            ownerName: true,
          },
        },
      },
      orderBy: { saleDate: 'desc' },
    })

    pendingPayments.forEach((sale: any) => {
      alerts.push({
        type: 'PENDING_PAYMENT',
        urgency: 'warning',
        message: `Pagamento pendente: ${sale.dog.name}`,
        details: `Valor: R$ ${sale.finalPrice.toFixed(2)} - ${sale.saleDate.toISOString().split('T')[0]}`,
        dogId: sale.dog.id,
        dogName: sale.dog.name,
        saleId: sale.id,
        amount: sale.finalPrice,
        saleDate: sale.saleDate,
      })
    })

    // Sort alerts by urgency and days until expiry
    alerts.sort((a, b) => {
      const urgencyOrder = { critical: 0, warning: 1, info: 2 }
      const urgencyA = urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 3
      const urgencyB = urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 3
      if (urgencyA !== urgencyB) return urgencyA - urgencyB
      return (a.daysUntilExpiry || 999) - (b.daysUntilExpiry || 999)
    })

    return NextResponse.json({ alerts, total: alerts.length })
  } catch (error) {
    console.error('Erro ao buscar avisos:', error)
    return NextResponse.json({ error: 'Erro ao buscar avisos' }, { status: 500 })
  }
}
