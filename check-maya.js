const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const maya = await prisma.dog.findFirst({
    where: { name: { contains: 'Maya' } },
    include: {
      sales: {
        orderBy: { saleDate: 'desc' },
        take: 5,
        include: { items: { include: { product: true } } }
      },
      packages: true,
    }
  })

  if (!maya) { console.log('Maya não encontrada'); return }

  console.log('=== Maya ===')
  console.log('ID:', maya.id)
  console.log('dogStatus:', maya.dogStatus)
  console.log('isActive:', maya.isActive)
  console.log('scheduledDays:', maya.scheduledDays)
  console.log('isBolsista:', maya.isBolsista)

  console.log('\n=== Vendas recentes ===')
  for (const s of maya.sales) {
    console.log(`  ${s.saleType} | ${s.paymentStatus} | ${new Date(s.saleDate).toLocaleDateString('pt-BR')} | start:${s.startDate||'-'} end:${s.endDate||'-'} | ${s.items.map(i=>i.product?.name).join(', ')}`)
  }

  console.log('\n=== Pacotes ===')
  for (const p of maya.packages) {
    console.log(`  ${p.isActive?'ATIVO':'INATIVO'} | ${p.remainingDays}/${p.totalDays} dias | expira ${new Date(p.expiryDate).toLocaleDateString('pt-BR')}`)
  }

  // Remove invalid May 18 entry
  const del = await prisma.dailyRoster.deleteMany({
    where: { dogId: maya.id, date: '2026-05-18' }
  })
  console.log(`\nEntrada de 18/05 removida: ${del.count}`)

  console.log('\n=== Agenda (próximos 10 dias) ===')
  const from = new Date().toISOString().split('T')[0]
  const to = new Date(Date.now() + 10*24*60*60*1000).toISOString().split('T')[0]
  const roster = await prisma.dailyRoster.findMany({
    where: { dogId: maya.id, date: { gte: from, lte: to } },
    orderBy: { date: 'asc' }
  })
  roster.forEach(r => console.log(`  ${r.date} | ${r.source} | ${r.type}`))
  if (roster.length === 0) console.log('  Nenhuma entrada')
}

main().catch(console.error).finally(() => prisma.$disconnect())
