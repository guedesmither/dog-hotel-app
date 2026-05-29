import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/sales/fix-dates
// Fix saleDate to match startDate for PROGRAMADA/MENSAL sales where they differ
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'TUTOR' || role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Find PROGRAMADA sales where saleDate != startDate
  const sales = await prisma.sales.findMany({
    where: {
      paymentStatus: 'PROGRAMADA',
      startDate: { not: null },
    },
    select: { id: true, saleDate: true, startDate: true, dog: { select: { name: true } } },
  })

  const toFix = sales.filter(s => {
    if (!s.startDate) return false
    const saleDate = new Date(s.saleDate).toISOString().split('T')[0]
    const startDate = new Date(s.startDate).toISOString().split('T')[0]
    return saleDate !== startDate
  })

  if (toFix.length === 0) {
    return NextResponse.json({ fixed: 0, message: 'Nenhuma venda para corrigir' })
  }

  // Update each sale
  const updated = await Promise.all(toFix.map(async (sale) => {
    await prisma.sales.update({
      where: { id: sale.id },
      data: { saleDate: sale.startDate! },
    })
    return { id: sale.id, dog: sale.dog?.name, from: sale.saleDate, to: sale.startDate }
  }))

  return NextResponse.json({ fixed: updated.length, sales: updated })
}

// GET - preview what would be fixed
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const sales = await prisma.sales.findMany({
    where: {
      paymentStatus: 'PROGRAMADA',
      startDate: { not: null },
    },
    select: { id: true, saleDate: true, startDate: true, dog: { select: { name: true } } },
  })

  const toFix = sales.filter(s => {
    if (!s.startDate) return false
    const saleDate = new Date(s.saleDate).toISOString().split('T')[0]
    const startDate = new Date(s.startDate).toISOString().split('T')[0]
    return saleDate !== startDate
  })

  return NextResponse.json({ count: toFix.length, sales: toFix })
}
