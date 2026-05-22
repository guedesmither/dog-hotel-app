const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
p.sales.findMany({
  where: {
    dog: { name: { contains: 'Lara' } },
    saleDate: { gte: new Date('2026-05-13'), lte: new Date('2026-05-14') }
  },
  select: { id: true, saleDate: true, basePrice: true, finalPrice: true, discount: true, items: { include: { product: true } } }
}).then(r => console.log(JSON.stringify(r, null, 2))).finally(() => p.$disconnect())
