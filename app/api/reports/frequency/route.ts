import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type MonthlyData = {
  month: string
  label: string
  enrollments: number
  accumulatedEnrollments: number
  uniquePresentDogs: number
  uniqueBilledDogs: number
  averagePayingDogsPerDay: number
  workingDays: number
  billedRevenue: number
}

const monthLabel = (month: string) => {
  const [year, number] = month.split('-')
  return `${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][Number(number) - 1]}/${year.slice(2)}`
}

const toMonth = (date: Date | string) => {
  const value = typeof date === 'string' ? date : date.toISOString()
  return value.slice(0, 7)
}

const monthRange = (start: string, end: string) => {
  const [startYear, startMonth] = start.split('-').map(Number)
  const [endYear, endMonth] = end.split('-').map(Number)
  const months: string[] = []
  for (let year = startYear, month = startMonth; year < endYear || (year === endYear && month <= endMonth); ) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month++
    if (month === 13) {
      month = 1
      year++
    }
  }
  return months
}

const workingDaysUntil = (month: string, today: string) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const end = month === today.slice(0, 7) ? Math.min(Number(today.slice(8, 10)), lastDay) : lastDay
  let count = 0
  for (let day = 1; day <= end; day++) {
    const weekDay = new Date(Date.UTC(year, monthNumber - 1, day)).getUTCDay()
    if (weekDay >= 1 && weekDay <= 6) count++
  }
  return count
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const [sales, attendance] = await Promise.all([
      prisma.sales.findMany({
        where: { dogId: { not: null } },
        select: { dogId: true, saleDate: true, saleType: true, finalPrice: true, paymentStatus: true },
        orderBy: { saleDate: 'asc' },
      }),
      prisma.dailyRoster.findMany({
        where: { present: true },
        select: { dogId: true, date: true },
        orderBy: { date: 'asc' },
      }),
    ])

    const datedSales = sales.filter((sale): sale is typeof sale & { dogId: string } => Boolean(sale.dogId))
    const enrollmentSales = datedSales.filter(sale => sale.saleType === 'MENSAL' || sale.saleType === 'HOTEL')
    const firstSaleByDog = new Map<string, Date>()
    for (const sale of enrollmentSales) {
      if (!firstSaleByDog.has(sale.dogId)) firstSaleByDog.set(sale.dogId, sale.saleDate)
    }

    const firstDate = [
      ...Array.from(firstSaleByDog.values()).map(value => value.toISOString().slice(0, 7)),
      ...attendance.map(entry => entry.date.slice(0, 7)),
    ].sort()[0]

    if (!firstDate) {
      return NextResponse.json({ monthly: [], summary: { totalEnrollments: 0, currentPayingDogs: 0, averagePayingDogsPerDay: 0 } })
    }

    const today = new Date().toISOString().slice(0, 10)
    const months = monthRange(firstDate, today.slice(0, 7))
    const enrollmentByMonth = new Map<string, Set<string>>()
    const billedDogsByMonth = new Map<string, Set<string>>()
    const billedRevenueByMonth = new Map<string, number>()
    const presentDogsByMonth = new Map<string, Set<string>>()
    const presentPayingDogsByDay = new Map<string, Set<string>>()

    for (const [dogId, firstSale] of Array.from(firstSaleByDog.entries())) {
      const month = toMonth(firstSale)
      if (!enrollmentByMonth.has(month)) enrollmentByMonth.set(month, new Set())
      enrollmentByMonth.get(month)!.add(dogId)
    }

    for (const sale of datedSales) {
      const month = toMonth(sale.saleDate)
      if (!billedDogsByMonth.has(month)) billedDogsByMonth.set(month, new Set())
      billedDogsByMonth.get(month)!.add(sale.dogId)
      billedRevenueByMonth.set(month, (billedRevenueByMonth.get(month) || 0) + sale.finalPrice)
    }

    for (const entry of attendance) {
      const month = entry.date.slice(0, 7)
      if (!presentDogsByMonth.has(month)) presentDogsByMonth.set(month, new Set())
      presentDogsByMonth.get(month)!.add(entry.dogId)
      const firstSale = firstSaleByDog.get(entry.dogId)
      if (firstSale && firstSale.toISOString().slice(0, 10) <= entry.date) {
        if (!presentPayingDogsByDay.has(entry.date)) presentPayingDogsByDay.set(entry.date, new Set())
        presentPayingDogsByDay.get(entry.date)!.add(entry.dogId)
      }
    }

    let accumulatedEnrollments = 0
    const monthly: MonthlyData[] = months.map(month => {
      const enrollments = enrollmentByMonth.get(month)?.size || 0
      accumulatedEnrollments += enrollments
      const workingDays = workingDaysUntil(month, today)
      const dailyPayingTotal = Array.from(presentPayingDogsByDay.entries())
        .filter(([date]) => date.startsWith(month))
        .reduce((total, [, dogs]) => total + dogs.size, 0)

      return {
        month,
        label: monthLabel(month),
        enrollments,
        accumulatedEnrollments,
        uniquePresentDogs: presentDogsByMonth.get(month)?.size || 0,
        uniqueBilledDogs: billedDogsByMonth.get(month)?.size || 0,
        averagePayingDogsPerDay: workingDays ? Math.round((dailyPayingTotal / workingDays) * 100) / 100 : 0,
        workingDays,
        billedRevenue: Math.round((billedRevenueByMonth.get(month) || 0) * 100) / 100,
      }
    })

    const currentMonth = monthly[monthly.length - 1]
    return NextResponse.json({
      monthly,
      summary: {
        totalEnrollments: firstSaleByDog.size,
        currentPayingDogs: currentMonth?.accumulatedEnrollments || 0,
        averagePayingDogsPerDay: currentMonth?.averagePayingDogsPerDay || 0,
      },
    })
  } catch (error) {
    console.error('Erro ao gerar relatório de frequência:', error)
    return NextResponse.json({ error: 'Erro interno ao gerar relatório de frequência' }, { status: 500 })
  }
}
