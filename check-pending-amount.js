const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
p.sales.findMany({
  where: { paymentStatus: 'PENDENTE', amountReceived: { gt: 0 } },
  select: { id: true, saleDate: true, paymentStatus: true, basePrice: true, finalPrice: true, discount: true, amountReceived: true, dog: { select: { name: true } } },
  orderBy: { saleDate: 'desc' },
  take: 10
}).then(r => {
  console.log(`Total com problema: verificando...`)
  console.log(JSON.stringify(r, null, 2))
}).finally(() => p.$disconnect())
