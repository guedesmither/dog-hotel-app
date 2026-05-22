const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const dog = await p.dog.findFirst({ where: { name: { contains: 'Betina' } } })
  const sales = await p.sales.findMany({
    where: { dogId: dog.id },
    orderBy: { saleDate: 'desc' },
    select: { id: true, saleType: true, startDate: true, endDate: true, saleDate: true, paymentStatus: true, manualBaixa: true }
  })
  console.log('Todas as vendas da Betina:')
  sales.forEach(s => console.log(JSON.stringify(s)))
  await p.$disconnect()
}
main().catch(console.error)
