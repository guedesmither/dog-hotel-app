import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type MonthlyData = {
  month: string
  label: string
  enrollments: number
  accumulatedEnrollments: number
  activeMonthlyCrecheDogs: number
  uniquePresentDogs: number
  averagePayingDogsPerDay: number
  workingDays: number
  billedRevenue: number
  payingDogDays: number
  revenuePerPayingDogDay: number
  dogs: Array<{
    id: string
    name: string
    ownerName: string
    photoUrl: string | null
    enrolled: boolean
    present: boolean
    directSale: boolean
    packageUse: boolean
  }>
}

const monthLabel = (month: string) => {
  const [year, number] = month.split('-')
  return `${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][Number(number) - 1]}/${year.slice(2)}`
}

const toMonth = (date: Date | string) => {
  const value = typeof date === 'string' ? date : date.toISOString()
  return value.slice(0, 7)
}

const parseEnrollmentDate = (value: string) => {
  const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) return new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}T12:00:00.000Z`)
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return new Date(`${value}T12:00:00.000Z`)
  return null
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
    const today = new Date().toISOString().slice(0, 10)
    const [sales, attendance, dogs] = await Promise.all([
      prisma.sales.findMany({
        where: { dogId: { not: null }, dog: { isBolsista: false } },
        select: { dogId: true, saleDate: true, saleType: true, paymentStatus: true, finalPrice: true },
        orderBy: { saleDate: 'asc' },
      }),
      prisma.dailyRoster.findMany({
        where: { present: true, date: { lte: today }, dog: { isBolsista: false } },
        select: { dogId: true, date: true, packageId: true },
        orderBy: { date: 'asc' },
      }),
      prisma.dog.findMany({
        where: { isBolsista: false },
        select: { id: true, name: true, ownerName: true, photoUrl: true, enrollmentDate: true, createdAt: true, serviceType: true },
      }),
    ])

    const datedSales = sales.filter((sale): sale is typeof sale & { dogId: string } => Boolean(sale.dogId))
    const firstSaleByDog = new Map<string, Date>()
    const dogsWithoutEnrollmentDate = new Map<string, Date>()
    for (const dog of dogs) {
      const enrollmentDate = dog.enrollmentDate ? parseEnrollmentDate(dog.enrollmentDate) : null
      if (enrollmentDate && !Number.isNaN(enrollmentDate.getTime())) firstSaleByDog.set(dog.id, enrollmentDate)
      else dogsWithoutEnrollmentDate.set(dog.id, dog.createdAt)
    }
    for (const sale of datedSales.filter(item => item.saleType === 'MENSAL' || item.saleType === 'HOTEL')) {
      const existing = firstSaleByDog.get(sale.dogId)
      if (!existing || sale.saleDate < existing) firstSaleByDog.set(sale.dogId, sale.saleDate)
      dogsWithoutEnrollmentDate.delete(sale.dogId)
    }
    for (const [dogId, createdAt] of Array.from(dogsWithoutEnrollmentDate.entries())) {
      firstSaleByDog.set(dogId, createdAt)
    }

    const firstDate = [
      ...Array.from(firstSaleByDog.values()).map(value => value.toISOString().slice(0, 7)),
      ...attendance.map(entry => entry.date.slice(0, 7)),
    ].sort()[0]

    if (!firstDate) {
      return NextResponse.json({ monthly: [], summary: { totalEnrollments: 0, currentPayingDogs: 0, averagePayingDogsPerDay: 0 } })
    }

    const months = monthRange(firstDate, today.slice(0, 7))
    const dogDetails = new Map(dogs.map(dog => [dog.id, dog]))
    const enrollmentByMonth = new Map<string, Set<string>>()
    const activeMonthlyCrecheDogsByMonth = new Map<string, Set<string>>()
    const directBilledDogsByMonth = new Map<string, Set<string>>()
    const packageCoveredDogsByMonth = new Map<string, Set<string>>()
    const packageContractsByMonth = new Map<string, Set<string>>()
    const billedRevenueByMonth = new Map<string, number>()
    const presentDogsByMonth = new Map<string, Set<string>>()
    const presentPayingDogsByDay = new Map<string, Set<string>>()

    for (const [dogId, firstSale] of Array.from(firstSaleByDog.entries())) {
      const month = toMonth(firstSale)
      if (!enrollmentByMonth.has(month)) enrollmentByMonth.set(month, new Set())
      enrollmentByMonth.get(month)!.add(dogId)
    }

    for (const sale of datedSales) {
      if (sale.saleType !== 'MENSAL' || sale.paymentStatus !== 'PAGO') continue
      if (dogDetails.get(sale.dogId)?.serviceType !== 'CRECHE') continue
      const month = toMonth(sale.saleDate)
      if (!activeMonthlyCrecheDogsByMonth.has(month)) activeMonthlyCrecheDogsByMonth.set(month, new Set())
      activeMonthlyCrecheDogsByMonth.get(month)!.add(sale.dogId)
    }

    for (const sale of datedSales) {
      const month = toMonth(sale.saleDate)
      if (!directBilledDogsByMonth.has(month)) directBilledDogsByMonth.set(month, new Set())
      directBilledDogsByMonth.get(month)!.add(sale.dogId)
      if (sale.saleDate.toISOString().slice(0, 10) <= today) {
        billedRevenueByMonth.set(month, (billedRevenueByMonth.get(month) || 0) + sale.finalPrice)
      }
    }

    for (const entry of attendance) {
      const month = entry.date.slice(0, 7)
      if (!presentDogsByMonth.has(month)) presentDogsByMonth.set(month, new Set())
      presentDogsByMonth.get(month)!.add(entry.dogId)
      if (entry.packageId) {
        if (!packageCoveredDogsByMonth.has(month)) packageCoveredDogsByMonth.set(month, new Set())
        if (!packageContractsByMonth.has(month)) packageContractsByMonth.set(month, new Set())
        packageCoveredDogsByMonth.get(month)!.add(entry.dogId)
        packageContractsByMonth.get(month)!.add(entry.packageId)
      }
      const enrolledAt = firstSaleByDog.get(entry.dogId)
      if (enrolledAt && enrolledAt.toISOString().slice(0, 10) <= entry.date) {
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

      const directBilledDogs = directBilledDogsByMonth.get(month) || new Set<string>()
      const packageCoveredDogs = packageCoveredDogsByMonth.get(month) || new Set<string>()
      const payingCoveredDogs = new Set([...Array.from(directBilledDogs), ...Array.from(packageCoveredDogs)])
      const monthPresentDogs = presentDogsByMonth.get(month) || new Set<string>()
      const monthEnrolledDogs = enrollmentByMonth.get(month) || new Set<string>()
      const countedDogs = Array.from(monthEnrolledDogs)
        .map(id => {
          const dog = dogDetails.get(id)
          if (!dog) return null
          return {
            id,
            name: dog.name,
            ownerName: dog.ownerName,
            photoUrl: dog.photoUrl,
            enrolled: monthEnrolledDogs.has(id),
            present: monthPresentDogs.has(id),
            directSale: directBilledDogs.has(id),
            packageUse: packageCoveredDogs.has(id),
          }
        })
        .filter((dog): dog is NonNullable<typeof dog> => Boolean(dog))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

      return {
        month,
        label: monthLabel(month),
        enrollments,
        accumulatedEnrollments,
        activeMonthlyCrecheDogs: activeMonthlyCrecheDogsByMonth.get(month)?.size || 0,
        uniquePresentDogs: monthPresentDogs.size,
        directBilledDogs: directBilledDogs.size,
        packageCoveredDogs: packageCoveredDogs.size,
        uniqueBilledDogs: payingCoveredDogs.size,
        packageContractsUsed: packageContractsByMonth.get(month)?.size || 0,
        averagePayingDogsPerDay: workingDays ? Math.round((dailyPayingTotal / workingDays) * 100) / 100 : 0,
        workingDays,
        billedRevenue: Math.round((billedRevenueByMonth.get(month) || 0) * 100) / 100,
        payingDogDays: dailyPayingTotal,
        revenuePerPayingDogDay: dailyPayingTotal
          ? Math.round(((billedRevenueByMonth.get(month) || 0) / dailyPayingTotal) * 100) / 100
          : 0,
        dogs: countedDogs,
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
