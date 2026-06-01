import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') // YYYY-MM ou PRE_INAUGURACAO ou undefined (todos)
  const type = searchParams.get('type') // ENTRADA ou SAIDA ou undefined

  const where: Record<string, unknown> = {}
  if (period) where.period = period
  if (type) where.type = type

  const entries = await prisma.financialEntry.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { type, date, amount, account, supplier, description, category, notes } = body

  if (!type || !date || !amount || !account || !category) {
    return NextResponse.json({ error: 'Campos obrigatórios: type, date, amount, account, category' }, { status: 400 })
  }

  const INAUGURATION_DATE = new Date('2026-02-07')
  const entryDate = new Date(date)
  const period = entryDate < INAUGURATION_DATE
    ? 'PRE_INAUGURACAO'
    : `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`

  const entry = await prisma.financialEntry.create({
    data: {
      type,
      date: entryDate,
      amount: Math.abs(parseFloat(amount)),
      account,
      supplier: supplier || null,
      description: description || null,
      category,
      period,
      notes: notes || null,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
