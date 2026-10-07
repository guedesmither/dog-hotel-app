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
    const { amountReceived, paymentStatus, paymentDate, paymentMethod, paymentFee, saleDate, serviceDate, isExempt, startDate, endDate, discount, notes, basePrice, finalPrice, items } = body

    console.log('=== Atualizando venda ===')
    console.log('Sale ID:', params.id)
    console.log('Body:', body)

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ error: 'Data de fim não pode ser anterior à data de início' }, { status: 400 })
    }

    let normalizedItems: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number }> | undefined
    let updatedSaleType: string | undefined
    let selectedProducts: Array<{ id: string; category: string; name: string }> = []

    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'A venda deve possuir pelo menos um produto' }, { status: 400 })
      }

      normalizedItems = items.map((item: any) => ({
        productId: typeof item.productId === 'string' ? item.productId : '',
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.quantity) * Number(item.unitPrice),
      }))

      if (normalizedItems.some(item => !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
        return NextResponse.json({ error: 'Produto, quantidade ou valor inválido' }, { status: 400 })
      }

      const productIds = Array.from(new Set(normalizedItems.map(item => item.productId)))
      selectedProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, category: true, name: true },
      })
      if (selectedProducts.length !== productIds.length) {
        return NextResponse.json({ error: 'Um ou mais produtos não foram encontrados' }, { status: 400 })
      }

      const categories = normalizedItems.map(item => selectedProducts.find(product => product.id === item.productId)?.category)
      updatedSaleType = categories.includes('HOTEL')
        ? 'HOTEL'
        : categories.includes('CRECHE')
          ? 'MENSAL'
          : categories.includes('PACOTE')
            ? 'PACOTE'
            : 'AVULSO'

      if (updatedSaleType === 'AVULSO') {
        const hasCrecheByName = normalizedItems.some(item => {
          const name = selectedProducts.find(product => product.id === item.productId)?.name.toLowerCase() || ''
          return (name.includes('creche') || name.includes('mensal')) && !name.includes('pacote')
        })
        if (hasCrecheByName) updatedSaleType = 'MENSAL'
      }
    }

    const effectiveAmountReceived = paymentStatus === 'PENDENTE' || paymentStatus === 'PROGRAMADA'
      ? null
      : (amountReceived !== undefined ? amountReceived : undefined)

    const sale = await prisma.$transaction(async tx => {
      const updatedSale = await tx.sales.update({
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
          saleType: updatedSaleType,
          items: normalizedItems
            ? {
                deleteMany: {},
                create: normalizedItems,
              }
            : undefined,
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

      if (normalizedItems) {
        const existingPackage = await tx.package.findUnique({ where: { saleId: params.id } })
        if (updatedSale.saleType === 'PACOTE' && updatedSale.dogId) {
          const packageProduct = selectedProducts.find(product => product.category === 'PACOTE') || selectedProducts[0]
          const daysMatch = packageProduct?.name.match(/(\d+)\s*Dia/i)
          const totalDays = daysMatch ? parseInt(daysMatch[1], 10) : 10
          const usedDays = existingPackage
            ? await tx.dailyRoster.count({ where: { packageId: existingPackage.id } })
            : 0
          const remainingDays = Math.max(totalDays - usedDays, 0)
          const expiryDate = updatedSale.endDate || existingPackage?.expiryDate || (() => {
            const date = new Date(updatedSale.saleDate)
            date.setMonth(date.getMonth() + 6)
            return date
          })()

          if (existingPackage) {
            await tx.package.update({
              where: { id: existingPackage.id },
              data: {
                dogId: updatedSale.dogId,
                packageType: `AVULSO_${totalDays}`,
                totalDays,
                remainingDays,
                purchaseDate: updatedSale.saleDate,
                expiryDate,
                pricePaid: updatedSale.finalPrice,
                isActive: remainingDays > 0,
              },
            })
          } else {
            await tx.package.create({
              data: {
                dogId: updatedSale.dogId,
                saleId: updatedSale.id,
                packageType: `AVULSO_${totalDays}`,
                totalDays,
                remainingDays,
                purchaseDate: updatedSale.saleDate,
                expiryDate,
                pricePaid: updatedSale.finalPrice,
                isActive: remainingDays > 0,
              },
            })
          }
        } else if (existingPackage?.isActive) {
          await tx.package.update({ where: { id: existingPackage.id }, data: { isActive: false } })
        }
      }

      return updatedSale
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
