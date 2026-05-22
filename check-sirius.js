const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const dog = await p.dog.findFirst({ where: { name: { contains: 'Sirius' } }, select: { id: true, name: true } })
  console.log('Dog:', dog)
  const sales = await p.sales.findMany({
    where: { dogId: dog.id },
    orderBy: { saleDate: 'desc' },
    take: 5,
    select: { id: true, saleDate: true, saleType: true, paymentStatus: true, startDate: true, endDate: true, basePrice: true, finalPrice: true, discount: true, manualBaixa: true }
  })
  console.log('Vendas:', JSON.stringify(sales, null, 2))
}
main().catch(console.error).finally(() => p.$disconnect())
