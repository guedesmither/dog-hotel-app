import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string })?.role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') || '2026-06'

  const periodStart = new Date(`${month}-01T00:00:00.000Z`)
  const periodEnd = new Date(`${month}-30T23:59:59.999Z`)

  const sales = await prisma.sales.findMany({
    where: {
      saleDate: { gte: periodStart, lte: periodEnd },
      paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
      dogId: { not: null }
    },
    select: {
      id: true,
      saleType: true,
      saleDate: true,
      startDate: true,
      endDate: true,
      finalPrice: true,
      paymentStatus: true,
      dog: { select: { name: true } }
    },
    orderBy: { saleType: 'asc' }
  })

  const totals: Record<string, number> = {}
  const byType: Record<string, any[]> = {}
  let grand = 0

  for (const s of sales) {
    const t = s.saleType
    totals[t] = (totals[t] || 0) + (s.finalPrice || 0)
    grand += s.finalPrice || 0
    if (!byType[t]) byType[t] = []
    byType[t].push({
      dog: s.dog?.name,
      price: s.finalPrice,
      status: s.paymentStatus,
      saleDate: s.saleDate?.toISOString().split('T')[0],
      startDate: s.startDate?.toISOString().split('T')[0] ?? null,
      endDate: s.endDate?.toISOString().split('T')[0] ?? null,
    })
  }

  return NextResponse.json({ totals, grand, count: sales.length, byType })
}
