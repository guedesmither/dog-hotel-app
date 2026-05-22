const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Verificando produtos de hotel ===')
    
    const hotelProducts = await prisma.product.findMany({
      where: {
        name: {
          contains: 'Hotel',
        },
      },
    })

    console.log(`Total de produtos com 'Hotel' no nome: ${hotelProducts.length}`)
    
    hotelProducts.forEach((product) => {
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
