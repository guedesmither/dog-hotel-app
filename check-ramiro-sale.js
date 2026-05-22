const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const dog = await p.dog.findFirst({
    where: { name: { contains: 'Ramiro' } },
    include: {
      sales: {
        orderBy: { saleDate: 'desc' },
        take: 5,
        include: { items: { include: { product: true } } }
      }
    }
  })
  console.log('Dog:', dog?.name)
  dog?.sales.forEach(s => {
    console.log({
      id: s.id,
      saleType: s.saleType,
      saleDate: s.saleDate,
      startDate: s.startDate,
      endDate: s.endDate,
      paymentStatus: s.paymentStatus,
      manualBaixa: s.manualBaixa,
      manualBaixaDate: s.manualBaixaDate,
    })
  })
  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
