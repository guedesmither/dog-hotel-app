import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

function getBillingMonthEnd(monthlyStartDay: number | null, absentDate: string, saleEndDate?: string | null): string {
  // Prefer explicit sale endDate if provided
  if (saleEndDate) {
    return new Date(saleEndDate).toISOString().split('T')[0]
  }
  const date = new Date(absentDate + 'T12:00:00')
  const startDay = monthlyStartDay || 1
  const day = date.getDate()
  let endDate: Date
  if (startDay === 1) {
    endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  } else if (day >= startDay) {
    // Absent date is within current billing period: end = day before startDay next month
    endDate = new Date(date.getFullYear(), date.getMonth() + 1, startDay - 1)
  } else {
    // Absent date is before startDay this month: end = day before startDay this month
    endDate = new Date(date.getFullYear(), date.getMonth(), startDay - 1)
  }
  return endDate.toISOString().split('T')[0]
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const sessionUser = session.user as { id: string; role: string }
  if (sessionUser.role === 'TUTOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { absent, date: dateParam } = await req.json()
  const isAbsent = absent ?? true
  const targetDate = dateParam || getTodayString()

  const report = await prisma.dailyReport.upsert({
    where: { dogId_date: { dogId: params.id, date: targetDate } },
    update: { absent: isAbsent },
    create: {
      dogId: params.id,
      date: targetDate,
      authorId: sessionUser.id,
      absent: isAbsent,
    },
  })

  // Replacement only applies if dog was in the roster for that date (= subscription model)
  const [dog, rosterEntry] = await Promise.all([
    prisma.dog.findUnique({
      where: { id: params.id },
      select: {
        monthlyStartDay: true,
        name: true,
        sales: {
          where: { paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] }, saleType: 'MENSAL' },
          orderBy: { saleDate: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.dailyRoster.findUnique({
      where: { dogId_date: { dogId: params.id, date: targetDate } },
    }),
  ])

  // BANHO entries are standalone walk-in services — never generate replacements
  const isSubscription = !!rosterEntry && rosterEntry.type !== 'BANHO'

  if (isAbsent && isSubscription) {
    const activeSale = (dog as any)?.sales?.[0]
    const saleEndDate = activeSale?.endDate ? new Date(activeSale.endDate).toISOString().split('T')[0] : null
    const billingMonthEnd = getBillingMonthEnd(dog?.monthlyStartDay ?? null, targetDate, saleEndDate)
    await prisma.replacement.upsert({
      where: { dogId_absentDate: { dogId: params.id, absentDate: targetDate } },
      update: { status: 'PENDING', billingMonthEnd },
      create: { dogId: params.id, absentDate: targetDate, billingMonthEnd, status: 'PENDING' },
    })
  } else if (!isAbsent) {
    await prisma.replacement.deleteMany({
      where: { dogId: params.id, absentDate: targetDate, status: 'PENDING' },
    })
    // Also sync roster present flag if entry exists
    await prisma.dailyRoster.updateMany({
      where: { dogId: params.id, date: targetDate },
      data: { present: true },
    })
  }

  return NextResponse.json(report)
}
