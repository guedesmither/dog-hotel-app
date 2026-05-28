import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/sales/last-price?dogId=X&productId=Y
// Returns the last unitPrice charged for a product+dog combination
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dogId = searchParams.get('dogId')
  const productId = searchParams.get('productId')

  if (!dogId || !productId) {
    return NextResponse.json({ error: 'dogId e productId são obrigatórios' }, { status: 400 })
  }

  const lastItem = await prisma.saleItem.findFirst({
    where: {
      productId,
      sale: { dogId },
    },
    orderBy: { sale: { saleDate: 'desc' } },
    select: {
      unitPrice: true,
      sale: { select: { saleDate: true, discount: true, finalPrice: true, basePrice: true } },
    },
  })

  if (!lastItem) return NextResponse.json(null)

  return NextResponse.json({
    unitPrice: lastItem.unitPrice,
    saleDate: lastItem.sale.saleDate,
    discount: lastItem.sale.discount ?? 0,
    finalPrice: lastItem.sale.finalPrice,
    basePrice: lastItem.sale.basePrice,
  })
}
