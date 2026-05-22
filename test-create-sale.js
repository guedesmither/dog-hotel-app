const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Testando criação de venda ===')
    
    // Find first dog
    const dog = await prisma.dog.findFirst({ where: { isActive: true } })
    if (!dog) {
      console.log('Nenhum cão ativo encontrado')
      return
    }
    console.log('Cão encontrado:', dog.name)

    // Find first product
    const product = await prisma.product.findFirst()
    if (!product) {
      console.log('Nenhum produto encontrado')
      return
    }
    console.log('Produto encontrado:', product.name)

    // Try to create a sale
    const sale = await prisma.sales.create({
      data: {
        saleDate: new Date(),
        finalPrice: 100,
        discount: 0,
        amountReceived: 100,
        paymentStatus: 'PAGO',
        paymentDate: new Date(),
        paymentMethod: 'PIX',
        paymentFee: 0,
        notes: null,
        dogId: dog.id,
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: product.price,
            totalPrice: product.price,
          },
        },
      },
    })

    console.log('✓ Venda criada com sucesso:', sale.id)
    
    // Clean up
    await prisma.sales.delete({ where: { id: sale.id } })
    console.log('✓ Venda removida (teste)')
  } catch (error) {
    console.error('Erro ao criar venda:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
