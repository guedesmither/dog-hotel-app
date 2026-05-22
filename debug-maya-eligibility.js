const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const dog = await p.dog.findFirst({
    where: { name: { contains: 'Maya' } },
    include: {
      sales: {
        where: { paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] }, manualBaixa: false },
        orderBy: { saleDate: 'desc' },
        include: { items: { include: { product: true } } }
      }
    }
  })

  const targetDate = new Date('2026-05-20T12:00:00')
  targetDate.setHours(0,0,0,0)
  console.log('Target date:', targetDate.toISOString().split('T')[0])

  const avulsoSales = dog.sales.filter(s =>
    s.saleType === 'AVULSO' || s.saleType === 'PACOTE' ||
    s.items.some(i => i.product?.category === 'AVULSO' || i.product?.category === 'PACOTE')
  )

  console.log(`\nVendas AVULSO/PACOTE (${avulsoSales.length}):`)
  for (const sale of avulsoSales) {
    const saleDate = new Date(sale.startDate || sale.saleDate)
    saleDate.setHours(0,0,0,0)
    const endDate = sale.endDate ? new Date(sale.endDate) : new Date(saleDate.getTime() + 30*24*60*60*1000)
    endDate.setHours(23,59,59,999)
    const inRange = targetDate >= saleDate && targetDate <= endDate
    const purchasedDays = sale.items
      .filter(i => i.product?.category === 'AVULSO' || (i.product?.name && /dia|diária|diaria/i.test(i.product.name)))
      .reduce((s, i) => s + (i.quantity || 1), 0)
    const saleDateStr = saleDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    const usedDays = await p.dailyRoster.count({
      where: { dogId: dog.id, type: 'AVULSO', date: { gte: saleDateStr, lte: endDateStr } }
    })
    console.log(`  [${sale.id.slice(-6)}] ${new Date(sale.saleDate).toLocaleDateString('pt-BR')} | ${sale.saleType} | isExempt=${sale.isExempt} | status=${sale.paymentStatus}`)
    console.log(`    período: ${saleDateStr} → ${endDateStr} | inRange=${inRange}`)
    console.log(`    purchasedDays=${purchasedDays} | usedDays=${usedDays} | eligible=${usedDays < purchasedDays}`)
    console.log(`    items: ${sale.items.map(i => i.product?.name + '(cat:' + i.product?.category + ',qty:' + i.quantity + ')').join(', ')}`)
  }

  // All roster entries for Maya in May
  const roster = await p.dailyRoster.findMany({
    where: { dogId: dog.id, date: { gte: '2026-05-01', lte: '2026-05-31' } },
    orderBy: { date: 'asc' }
  })
  console.log('\nRoster de maio:')
  roster.forEach(r => console.log(`  ${r.date} | ${r.type} | present=${r.present}`))
}
main().catch(console.error).finally(() => p.$disconnect())
