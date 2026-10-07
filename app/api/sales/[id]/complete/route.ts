import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/sales/[id]/complete - Undo manual baixa (reopen service)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const sale = await prisma.sales.findUnique({ where: { id: params.id } })
    if (!sale) return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    if (!sale.manualBaixa) return NextResponse.json({ error: 'Esta venda não está baixada' }, { status: 400 })

    const updatedSale = await prisma.sales.update({
      where: { id: params.id },
      data: { manualBaixa: false, manualBaixaDate: null },
    })

    return NextResponse.json(updatedSale)
  } catch (error: any) {
    console.error('Erro ao desfazer baixa:', error)
    return NextResponse.json({ error: 'Erro ao desfazer baixa', details: error.message }, { status: 500 })
  }
}

// POST /api/sales/[id]/complete - Mark sale as manually completed (baixa)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== Iniciando baixa manual ===')
    console.log('Sale ID:', params.id)
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('Sessão não encontrada')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    console.log('Sessão OK')

    const sale = await prisma.sales.findUnique({
      where: { id: params.id },
      include: {
        package: { select: { id: true } },
        items: { select: { product: { select: { name: true } } } },
      },
    })

    if (!sale) {
      console.log('Venda não encontrada')
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 })
    }
    console.log('Venda encontrada:', sale.id, 'manualBaixa atual:', sale.manualBaixa)

    console.log('Tentando atualizar venda...')
    const updatedSale = await prisma.sales.update({
      where: { id: params.id },
      data: { 
        manualBaixa: true,
        manualBaixaDate: new Date(),
      },
    })

    if (sale.saleType === 'PACOTE' && sale.dogId && !sale.package) {
      const productName = sale.items[0]?.product?.name || ''
      const daysMatch = productName.match(/(\d+)\s*Dia/i)
      const saleDays = daysMatch ? parseInt(daysMatch[1], 10) : null
      const legacyPackages = await prisma.package.findMany({
        where: { dogId: sale.dogId, saleId: null },
      })
      const match = legacyPackages
        .map(pkg => {
          const priceDifference = Math.abs(pkg.pricePaid - sale.finalPrice)
          const dateDifference = Math.abs(pkg.purchaseDate.getTime() - sale.saleDate.getTime())
          const compatible = pkg.totalDays === saleDays || priceDifference < 0.01
          return { pkg, score: compatible ? dateDifference + priceDifference : Number.POSITIVE_INFINITY }
        })
        .sort((a, b) => a.score - b.score)[0]
      if (match && Number.isFinite(match.score)) {
        await prisma.package.update({ where: { id: match.pkg.id }, data: { saleId: sale.id } })
      }
    }

    console.log('Venda atualizada com sucesso, manualBaixa:', updatedSale.manualBaixa)
    return NextResponse.json(updatedSale)
  } catch (error: any) {
    console.error('Erro ao marcar venda como baixada manualmente:', error)
    console.error('Erro code:', error.code)
    console.error('Erro message:', error.message)
    return NextResponse.json({ 
      error: 'Erro ao marcar venda como baixada', 
      details: error.message,
      code: error.code 
    }, { status: 500 })
  }
}
