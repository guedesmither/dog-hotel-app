const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Get current month prices
  const yearMonth = new Date().toISOString().slice(0, 7)
  
  const priceTable = await prisma.priceTable.findMany({
    where: {
      yearMonth,
      priceType: 'MONTHLY',
    },
    orderBy: { frequencyDays: 'asc' },
  })

  console.log(`Preços mensais para ${yearMonth}:`)
  console.log('')

  for (const price of priceTable) {
    const frequencyDays = price.frequencyDays
    const isHalfDay = price.isHalfDay
    const monthlyPrice = price.monthlyPrice

    if (!frequencyDays) continue

    const frequencyLabel = `${frequencyDays}x/semana`
    const periodLabel = isHalfDay ? 'Meio Período' : 'Período Integral'
    const productName = `Mensalidade ${frequencyLabel} (${periodLabel})`
    
    // Check if product already exists
    const existing = await prisma.product.findFirst({
      where: { name: productName },
    })

    if (!existing) {
      await prisma.product.create({
        data: {
          name: productName,
          description: `Mensalidade de creche - ${frequencyLabel} - ${periodLabel}`,
          category: 'HOTEL',
          price: monthlyPrice,
        },
      })
      console.log(`✅ Criado: ${productName} - R$ ${monthlyPrice}`)
    } else {
      // Update price if changed
      if (existing.price !== monthlyPrice) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { price: monthlyPrice },
        })
        console.log(`🔄 Atualizado: ${productName} - R$ ${monthlyPrice}`)
      } else {
        console.log(`⏭️  Já existe: ${productName} - R$ ${monthlyPrice}`)
      }
    }
  }

  console.log('')
  console.log('✅ Mensalidades cadastradas/atualizadas!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
