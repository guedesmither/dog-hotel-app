const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Verificando vendas do Ramiro ===')
    
    // Find Ramiro
    const ramiro = await prisma.dog.findFirst({
      where: { name: { contains: 'Ramiro' } },
      include: {
        sales: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!ramiro) {
      console.log('Cão Ramiro não encontrado')
      return
    }

    console.log('Cão:', ramiro.name)
    console.log('Total de vendas:', ramiro.sales.length)
    
    ramiro.sales.forEach((sale, idx) => {
      console.log(`\n--- Venda ${idx + 1} ---`)
      console.log(`ID: ${sale.id}`)
      console.log(`Data da venda: ${sale.saleDate}`)
      console.log(`Tipo: ${sale.saleType}`)
      console.log(`Status pagamento: ${sale.paymentStatus}`)
      console.log(`Preço final: ${sale.finalPrice}`)
      console.log(`Notas: ${sale.notes}`)
      console.log('Itens:')
      sale.items.forEach(item => {
        console.log(`  - ${item.product?.name} (Qtd: ${item.quantity}, Preço: ${item.unitPrice})`)
      })
    })
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
