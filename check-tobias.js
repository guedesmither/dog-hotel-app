const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const tobias = await prisma.dog.findFirst({
    where: { name: { contains: 'Tobias' } },
    include: {
      packages: true,
      sales: {
        orderBy: { saleDate: 'desc' },
        take: 10,
        include: { items: { include: { product: true } } },
      },
    },
  })

  if (!tobias) { console.log('Tobias não encontrado'); return }

  console.log('=== Tobias ===')
  console.log('ID:', tobias.id)
  console.log('serviceType:', tobias.serviceType)
  console.log('scheduledDays:', tobias.scheduledDays)

  console.log('\n=== Vendas ===')
  for (const s of tobias.sales) {
    console.log(` ${s.saleType} | ${s.paymentStatus} | ${new Date(s.saleDate).toLocaleDateString('pt-BR')} | ${s.items.map(i => i.product?.name + ' (' + i.product?.category + ')').join(', ')}`)
  }

  console.log('\n=== Pacotes ===')
  for (const pk of tobias.packages) {
    console.log(` isActive=${pk.isActive} | ${pk.remainingDays} dias | expira ${new Date(pk.expiryDate).toLocaleDateString('pt-BR')}`)
  }

  console.log('\n=== Roster esta semana ===')
  const roster = await prisma.dailyRoster.findMany({
    where: { dogId: tobias.id, date: { gte: '2026-05-04', lte: '2026-05-10' } },
    orderBy: { date: 'asc' },
  })
  console.log(roster.length > 0 ? roster.map(r => ` ${r.date} | ${r.type} | present=${r.present} | source=${r.source}`).join('\n') : ' Nenhum')
}

main().catch(console.error).finally(() => prisma.$disconnect())
