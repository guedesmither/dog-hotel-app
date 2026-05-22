const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Verificando vendas do Sirius Black ===')
    
    const sirius = await prisma.dog.findFirst({
      where: { name: { contains: 'Sirius' } },
      include: {
        sales: {
          where: {
            paymentStatus: { in: ['PAGO', 'AGENDADO', 'PROGRAMADA'] },
          },
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
    console.log('Total de vendas ativas:', sirius.sales.length)
    
    sirius.sales.forEach((sale, index) => {
      console.log(`\nVenda ${index + 1}:`)
      console.log('  ID:', sale.id)
      console.log('  Tipo:', sale.saleType)
      console.log('  Data da venda:', sale.saleDate.toISOString().split('T')[0])
      console.log('  Status pagamento:', sale.paymentStatus)
      console.log('  Notas:', sale.notes || '(vazio)')
      console.log('  Itens:')
      sale.items.forEach(item => {
        console.log(`    - ${item.product?.name} (${item.product?.category})`)
      })
    })
    
    // Check tomorrow's date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    console.log(`\nAmanhã: ${tomorrow.toISOString().split('T')[0]}`)
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
