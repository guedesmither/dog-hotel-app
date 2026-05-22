const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Find all sales with CONCLUIDO status
  const concludedSales = await prisma.sales.findMany({
    where: {
      paymentStatus: 'CONCLUIDO',
    },
  })

  console.log(`=== Corrigindo vendas marcadas como CONCLUIDO ===`)
  console.log(`Total encontrado: ${concludedSales.length}`)

  if (concludedSales.length === 0) {
    console.log('Nenhuma venda com status CONCLUIDO encontrada')
    return
  }

  // Update all CONCLUIDO sales to PAGO
  const result = await prisma.sales.updateMany({
    where: {
      paymentStatus: 'CONCLUIDO',
    },
    data: {
      paymentStatus: 'PAGO',
    },
  })

  console.log(`✓ ${result.count} vendas atualizadas de CONCLUIDO para PAGO`)

  // Show details
  console.log('\nVendas atualizadas:')
  for (const sale of concludedSales) {
    console.log(`  - ID: ${sale.id}`)
    console.log(`    Tipo: ${sale.saleType}`)
    console.log(`    Data: ${sale.saleDate.toISOString().split('T')[0]}`)
    console.log(`    Valor: R$ ${sale.finalPrice}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
