import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const where = status ? { status } : {}

  const replacements = await prisma.replacement.findMany({
    where,
    orderBy: { billingMonthEnd: 'asc' },
    include: {
      dog: { select: { id: true, name: true, photoUrl: true, monthlyStartDay: true, scheduledDays: true, serviceType: true } },
    },
  })

  return NextResponse.json(replacements)
}
