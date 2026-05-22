const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const hotelProducts = [
    { name: 'Hotel 1 Dia', description: 'Diária de hotel - 1 dia', category: 'HOTEL', price: 150 },
    { name: 'Hotel 2 Dias', description: 'Diária de hotel - 2 dias', category: 'HOTEL', price: 300 },
    { name: 'Hotel 3 Dias', description: 'Diária de hotel - 3 dias', category: 'HOTEL', price: 450 },
    { name: 'Hotel 5 Dias', description: 'Diária de hotel - 5 dias', category: 'HOTEL', price: 750 },
    { name: 'Hotel 6 Dias', description: 'Diária de hotel - 6 dias', category: 'HOTEL', price: 900 },
    { name: 'Hotel 10 Dias', description: 'Diária de hotel - 10 dias', category: 'HOTEL', price: 1500 },
  ]

  for (const product of hotelProducts) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    })

    if (!existing) {
      await prisma.product.create({
        data: product,
      })
      console.log(`✅ Produto "${product.name}" cadastrado - R$ ${product.price}`)
    } else {
      console.log(`⏭️  Produto "${product.name}" já existe - R$ ${existing.price}`)
    }
  }

  console.log('✅ Produtos de hotel cadastrados!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
