import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/sales/renewals/cleanup
// Remove PROGRAMADA MENSAL sales created today (duplicates from auto-renewal)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'TUTOR' || role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Find all PROGRAMADA MENSAL sales created today
  const toDelete = await prisma.sales.findMany({
    where: {
      saleType: 'MENSAL',
      paymentStatus: 'PROGRAMADA',
      saleDate: { gte: today, lt: tomorrow },
    },
    select: { id: true, dogId: true, startDate: true, endDate: true, finalPrice: true },
  })

  if (toDelete.length === 0) {
    return NextResponse.json({ deleted: 0, message: 'Nenhuma venda encontrada para remover' })
  }

  // Delete sale items first, then sales
  await prisma.saleItem.deleteMany({
    where: { saleId: { in: toDelete.map(s => s.id) } },
  })
  await prisma.sales.deleteMany({
    where: { id: { in: toDelete.map(s => s.id) } },
  })

  return NextResponse.json({
    deleted: toDelete.length,
    sales: toDelete,
  })
}

// GET — preview what would be deleted
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const toDelete = await prisma.sales.findMany({
    where: {
      saleType: 'MENSAL',
      paymentStatus: 'PROGRAMADA',
      saleDate: { gte: today, lt: tomorrow },
    },
    include: {
      dog: { select: { name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  })

  return NextResponse.json({ count: toDelete.length, sales: toDelete })
}
