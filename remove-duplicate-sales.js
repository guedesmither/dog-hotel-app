const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Get all sales
  const allSales = await prisma.sales.findMany({
    include: {
      dog: {
        select: { name: true },
      },
      items: {
        include: {
          product: {
            select: { name: true },
          },
        },
      },
    },
  })

  // Group by unique key (dogId + saleDate + finalPrice + items)
  const seen = new Map()
  const duplicates = []

  for (const sale of allSales) {
    const itemsKey = sale.items.map(i => `${i.productId}_${i.quantity}_${i.unitPrice}`).sort().join('|')
    const key = `${sale.dogId}_${sale.saleDate.getTime()}_${sale.finalPrice}_${itemsKey}`
    
    if (seen.has(key)) {
      duplicates.push(sale.id)
      console.log(`Duplicado encontrado: ${sale.dog?.name} - ${sale.saleDate.toISOString().slice(0, 10)} - R$ ${sale.finalPrice}`)
    } else {
      seen.set(key, true)
    }
  }

  console.log(`Total de duplicatas: ${duplicates.length}`)

  // Delete duplicates
  if (duplicates.length > 0) {
    const deleted = await prisma.sales.deleteMany({
      where: {
        id: { in: duplicates },
      },
    })
    console.log(`✅ ${deleted.count} vendas duplicadas removidas`)
  } else {
    console.log('✅ Nenhuma duplicata encontrada')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
