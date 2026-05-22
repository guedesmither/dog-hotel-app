const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Verificando todos os produtos ===')
    
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
    })

    console.log(`Total de produtos: ${products.length}`)
    
    products.forEach((product) => {
      console.log(`\n--- Produto ---`)
      console.log(`ID: ${product.id}`)
      console.log(`Nome: ${product.name}`)
      console.log(`Categoria: ${product.category}`)
      console.log(`Preço: ${product.price}`)
      console.log(`Ativo: ${product.isActive}`)
    })
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
