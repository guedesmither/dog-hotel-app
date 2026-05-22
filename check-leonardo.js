const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const dog = await prisma.dog.findFirst({
    where: { name: { contains: 'Leonardo' } },
    include: {
      sales: { orderBy: { saleDate: 'asc' }, include: { items: { include: { product: true } } } }
    }
  })
  if (!dog) { console.log('Não encontrado'); return }
  console.log('=== Leonardo ===')
  console.log('dogStatus:', dog.dogStatus, '| scheduledDays:', dog.scheduledDays)

  const roster = await prisma.dailyRoster.findMany({
    where: { dogId: dog.id },
    orderBy: { date: 'asc' }
  })
  console.log('\n=== Todas as entradas na agenda ===')
  roster.forEach(r => console.log(`  ${r.date} | ${r.source} | ${r.type} | present:${r.present}`))

  console.log('\n=== Vendas ===')
  for (const s of dog.sales) {
    console.log(`  ${s.saleType} | ${s.paymentStatus} | ${new Date(s.saleDate).toLocaleDateString('pt-BR')} | start:${s.startDate||'-'} end:${s.endDate||'-'}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
