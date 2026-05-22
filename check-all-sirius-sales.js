const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Verificando TODAS as vendas do Sirius Black ===')
    
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
        },
      },
    })

    if (!sirius) {
      console.log('Cão Sirius Black não encontrado')
      return
    }

    console.log('Cão:', sirius.name)
    console.log('Total de vendas:', sirius.sales.length)
    
    sirius.sales.forEach((sale, index) => {
      console.log(`\nVenda ${index + 1}:`)
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
    })
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
