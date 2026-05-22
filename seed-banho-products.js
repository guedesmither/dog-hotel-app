const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const bathProducts = [
    { name: 'Banho Porte Pequeno (P)', description: 'Banho para cães pequenos', category: 'SERVICO', price: 40 },
    { name: 'Banho Porte Médio (M)', description: 'Banho para cães médios', category: 'SERVICO', price: 70 },
    { name: 'Banho Porte Grande (G)', description: 'Banho para cães grandes', category: 'SERVICO', price: 90 },
    { name: 'Banho Porte Extra Grande (GG)', description: 'Banho para cães extra grandes', category: 'SERVICO', price: 110 },
  ]

  for (const product of bathProducts) {
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

  console.log('✅ Produtos de banho cadastrados!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
