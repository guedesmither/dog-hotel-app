import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/prices?yearMonth=2026-05
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const yearMonth = searchParams.get('yearMonth')

  if (yearMonth) {
    const prices = await prisma.priceTable.findMany({
      where: { yearMonth },
      orderBy: { frequencyDays: 'asc' },
    })
    return NextResponse.json(prices)
  }

  // Get all unique yearMonths
  const allPrices = await prisma.priceTable.findMany({
    orderBy: { yearMonth: 'desc' },
    select: { yearMonth: true },
    distinct: ['yearMonth'],
  })
  
  return NextResponse.json(allPrices.map((p: {yearMonth: string}) => p.yearMonth))
}

// POST /api/prices
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'MONITOR' || role === 'TUTOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const data = await req.json()
  const { yearMonth, frequencyDays, monthlyPrice, dailyPrice, isHalfDay = false, priceType = 'MONTHLY', packageType = null } = data

  const price = await prisma.priceTable.upsert({
    where: {
      yearMonth_frequencyDays_isHalfDay_priceType_packageType: { yearMonth, frequencyDays, isHalfDay, priceType, packageType },
    },
    update: { monthlyPrice, dailyPrice },
    create: { yearMonth, frequencyDays, isHalfDay, monthlyPrice, dailyPrice, priceType, packageType },
  })

  return NextResponse.json(price, { status: 201 })
}

// DELETE /api/prices?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
  }

  await prisma.priceTable.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
