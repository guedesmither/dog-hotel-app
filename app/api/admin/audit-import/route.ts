import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/audit-import — diagnóstico temporário para achar lançamentos
// que podem ter sido importados com o bug de tipo E/S invertido ou categoria
// ALUGUEL incorreta (colisão ELAINE/ROSELAINE).
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const entries = await prisma.financialEntry.findMany({
    where: {
      date: { gte: new Date('2026-05-01T00:00:00Z') },
    },
    orderBy: { date: 'desc' },
  })

  const suspicious: any[] = []

  for (const e of entries) {
    const text = `${e.description || ''} ${e.supplier || ''}`.toUpperCase()
    const isCartaoOrBoleto = text.includes('CARTAO') || text.includes('CARTÃO') || text.includes('BOLETO') || text.includes('PAGAMENTO EFETUADO')
    const isRecebido = text.includes('RECEBIDO')
    const isEnviado = text.includes('ENVIADO')

    const reasons: string[] = []

    // Cartão/Boleto deveriam ser sempre SAÍDA (S)
    if (isCartaoOrBoleto && e.type === 'E' && !text.includes('CASHBACK') && !text.includes('REEMBOLSO')) {
      reasons.push('Cartão/Boleto marcado como ENTRADA')
    }
    // Pix "Recebido" deveria ser ENTRADA (E)
    if (isRecebido && e.type === 'S') {
      reasons.push('"Recebido" marcado como SAÍDA')
    }
    // Pix "Enviado" deveria ser SAÍDA (S)
    if (isEnviado && e.type === 'E') {
      reasons.push('"Enviado" marcado como ENTRADA')
    }
    // Categoria ALUGUEL suspeita (colisão ROSELAINE)
    if (e.category === 'ALUGUEL' && !text.includes('ELAINE DUMAS')) {
      reasons.push('Categoria ALUGUEL suspeita (não é Elaine Dumas)')
    }

    if (reasons.length > 0) {
      suspicious.push({
        id: e.id,
        date: e.date.toISOString().split('T')[0],
        type: e.type,
        amount: e.amount,
        category: e.category,
        description: e.description,
        supplier: e.supplier,
        reasons,
      })
    }
  }

  return NextResponse.json({
    totalEntries: entries.length,
    suspiciousCount: suspicious.length,
    suspicious,
  })
}
