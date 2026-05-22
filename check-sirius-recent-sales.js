const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Verificando vendas recentes do Sirius Black ===')
    
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
          orderBy: { saleDate: 'desc' },
        },
      },
    })

    if (!sirius) {
      console.log('Cão Sirius Black não encontrado')
      return
    }

    console.log('Cão:', sirius.name)
    console.log('ID:', sirius.id)
    console.log('Total de vendas:', sirius.sales.length)
    
    // Check today's date
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    console.log('\nHoje:', todayStr)
    
    // Check tomorrow's date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    console.log('Amanhã:', tomorrowStr)
    
    console.log('\n=== VENDAS DE HOJE ===')
    sirius.sales.forEach((sale, index) => {
      const saleDate = sale.saleDate.toISOString().split('T')[0]
      if (saleDate === todayStr) {
        console.log(`\nVenda ${index + 1}:`)
        console.log('  ID:', sale.id)
        console.log('  Tipo:', sale.saleType)
        console.log('  Data da venda:', saleDate)
        console.log('  Status pagamento:', sale.paymentStatus)
        console.log('  Notas:', sale.notes || '(vazio)')
        console.log('  Itens:')
        sale.items.forEach(item => {
          console.log(`    - ${item.product?.name} (${item.product?.category})`)
        })
      }
    })
    
    console.log('\n=== VENDAS PARA AMANHÃ OU FUTURAS ===')
    sirius.sales.forEach((sale, index) => {
      const saleDate = sale.saleDate.toISOString().split('T')[0]
      if (saleDate >= tomorrowStr) {
        console.log(`\nVenda ${index + 1}:`)
        console.log('  ID:', sale.id)
        console.log('  Tipo:', sale.saleType)
        console.log('  Data da venda:', saleDate)
        console.log('  Status pagamento:', sale.paymentStatus)
        console.log('  Notas:', sale.notes || '(vazio)')
        console.log('  Itens:')
        sale.items.forEach(item => {
          console.log(`    - ${item.product?.name} (${item.product?.category})`)
        })
      }
    })
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
