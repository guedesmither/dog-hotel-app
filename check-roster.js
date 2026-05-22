const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const tsuki = await prisma.dog.findFirst({ where: { name: 'Tsuki' }, select: { id: true, name: true } })
  if (!tsuki) { console.log('Tsuki não encontrada'); return }
  console.log('Tsuki id:', tsuki.id)
  const entries = await prisma.dailyRoster.findMany({ where: { dogId: tsuki.id }, select: { date: true, type: true, source: true, present: true } })
  console.log('Roster entries:', JSON.stringify(entries, null, 2))
  return
  const targets = ['Bucky', 'Leonardo', 'Pandora']
  const today = new Date('2026-05-08T12:00:00Z')

  const dogs = await prisma.dog.findMany({
    where: { name: { in: targets } },
    select: { id: true, name: true, scheduledDays: true, dogStatus: true, serviceType: true },
  })

  for (const d of dogs) {
    const sales = await prisma.sales.findMany({
      where: { dogId: d.id, saleType: 'MENSAL' },
      select: { paymentStatus: true, startDate: true, endDate: true, saleDate: true },
    })
    console.log(`\n=== ${d.name} ===`)
    console.log(`  dogStatus: ${d.dogStatus} | scheduledDays: "${d.scheduledDays}"`)
    if (sales.length === 0) {
      console.log('  ⚠️  SEM VENDAS MENSAL no banco')
    }
    for (const s of sales) {
      const start = s.startDate ? new Date(s.startDate) : new Date(s.saleDate)
      start.setHours(0,0,0,0)
      const end = s.endDate
        ? new Date(s.endDate)
        : (() => { const x = new Date(start); x.setMonth(x.getMonth()+1); return x })()
      end.setHours(23,59,59,999)
      const cobre = today >= start && today <= end
      console.log(`  venda: ${s.paymentStatus} | ${start.toISOString().split('T')[0]} → ${end.toISOString().split('T')[0]} | cobre 08/05: ${cobre ? '✅' : '❌'}`)
    }
  }

  // Show what's in the roster this week
  const roster = await prisma.dailyRoster.findMany({
    where: { date: { gte: '2026-05-04', lte: '2026-05-10' } },
    include: { dog: { select: { name: true } } },
    orderBy: { date: 'asc' },
  })
  console.log(`\nRoster semana 04-10/05: ${roster.length} entradas`)
  for (const r of roster) {
    console.log(`  ${r.date} | ${r.dog.name} | ${r.type} | ${r.source}`)
  }

  // Show DailyRosterSeed state
  const seeds = await prisma.dailyRosterSeed.findMany({ where: { date: { gte: '2026-05-04', lte: '2026-05-10' } } })
  console.log(`\nDailyRosterSeed semana: ${seeds.map(s => s.date).join(', ') || 'nenhum'}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
