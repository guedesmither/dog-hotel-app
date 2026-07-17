const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    const body = {
      saleDate: new Date().toISOString(),
      finalPrice: 640,
      discount: 0,
      isExempt: false,
      amountReceived: null,
      paymentStatus: 'PROGRAMADA',
      paymentDate: null,
      paymentMethod: null,
      paymentFee: 0,
      notes: null,
      dogId: 'cmox5zg5y000cgnqsyrwxg8sh',
      saleStartDate: '2026-07-21',
      saleEndDate: '2026-08-20',
      items: [
        {
          productId: 'cmox6srmh0001i2mh81qas517',
          quantity: 1,
          unitPrice: 640,
        }
      ]
    }

    // Replicate POST /api/sales logic
    if (body.saleStartDate && body.saleEndDate && new Date(body.saleStartDate) > new Date(body.saleEndDate)) {
      throw new Error('Data de fim não pode ser anterior à data de início')
    }

    const saleType = 'MENSAL'

    const sale = await prisma.sales.create({
      data: {
        saleDate: body.saleDate ? new Date(body.saleDate) : new Date(),
        finalPrice: body.finalPrice || 0,
        basePrice: body.finalPrice || 0,
        discount: body.discount || 0,
        isExempt: body.isExempt || false,
        amountReceived: (body.paymentStatus === 'PENDENTE' || body.paymentStatus === 'PROGRAMADA') ? null : (body.amountReceived ?? body.finalPrice ?? 0),
        paymentStatus: body.paymentStatus || 'PAGO',
        paymentDate: body.paymentDate ? (typeof body.paymentDate === 'string' ? body.paymentDate : new Date(body.paymentDate).toISOString()) : null,
        paymentMethod: body.paymentMethod || null,
        paymentFee: body.paymentFee || 0,
        notes: body.notes || null,
        dogId: body.dogId || null,
        saleType: saleType,
        startDate: body.saleStartDate ? new Date(body.saleStartDate) : null,
        endDate: body.saleEndDate ? new Date(body.saleEndDate) : null,
        items: {
          create: body.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        dog: { select: { id: true, name: true, ownerName: true, ownerCpf: true, matricula: true } },
        items: { include: { product: true } },
      },
    })

    console.log('Venda criada:', sale.id)
    console.log(JSON.stringify({
      id: sale.id,
      saleType: sale.saleType,
      paymentStatus: sale.paymentStatus,
      startDate: sale.startDate,
      endDate: sale.endDate,
      finalPrice: sale.finalPrice,
    }, null, 2))
  } catch (error) {
    console.error('Erro ao criar venda:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

main()
