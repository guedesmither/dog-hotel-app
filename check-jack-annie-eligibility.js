const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Find Jack Sparrow and Annie Bonny
  const jackSparrow = await prisma.dog.findFirst({
    where: { name: 'Jack Sparrow' },
    include: {
      packages: true,
      sales: {
        where: {
          paymentStatus: { in: ['PAGO', 'AGENDADO', 'PROGRAMADA'] },
        },
        orderBy: { saleDate: 'desc' },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  })

  const annieBonny = await prisma.dog.findFirst({
    where: { name: 'Annie Bonny' },
    include: {
      packages: true,
      sales: {
        where: {
          paymentStatus: { in: ['PAGO', 'AGENDADO', 'PROGRAMADA'] },
        },
        orderBy: { saleDate: 'desc' },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  })

  if (!jackSparrow || !annieBonny) {
    console.log('Cães não encontrados')
    return
  }

  console.log('=== Jack Sparrow ===')
  console.log('ID:', jackSparrow.id)
  console.log('Tipo de serviço:', jackSparrow.serviceType)
  console.log('Pacotes:', jackSparrow.packages.length)
  jackSparrow.packages.forEach((pkg, i) => {
    console.log(`  Pacote ${i + 1}:`)
    console.log(`    Tipo: ${pkg.packageType}`)
    console.log(`    Dias totais: ${pkg.totalDays}`)
    console.log(`    Dias restantes: ${pkg.remainingDays}`)
    console.log(`    Ativo: ${pkg.isActive}`)
    console.log(`    Expira em: ${pkg.expiryDate}`)
  })
  console.log('Vendas:', jackSparrow.sales.length)
  jackSparrow.sales.forEach((sale, i) => {
    console.log(`  Venda ${i + 1}:`)
    console.log(`    Tipo: ${sale.saleType}`)
    console.log(`    Status: ${sale.paymentStatus}`)
    console.log(`    Data: ${sale.saleDate.toISOString().split('T')[0]}`)
  })

  console.log('\n=== Annie Bonny ===')
  console.log('ID:', annieBonny.id)
  console.log('Tipo de serviço:', annieBonny.serviceType)
  console.log('Pacotes:', annieBonny.packages.length)
  annieBonny.packages.forEach((pkg, i) => {
    console.log(`  Pacote ${i + 1}:`)
    console.log(`    Tipo: ${pkg.packageType}`)
    console.log(`    Dias totais: ${pkg.totalDays}`)
    console.log(`    Dias restantes: ${pkg.remainingDays}`)
    console.log(`    Ativo: ${pkg.isActive}`)
    console.log(`    Expira em: ${pkg.expiryDate}`)
  })
  console.log('Vendas:', annieBonny.sales.length)
  annieBonny.sales.forEach((sale, i) => {
    console.log(`  Venda ${i + 1}:`)
    console.log(`    Tipo: ${sale.saleType}`)
    console.log(`    Status: ${sale.paymentStatus}`)
    console.log(`    Data: ${sale.saleDate.toISOString().split('T')[0]}`)
  })

  // Simulate eligibility check for today
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  console.log('\n=== Simulação de Elegibilidade para Hoje ===')
  console.log('Hoje:', today.toISOString().split('T')[0])

  const checkEligibility = (dog, dogName) => {
    const activePackages = dog.packages.filter(p => 
      p.isActive && 
      p.remainingDays > 0 && 
      new Date(p.expiryDate) >= today
    )

    console.log(`\n${dogName}:`)
    console.log(`  Pacotes ativos: ${activePackages.length}`)
    activePackages.forEach((pkg, i) => {
      console.log(`    Pacote ${i + 1}: ${pkg.remainingDays} dias restantes, expira em ${pkg.expiryDate.toISOString().split('T')[0]}`)
    })
    console.log(`  Elegível via pacote: ${activePackages.length > 0 ? 'SIM' : 'NÃO'}`)
  }

  checkEligibility(jackSparrow, 'Jack Sparrow')
  checkEligibility(annieBonny, 'Annie Bonny')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
