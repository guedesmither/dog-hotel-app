import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/sales/renewals — mensalidades vencidas ou a vencer nos próximos N dias
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '10', 10)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + days)

  // Find dismissed sale IDs to exclude
  const dismissed = await prisma.renewalDismissal.findMany({ select: { saleId: true } })
  const dismissedIds = new Set(dismissed.map(d => d.saleId))

  // Find active MENSAL sales whose endDate is within horizon or already past
  // and have no renewal already created (no MENSAL sale starting after their endDate for same dog+product)
  const expiringSales = await prisma.sales.findMany({
    where: {
      saleType: 'MENSAL',
      endDate: { lte: horizon },
      paymentStatus: { not: 'CANCELADO' },
      id: { notIn: Array.from(dismissedIds) },
    },
    include: {
      dog: { select: { id: true, name: true, photoUrl: true, ownerName: true } },
      items: { include: { product: { select: { id: true, name: true, category: true } } } },
    },
    orderBy: { endDate: 'asc' },
  })

  // For each, check if a renewal already exists (MENSAL sale with startDate after this endDate for same dog)
  const results = await Promise.all(expiringSales.map(async (sale) => {
    if (!sale.endDate || !sale.dogId) return null

    const saleEndDate = new Date(sale.endDate)
    saleEndDate.setHours(12, 0, 0, 0)

    // Check if any MENSAL sale exists for this dog that starts after or overlaps with this period
    // Also check by saleDate (sales created after the endDate of current period)
    const renewal = await prisma.sales.findFirst({
      where: {
        dogId: sale.dogId,
        saleType: 'MENSAL',
        id: { not: sale.id },
        paymentStatus: { not: 'CANCELADO' },
        OR: [
          { startDate: { gt: saleEndDate } },
          { saleDate: { gt: saleEndDate } },
        ],
      },
    })

    if (renewal) return null // already renewed

    const daysUntilExpiry = Math.ceil((new Date(sale.endDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const isOverdue = daysUntilExpiry < 0

    // Calculate next period
    const endDate = new Date(sale.endDate)
    endDate.setHours(12, 0, 0, 0)
    const suggestedStart = new Date(endDate)
    suggestedStart.setDate(suggestedStart.getDate() + 1)
    const suggestedEnd = new Date(suggestedStart)
    suggestedEnd.setMonth(suggestedEnd.getMonth() + 1)
    suggestedEnd.setDate(suggestedEnd.getDate() - 1)

    return {
      id: sale.id,
      dogId: sale.dogId,
      dog: sale.dog,
      endDate: sale.endDate,
      daysUntilExpiry,
      isOverdue,
      finalPrice: sale.finalPrice,
      basePrice: sale.basePrice,
      discount: sale.discount ?? 0,
      items: sale.items,
      suggestedStart: suggestedStart.toISOString().split('T')[0],
      suggestedEnd: suggestedEnd.toISOString().split('T')[0],
    }
  }))

  return NextResponse.json(results.filter(Boolean))
}

// POST /api/sales/renewals — create PROGRAMADA renewals for selected sales
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'TUTOR' || role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json()
  // Support both { items: [{saleId, start, end}] } and legacy { saleIds: [...] }
  const items: Array<{ saleId: string; start?: string; end?: string }> =
    body.items ?? (body.saleIds as string[]).map((id: string) => ({ saleId: id }))

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'items obrigatório' }, { status: 400 })
  }

  const originals = await prisma.sales.findMany({
    where: { id: { in: items.map(i => i.saleId) } },
    include: { items: true },
  })

  const created = await Promise.all(originals.map(async (sale) => {
    if (!sale.endDate) return null

    const customDates = items.find(i => i.saleId === sale.id)
    let newStart: Date
    let newEnd: Date

    if (customDates?.start && customDates?.end) {
      newStart = new Date(customDates.start + 'T12:00:00')
      newEnd = new Date(customDates.end + 'T12:00:00')
    } else {
      const endDate = new Date(sale.endDate)
      endDate.setHours(12, 0, 0, 0)
      newStart = new Date(endDate)
      newStart.setDate(newStart.getDate() + 1)
      newEnd = new Date(newStart)
      newEnd.setMonth(newEnd.getMonth() + 1)
      newEnd.setDate(newEnd.getDate() - 1)
    }

    return prisma.sales.create({
      data: {
        saleDate: newStart,
        saleType: 'MENSAL',
        basePrice: sale.basePrice,
        discount: sale.discount,
        finalPrice: sale.finalPrice,
        amountReceived: 0,
        paymentStatus: 'PROGRAMADA',
        paymentFee: sale.paymentFee,
        isExempt: sale.isExempt,
        notes: sale.notes,
        dogId: sale.dogId,
        startDate: newStart,
        endDate: newEnd,
        items: {
          create: sale.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
    })
  }))

  return NextResponse.json({ created: created.filter(Boolean).length })
}

// DELETE /api/sales/renewals — permanently dismiss a renewal from the panel
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'TUTOR' || role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const saleId = searchParams.get('saleId')
  if (!saleId) return NextResponse.json({ error: 'saleId obrigatório' }, { status: 400 })

  await prisma.renewalDismissal.upsert({
    where: { saleId },
    create: { saleId },
    update: {},
  })

  return NextResponse.json({ ok: true })
}
