const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Find Sol
  const sol = await prisma.dog.findFirst({
    where: { name: 'Sol' },
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

  if (!sol) {
    console.log('Cão Sol não encontrado')
    return
  }

  console.log('=== DADOS DA SOL PARA VERIFICAÇÃO DE ELEGIBILIDADE ===')
  console.log('ID:', sol.id)
  console.log('Nome:', sol.name)
  console.log('Tipo de serviço:', sol.serviceType)
  console.log('Dias agendados:', sol.scheduledDays)
  console.log('\n=== VENDAS ELEGÍVEIS (PAGO, AGENDADO, PROGRAMADA) ===')
  console.log('Total de vendas elegíveis:', sol.sales.length)
  
  sol.sales.forEach((sale, index) => {
    console.log(`\nVenda ${index + 1}:`)
    console.log('  Tipo:', sale.saleType)
    console.log('  Data da venda:', sale.saleDate.toISOString())
    console.log('  Status pagamento:', sale.paymentStatus)
    console.log('  Valor final:', sale.finalPrice)
    console.log('  Notas:', sale.notes)
    console.log('  Itens:')
    sale.items.forEach(item => {
      console.log(`    - ${item.product?.name || 'Produto não encontrado'} (${item.product?.category || 'N/A'})`)
    })
  })

  console.log('\n=== PACOTES ===')
  console.log('Total de pacotes:', sol.packages.length)
  sol.packages.forEach((pkg, index) => {
    console.log(`\nPacote ${index + 1}:`)
    console.log('  ID:', pkg.id)
    console.log('  Tipo:', pkg.packageType)
    console.log('  Dias totais:', pkg.totalDays)
    console.log('  Dias restantes:', pkg.remainingDays)
    console.log('  Ativo:', pkg.isActive)
    console.log('  Data de expiração:', pkg.expiryDate)
  })

  // Simulate eligibility check for CRECHE on Thursday (2026-05-08)
  const targetDate = new Date('2026-05-08T00:00:00.000Z')
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  console.log('\n=== SIMULAÇÃO DE VERIFICAÇÃO DE ELEGIBILIDADE ===')
  console.log('Data alvo:', targetDate.toISOString())
  console.log('Hoje:', today.toISOString())
  console.log('Tipo: CRECHE')

  // Check for monthly subscription
  const monthlySales = sol.sales.filter(s => 
    s.saleType === 'MENSAL' || 
    (s.items.some(i => i.product?.category === 'CRECHE' || i.product?.name.includes('MENSAL')))
  )

  console.log('\nVendas de mensalidade encontradas:', monthlySales.length)
  monthlySales.forEach((sale, index) => {
    console.log(`\nMensalidade ${index + 1}:`)
    console.log('  Data da venda:', sale.saleDate.toISOString())
    const saleDate = new Date(sale.saleDate)
    const expiryDate = new Date(saleDate)
    expiryDate.setMonth(expiryDate.getMonth() + 1)
    console.log('  Data de expiração:', expiryDate.toISOString())
    console.log('  Dentro do período?', targetDate >= saleDate && targetDate <= expiryDate)
  })

  // Check for active packages
  const activePackages = sol.packages.filter(p => 
    p.isActive && 
    p.remainingDays > 0 && 
    new Date(p.expiryDate) >= targetDate
  )

  console.log('\nPacotes ativos encontrados:', activePackages.length)
  activePackages.forEach((pkg, index) => {
    console.log(`\nPacote ${index + 1}:`)
    console.log('  Dias restantes:', pkg.remainingDays)
    console.log('  Expira em:', pkg.expiryDate)
  })

  console.log('\n=== RESULTADO ===')
  const eligible = monthlySales.some(sale => {
    const saleDate = new Date(sale.saleDate)
    const expiryDate = new Date(saleDate)
    expiryDate.setMonth(expiryDate.getMonth() + 1)
    return targetDate >= saleDate && targetDate <= expiryDate
  }) || activePackages.length > 0

  console.log('Elegível para CRECHE na quinta-feira 08/05/2026?', eligible ? 'SIM' : 'NÃO')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
