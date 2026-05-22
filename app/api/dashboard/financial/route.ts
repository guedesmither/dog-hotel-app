import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/dashboard/financial?yearMonth=2026-05
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const yearMonth = searchParams.get('yearMonth') || new Date().toISOString().slice(0, 7)

  // Get all active dogs with financial info
  const dogs = await prisma.dog.findMany({
    where: { 
      isActive: true,
      dogStatus: { not: 'INATIVO' },
    },
    select: {
      id: true,
      name: true,
      ownerName: true,
      matricula: true,
      enrollmentDate: true,
      agreedPrice: true,
      discountPercent: true,
      discountValue: true,
      frequencyDays: true,
      isHalfDay: true,
      scheduledDays: true,
      dogStatus: true,
    },
    orderBy: { name: 'asc' },
  })

  // Get price table for this month
  const priceTable = await prisma.priceTable.findMany({
    where: { yearMonth },
  })

  // Get roster entries for this month
  const rosterEntries = await prisma.dailyRoster.findMany({
    where: {
      date: { startsWith: yearMonth },
      type: { in: ['CRECHE', 'AVULSO', 'HOTEL'] },
    },
    select: {
      dogId: true,
      date: true,
      type: true,
      negotiatedPrice: true,
      isPernoite: true,
      packageId: true,
    },
  })

  // Get packages sold this month
  const monthStart = new Date(`${yearMonth}-01T00:00:00.000Z`)
  const monthEnd = new Date(`${yearMonth}-31T23:59:59.999Z`)
  
  const packagesSold = await prisma.package.findMany({
    where: {
      purchaseDate: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    select: {
      id: true,
      dogId: true,
      packageType: true,
      pricePaid: true,
    },
  })

  // Calculate financial data for each dog
  const results = dogs.map((dog: typeof dogs[0]) => {
    // Skip price calculation for BOLSISTA dogs
    if (dog.dogStatus === 'BOLSISTA') {
      return {
        dog: {
          id: dog.id,
          name: dog.name,
          ownerName: dog.ownerName,
          matricula: dog.matricula,
          enrollmentDate: dog.enrollmentDate,
          frequencyDays: dog.frequencyDays,
          isHalfDay: dog.isHalfDay,
          scheduledDays: dog.scheduledDays,
        },
        pricing: {
          basePrice: 0,
          agreedPrice: 0,
          discountPercent: 0,
          discountAmount: 0,
          totalDiscount: 0,
          finalPrice: 0,
          dailyRate: 0,
        },
        monthStats: {
          daysScheduled: 0,
          daysPresent: 0,
          extraDays: 0,
        },
      }
    }

    // Find table price for this dog's frequency
    let tablePrice = 0
    if (dog.frequencyDays) {
      const dogIsHalfDay = dog.isHalfDay === true
      const priceEntry = priceTable.find((p: typeof priceTable[0]) =>
        p.frequencyDays === dog.frequencyDays && p.isHalfDay === dogIsHalfDay
      )
      tablePrice = priceEntry?.monthlyPrice || 0
    }

    // Valor base é sempre o preço de tabela
    const basePrice = tablePrice || 0

    // Valor final usa o preço acordado se existir, senão usa o preço de tabela
    const finalPrice = dog.agreedPrice || tablePrice || 0

    // Calculate discount amount based on difference from table price
    const discountAmount = (tablePrice > finalPrice) ? (tablePrice - finalPrice) : 0
    const discountPercent = tablePrice > 0 ? (discountAmount / tablePrice) * 100 : 0

    // Count days present this month
    const dogEntries = rosterEntries.filter((r: typeof rosterEntries[0]) => r.dogId === dog.id)
    const daysPresent = dogEntries.filter((r: typeof rosterEntries[0]) => !r.date.endsWith('future')).length // Only past/current
    
    // Calculate daily rate for extra days
    const dailyRate = dog.frequencyDays ? (finalPrice / (dog.frequencyDays * 4)) : 0

    return {
      dog: {
        id: dog.id,
        name: dog.name,
        ownerName: dog.ownerName,
        matricula: dog.matricula,
        enrollmentDate: dog.enrollmentDate,
        frequencyDays: dog.frequencyDays,
        isHalfDay: dog.isHalfDay,
        scheduledDays: dog.scheduledDays,
      },
      pricing: {
        basePrice: tablePrice,           // Preço de tabela (valor cheio)
        agreedPrice: dog.agreedPrice,     // Valor acordado (pode ser null)
        discountPercent,
        discountAmount,                   // Mantém compatibilidade
        totalDiscount: discountAmount,    // Nome usado pelo frontend
        finalPrice,                       // Valor final cobrado
        dailyRate,
      },
      monthStats: {
        daysScheduled: dog.frequencyDays ? dog.frequencyDays * 4 : 0, // Approx 4 weeks
        daysPresent,
        extraDays: Math.max(0, daysPresent - (dog.frequencyDays ? dog.frequencyDays * 4 : 0)),
      },
    }
  })

  // Calculate totals
  const totalBaseValue = results.reduce((s: number, r: typeof results[0]) => s + r.pricing.basePrice, 0)
  const totalDiscounts = results.reduce((s: number, r: typeof results[0]) => s + r.pricing.discountAmount, 0)
  const totalFinalValue = results.reduce((s: number, r: typeof results[0]) => s + r.pricing.finalPrice, 0)
  
  // Add package sales revenue
  const totalPackageRevenue = packagesSold.reduce((s: number, p: typeof packagesSold[0]) => s + p.pricePaid, 0)
  
  // Add pernoite revenue (R$ 50 per pernoite - assuming price)
  const pernoiteEntries = rosterEntries.filter((r: typeof rosterEntries[0]) => r.isPernoite)
  const totalPernoiteRevenue = pernoiteEntries.length * 50 // R$ 50 per pernoite
  
  const totals = {
    totalDogs: results.length,
    totalBaseValue,
    totalDiscounts,
    totalFinalValue: totalFinalValue + totalPackageRevenue + totalPernoiteRevenue,
    totalPackageRevenue,
    totalPernoiteRevenue,
  }

  return NextResponse.json({ yearMonth, dogs: results, totals, packagesSold, pernoiteCount: pernoiteEntries.length })
}
