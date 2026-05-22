const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Scheduled sales from historical data
const scheduledSales = [
  { dog: 'Betina', tutor: 'Eunira Keiko', service: 'Creche', freq: 'MENSAL 1X', start: '11/05/2026', end: '10/06/2026', unitPrice: 460, days: 1, total: 460, discount: 0, finalPrice: 460, paymentMethod: '', fee: 0, amountReceived: 0, status: 'PROGRAMADA', paymentDate: '', notes: '', saleType: 'MENSAL' },
]

async function main() {
  // Get all dogs
  const dogs = await prisma.dog.findMany({
    select: { id: true, name: true, ownerName: true },
  })

  // Get all products
  const products = await prisma.product.findMany({
    select: { id: true, name: true, category: true, price: true },
  })

  // Helper functions
  const findDog = (name) => dogs.find(d => d.name.toLowerCase() === name.toLowerCase())
  const findProduct = (service, freq, unitPrice) => {
    if (service === 'Creche' || service === 'Daycare') {
      if (freq.includes('MENSAL')) {
        const freqNum = freq.match(/\d+/)?.[0]
        const isHalfDay = freq.includes('MEIO') || false
        const periodLabel = isHalfDay ? 'Meio Período' : 'Período Integral'
        return products.find(p => p.name.includes(`${freqNum}x/semana`) && p.name.includes(periodLabel))
      }
      return products.find(p => p.name.includes('Diária') && p.name.includes('Creche'))
    }
    if (service === 'Hotel') {
      if (unitPrice === 200) return products.find(p => p.name.includes('Hotel') && p.price === 200)
      return products.find(p => p.name.includes('Hotel') && p.price === 150)
    }
    if (service === 'Pernoite') {
      return products.find(p => p.name.includes('Pernoite'))
    }
    if (service === 'Pacote -DC') {
      if (unitPrice === 1000) return products.find(p => p.name.includes('10 Dias'))
      return products.find(p => p.name.includes('5 Dias'))
    }
    return null
  }

  const parseDate = (dateStr) => {
    const parts = dateStr.split('/')
    return new Date(parts[2], parts[1] - 1, parts[0])
  }

  let imported = 0
  let skipped = 0
  let errors = []

  for (const sale of scheduledSales) {
    try {
      const dog = findDog(sale.dog)
      if (!dog) {
        errors.push(`Cão não encontrado: ${sale.dog}`)
        skipped++
        continue
      }

      const product = findProduct(sale.service, sale.freq, sale.unitPrice)
      if (!product) {
        errors.push(`Produto não encontrado: ${sale.service} ${sale.freq} R$${sale.unitPrice}`)
        skipped++
        continue
      }

      const saleDate = parseDate(sale.start)
      const discountAmount = (sale.discount / 100) * sale.total

      // Check if sale already exists
      const existingSale = await prisma.sales.findFirst({
        where: {
          dogId: dog.id,
          saleDate,
          finalPrice: sale.finalPrice,
        },
      })

      if (existingSale) {
        console.log(`Venda já existe para ${sale.dog} em ${sale.start} - atualizando status`)
        await prisma.sales.update({
          where: { id: existingSale.id },
          data: {
            paymentStatus: sale.status,
          },
        })
        imported++
      } else {
        await prisma.sales.create({
          data: {
            dogId: dog.id,
            saleType: sale.saleType || 'HOTEL',
            saleDate,
            basePrice: sale.total,
            finalPrice: sale.finalPrice,
            discount: discountAmount,
            paymentMethod: sale.paymentMethod || null,
            paymentFee: sale.fee,
            amountReceived: sale.amountReceived,
            paymentStatus: sale.status,
            paymentDate: sale.paymentDate || null,
            notes: sale.notes || null,
            items: {
              create: [{
                productId: product.id,
                quantity: sale.days,
                unitPrice: sale.unitPrice,
                totalPrice: sale.total,
              }],
            },
          },
        })
        imported++
      }
    } catch (error) {
      console.error('Erro ao importar venda:', error)
      errors.push(`Erro ao importar venda para ${sale.dog}: ${error.message}`)
      skipped++
    }
  }

  console.log(`Importação concluída:`)
  console.log(`- Importadas: ${imported}`)
  console.log(`- Puladas: ${skipped}`)
  console.log(`- Erros: ${errors.length}`)
  if (errors.length > 0) {
    console.log('Erros:')
    errors.forEach(e => console.log(`  - ${e}`))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
