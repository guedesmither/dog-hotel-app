import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
