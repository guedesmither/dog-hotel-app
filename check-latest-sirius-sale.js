const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Verificando venda mais recente do Sirius Black ===')
    
    const sirius = await prisma.dog.findFirst({
      where: { name: { contains: 'Sirius' } },
      include: {
        sales: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!sirius || sirius.sales.length === 0) {
      console.log('Nenhuma venda encontrada')
      return
    }

    const sale = sirius.sales[0]
    console.log('Cão:', sirius.name)
    console.log('\nVenda mais recente:')
    console.log('  ID:', sale.id)
    console.log('  Tipo:', sale.saleType)
    console.log('  Data da venda:', sale.saleDate.toISOString().split('T')[0])
    console.log('  Criado em:', sale.createdAt.toISOString())
    console.log('  Status pagamento:', sale.paymentStatus)
    console.log('  Notas:', sale.notes || '(vazio)')
    console.log('  Itens:')
    sale.items.forEach(item => {
      console.log(`    - ${item.product?.name} (${item.product?.category})`)
    })
    
    // Check tomorrow's date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    console.log(`\nAmanhã: ${tomorrowStr}`)
    
    // Check if sale date matches tomorrow
    const saleDate = sale.saleDate.toISOString().split('T')[0]
    console.log(`Data da venda: ${saleDate}`)
    console.log(`Coincide com amanhã? ${saleDate === tomorrowStr}`)
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
