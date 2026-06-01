import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { type, date, amount, account, supplier, description, category, notes } = body

  const INAUGURATION_DATE = new Date('2026-02-07')
  const entryDate = new Date(date)
  const period = entryDate < INAUGURATION_DATE
    ? 'PRE_INAUGURACAO'
    : `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`

  const entry = await prisma.financialEntry.update({
    where: { id: params.id },
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

  return NextResponse.json(entry)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.financialEntry.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
