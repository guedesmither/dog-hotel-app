const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const betina = await prisma.dog.findFirst({
    where: { name: { contains: 'Betina' } },
    include: {
      sales: {
        orderBy: { saleDate: 'desc' },
        take: 20,
        include: { items: { include: { product: true } } }
      }
    }
  })
  if (!betina) { console.log('Betina não encontrada'); return }

  console.log('=== Betina ===')
  console.log('dogStatus:', betina.dogStatus)
  console.log('scheduledDays:', betina.scheduledDays)
  console.log('frequencyDays:', betina.frequencyDays)
  console.log('isBolsista:', betina.isBolsista)

  console.log('\n=== Venda ativa ===')
  for (const s of betina.sales) {
    const items = s.items.map(i => `${i.product?.name} (qty:${i.quantity})`).join(', ')
    console.log(`  ${s.saleType} | ${s.paymentStatus} | ${new Date(s.saleDate).toLocaleDateString('pt-BR')} | start:${s.startDate||'-'} end:${s.endDate||'-'} | ${items}`)
  }

  // Check roster for current month
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-31`
  const roster = await prisma.dailyRoster.findMany({
    where: { dogId: betina.id, date: { gte: monthStart, lte: monthEnd } },
    orderBy: { date: 'asc' }
  })
  console.log(`\n=== Agenda ${now.toLocaleString('pt-BR',{month:'long'})} (${roster.length} entradas) ===`)
  roster.forEach(r => console.log(`  ${r.date} | ${r.source} | ${r.type} | present:${r.present}`))

  // Remove invalid May 18 entry (Monday, but scheduledDays = Quarta)
  const del = await prisma.dailyRoster.deleteMany({
    where: { dogId: betina.id, date: '2026-05-18' }
  })
  console.log(`\nEntrada 18/05 removida: ${del.count}`)

  // What's the product name on her MENSAL sale?
  const mensal = betina.sales.find(s => s.saleType === 'MENSAL')
  if (mensal) {
    const dayItem = mensal.items.find(i => i.product?.category === 'CRECHE' || i.product?.name?.toLowerCase().includes('mensal'))
    console.log('\nProduto mensal:', dayItem?.product?.name, '| qty:', dayItem?.quantity)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
