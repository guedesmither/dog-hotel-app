import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/sales/[id] - Update a sale
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

  try {
    const body = await req.json()
    const { amountReceived, paymentStatus, paymentDate, paymentMethod, paymentFee, saleDate, serviceDate, isExempt, startDate, endDate, discount, notes, basePrice, finalPrice } = body

    console.log('=== Atualizando venda ===')
    console.log('Sale ID:', params.id)
    console.log('Body:', body)

    const effectiveAmountReceived = paymentStatus === 'PENDENTE' || paymentStatus === 'PROGRAMADA'
      ? null
      : (amountReceived !== undefined ? amountReceived : undefined)

    const sale = await prisma.sales.update({
      where: { id: params.id },
      data: {
        amountReceived: effectiveAmountReceived,
        paymentStatus: paymentStatus !== undefined ? paymentStatus : undefined,
        paymentDate: paymentDate !== undefined ? (paymentDate ? String(paymentDate) : null) : undefined,
        paymentMethod: paymentMethod !== undefined ? paymentMethod : undefined,
        paymentFee: paymentFee !== undefined ? paymentFee : undefined,
        saleDate: saleDate ? new Date(saleDate + 'T12:00:00') : undefined,
        serviceDate: serviceDate !== undefined ? (serviceDate ? new Date(serviceDate + 'T12:00:00') : null) : undefined,
        isExempt: isExempt !== undefined ? isExempt : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate + 'T12:00:00') : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate + 'T12:00:00') : null) : undefined,
        discount: discount !== undefined ? discount : undefined,
        notes: notes !== undefined ? notes : undefined,
        basePrice: basePrice !== undefined ? basePrice : undefined,
        finalPrice: finalPrice !== undefined ? finalPrice : undefined,
      },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            ownerName: true,
            ownerCpf: true,
            matricula: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    console.log('Venda atualizada com sucesso:', sale.id)
    return NextResponse.json(sale)
  } catch (error: any) {
    console.error('Erro ao atualizar venda:', error)
    console.error('Detalhes do erro:', error.message)
    console.error('Stack:', error.stack)
    return NextResponse.json({ error: 'Erro ao atualizar venda', details: error.message }, { status: 500 })
  }
}

// DELETE /api/sales/[id] - Delete a sale
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

  await prisma.sales.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
