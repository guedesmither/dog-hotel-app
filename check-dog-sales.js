const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Get dogs that should be in agenda today (Quarta-feira)
  const dogs = await prisma.dog.findMany({
    where: {
      isActive: true,
      scheduledDays: { contains: 'Quarta' },
    },
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

  console.log('=== CÃES QUE DEVERIAM ESTAR NA AGENDA (QUARTA-FEIRA) ===')
  console.log('Total:', dogs.length)
  
  dogs.forEach(dog => {
    console.log(`\n${dog.name}:`)
    console.log('  Tipo:', dog.serviceType)
    console.log('  Dias agendados:', dog.scheduledDays)
    console.log('  Vendas ativas:', dog.sales.length)
    
    if (dog.sales.length === 0) {
      console.log('  ⚠ Nenhuma venda ativa - NÃO será adicionado à agenda')
    } else {
      dog.sales.forEach(sale => {
        console.log(`    - ${sale.saleType} (${sale.saleDate.toISOString().split('T')[0]})`)
      })
    }
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
