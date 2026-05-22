const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const baruc = await prisma.dog.findFirst({
    where: { name: { contains: 'Baruc' } },
    include: {
      packages: true,
      sales: {
        orderBy: { saleDate: 'desc' },
        take: 10,
        include: { items: { include: { product: true } } },
      },
    },
  })

  if (!baruc) { console.log('Baruc não encontrado'); return }

  console.log('=== Baruc ===')
  console.log('serviceType:', baruc.serviceType)
  console.log('scheduledDays:', baruc.scheduledDays)

  console.log('\n=== Todas as vendas ===')
  for (const s of baruc.sales) {
    console.log(`  ${s.saleType} | ${s.paymentStatus} | ${new Date(s.saleDate).toLocaleDateString('pt-BR')} | ${s.items.map(i => i.product?.name + ' (' + i.product?.category + ')').join(', ')}`)
  }

  console.log('\n=== Pacotes ===')
  for (const pk of baruc.packages) {
    console.log(`  isActive=${pk.isActive} | ${pk.remainingDays} dias | expira ${new Date(pk.expiryDate).toLocaleDateString('pt-BR')}`)
  }

  console.log('\n=== Roster recente ===')
  const roster = await prisma.dailyRoster.findMany({
    where: { dogId: baruc.id, date: { gte: '2026-05-01' } },
    orderBy: { date: 'asc' },
  })
  for (const r of roster) {
    console.log(`  ${r.date} | ${r.type} | present=${r.present} | source=${r.source}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
