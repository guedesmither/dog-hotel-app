import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/products - List all products
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { category: 'asc' },
  })

  return NextResponse.json(products)
}

// POST /api/products - Create a new product
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'TUTOR' || role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { name, description, category, price } = await req.json()

  const product = await prisma.product.create({
    data: {
      name,
      description: description || null,
      category,
      price: parseFloat(price),
    },
  })

  return NextResponse.json(product, { status: 201 })
}
