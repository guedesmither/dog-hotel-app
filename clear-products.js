const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function run() {
  const r1 = await prisma.priceTable.deleteMany()
  console.log(`PriceTable deletados: ${r1.count}`)

  const r2 = await prisma.product.deleteMany()
  console.log(`Produtos deletados: ${r2.count}`)

  console.log('\n✅ Produtos e tabela de preços limpos.')
}

run()
  .catch(e => { console.error('❌ Erro:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
