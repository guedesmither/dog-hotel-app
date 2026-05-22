import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/products/[id] - Update a product
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'TUTOR' || role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { name, description, category, price } = await req.json()

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      name: name || undefined,
      description: description !== undefined ? description : undefined,
      category: category || undefined,
      price: price !== undefined ? parseFloat(price) : undefined,
    },
  })

  return NextResponse.json(product)
}

// DELETE /api/products/[id] - Delete a product
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'TUTOR' || role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await prisma.product.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
