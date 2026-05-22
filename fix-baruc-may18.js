const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const dog = await p.dog.findFirst({ where: { name: { contains: 'Baruc' } }, select: { id: true, name: true } })
  console.log('Dog:', dog)

  // Find product "1 Dia" AVULSO
  const product = await p.product.findFirst({ where: { name: { contains: '1 Dia' }, category: 'AVULSO' } })
  console.log('Produto:', product)

  // Create exempt sale for May 18
  const sale = await p.sales.create({
    data: {
      dogId: dog.id,
      saleType: 'AVULSO',
      saleDate: new Date('2026-05-18T12:00:00'),
      serviceDate: new Date('2026-05-18T12:00:00'),
      basePrice: 0,
      finalPrice: 0,
      discount: 0,
      isExempt: true,
      paymentStatus: 'PAGO',
      amountReceived: 0,
      items: {
        create: [{
          productId: product.id,
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
        }]
      }
    }
  })
  console.log('Venda criada:', sale.id)

  // Add to roster for May 18
  const roster = await p.dailyRoster.upsert({
    where: { dogId_date: { dogId: dog.id, date: '2026-05-18' } },
    update: { source: 'MANUAL', type: 'AVULSO' },
    create: { dogId: dog.id, date: '2026-05-18', source: 'MANUAL', type: 'AVULSO', present: true, isPernoite: false },
  })
  console.log('Agenda adicionada:', roster.date, roster.type)
}
main().catch(console.error).finally(() => p.$disconnect())
