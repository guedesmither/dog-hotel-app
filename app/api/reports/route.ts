import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const sessionUser = session.user as { role: string; tutorDogId?: string }

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo   = searchParams.get('dateTo')
  // TUTOR is always forced to their own dog regardless of query param
  const dogId = sessionUser.role === 'TUTOR'
    ? (sessionUser.tutorDogId ?? '')
    : searchParams.get('dogId')

  // Max 3 months back
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const minDate = threeMonthsAgo.toISOString().split('T')[0]

  const from = dateFrom && dateFrom >= minDate ? dateFrom : minDate
  const to   = dateTo   || new Date().toISOString().split('T')[0]

  const reports = await prisma.dailyReport.findMany({
    where: {
      date: { gte: from, lte: to },
      ...(dogId ? { dogId } : {}),
    },
    include: {
      dog:        { select: { id: true, name: true, breed: true, photoUrl: true, ownerName: true } },
      author:     { select: { name: true } },
      activities: true,
      photos:     true,
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(reports)
}
