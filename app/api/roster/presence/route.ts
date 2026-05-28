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
    endDate = new Date(date.getFullYear(), date.getMonth() + 1, startDay - 1)
  } else {
    endDate = new Date(date.getFullYear(), date.getMonth(), startDay - 1)
  }
  return endDate.toISOString().split('T')[0]
}

// PATCH /api/roster/presence  { dogId, date, present: boolean }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { id: string; role: string }).role
  const userId = (session.user as { id: string; role: string }).id
  if (role === 'TUTOR') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { dogId, date, present, entryType } = await req.json() as { dogId: string; date: string; present: boolean | null; entryType?: string }

  // 1. Upsert roster entry presence flag (creates entry if not seeded yet)
  await prisma.dailyRoster.upsert({
    where: { dogId_date: { dogId, date } },
    update: { present },
    create: { dogId, date, present },
  })

  // 1.5. If marking present (true), check if there's a scheduled stay and auto-confirm it
  if (present === true) {
    const today = new Date().toISOString().split('T')[0]
    if (date === today) {
      const scheduledStay = await prisma.stay.findFirst({
        where: {
          dogId,
          isScheduled: true,
          scheduledCheckIn: { lte: new Date(date + 'T23:59:59') },
          OR: [
            { scheduledCheckOut: { gte: new Date(date + 'T00:00:00') } },
            { scheduledCheckOut: null }
          ]
        }
      })
      if (scheduledStay) {
        await prisma.stay.update({
          where: { id: scheduledStay.id },
          data: {
            active: true,
            isScheduled: false,
            checkIn: new Date(),
          }
        })
      }
    }
  }

  // 2. Sync DailyReport and Replacement based on presence value
  const isHotelOrReposicao = entryType === 'HOTEL' || entryType === 'REPOSICAO'
  if (present === false) {
    // Marking absent — upsert report with absent=true
    await prisma.dailyReport.upsert({
      where: { dogId_date: { dogId, date } },
      update: { absent: true },
      create: { dogId, date, authorId: userId, absent: true },
    })
    // Only create replacement for MENSAL/CRECHE dogs (not Hotel or Reposicao)
    if (isHotelOrReposicao) {
      return NextResponse.json({ success: true })
    }
    const dog = await prisma.dog.findUnique({
      where: { id: dogId },
      select: {
        monthlyStartDay: true,
        isBolsista: true,
        sales: {
          where: { saleType: 'MENSAL' },
          orderBy: { startDate: 'asc' },
        },
      },
    })
    // Bolsistas have free schedule access — no replacement needed
    if (dog?.isBolsista) {
      return NextResponse.json({ success: true })
    }
    // Find the sale whose period covers the absent date
    const absentDateObj = new Date(date + 'T12:00:00')
    const coveringSale = (dog as any)?.sales?.find((s: any) => {
      if (!s.startDate || !s.endDate) return false
      const start = new Date(s.startDate)
      const end = new Date(s.endDate)
      return absentDateObj >= start && absentDateObj <= end
    })
    // Fallback: most recent paid/pending sale before absent date
    const fallbackSale = (dog as any)?.sales?.filter((s: any) =>
      ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'].includes(s.paymentStatus) &&
      s.startDate && new Date(s.startDate) <= absentDateObj
    ).sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]
    const activeSale = coveringSale || fallbackSale
    const saleEndDate = activeSale?.endDate ? new Date(activeSale.endDate).toISOString().split('T')[0] : null
    const billingMonthEnd = getBillingMonthEnd(dog?.monthlyStartDay ?? null, date, saleEndDate)
    await prisma.replacement.upsert({
      where: { dogId_absentDate: { dogId, absentDate: date } },
      update: { status: 'PENDING', billingMonthEnd },
      create: { dogId, absentDate: date, billingMonthEnd, status: 'PENDING' },
    })
  } else if (present === true) {
    // Marking present — clear absent flag and remove pending replacement
    await prisma.dailyReport.updateMany({
      where: { dogId, date, absent: true },
      data: { absent: false },
    })
    await prisma.replacement.deleteMany({
      where: { dogId, absentDate: date, status: 'PENDING' },
    })
  }
  // present === null: hotel dog unconfirm — roster already updated, no report/replacement changes

  return NextResponse.json({ success: true })
}
