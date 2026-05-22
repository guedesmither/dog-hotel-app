const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const dog = await p.dog.findFirst({ where: { name: { contains: 'Maya' } }, select: { id: true } })
  
  // Find all sales including the PROGRAMADA one
  const all = await p.sales.findMany({
    where: { dogId: dog.id },
    orderBy: { saleDate: 'desc' },
    include: { items: { include: { product: true } } }
  })
  console.log('TODAS as vendas da Maya:')
  for (const s of all) {
    console.log(`  [${s.id.slice(-6)}] ${new Date(s.saleDate).toLocaleDateString('pt-BR')} | ${s.saleType} | ${s.paymentStatus} | isExempt=${s.isExempt} | manualBaixa=${s.manualBaixa}`)
    console.log(`    items: ${s.items.map(i => i.product?.name + '(cat:' + i.product?.category + ')').join(', ')}`)
  }
}
main().catch(console.error).finally(() => p.$disconnect())
