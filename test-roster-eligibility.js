const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Testando verificação de elegibilidade do Ramiro para HOTEL ===')
    
    const ramiro = await prisma.dog.findUnique({
      where: { id: 'cmoqd5n8k0006sv9moj1uq5oy' },
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

    if (!ramiro) {
      console.log('Cão Ramiro não encontrado')
      return
    }

    console.log('Cão:', ramiro.name)
    console.log('ID:', ramiro.id)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    console.log(`\nTestando elegibilidade para: ${dateStr}`)

    // Simulate the POST handler eligibility check with corrected timezone
    const [year, month, day] = dateStr.split('-').map(Number)
    const targetDate = new Date(year, month - 1, day)
    targetDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    console.log(`Target date: ${targetDate.toISOString()}`)
    console.log(`Today: ${today.toISOString()}`)

    let eligible = false
    let reason = ''

    const hotelSales = ramiro.sales.filter((s) => 
      s.saleType === 'HOTEL' || 
      (s.items.some((i) => i.product?.category === 'HOTEL' || i.product?.name.includes('Hotel')))
    )

    console.log(`\nVendas de HOTEL encontradas: ${hotelSales.length}`)

    for (const sale of hotelSales) {
      console.log(`\n--- Venda ${sale.id} ---`)
      console.log(`Data: ${sale.saleDate}`)
      console.log(`Tipo: ${sale.saleType}`)
      console.log(`Status: ${sale.paymentStatus}`)
      console.log(`Produto: ${sale.items[0]?.product?.name}`)
      console.log(`Notas: ${sale.notes}`)

      let startDate = null
      let endDate = null

      if (sale.notes) {
        const dateMatch = sale.notes.match(/(\d{2}\/\d{2}\/\d{4})/g)
        if (dateMatch && dateMatch.length >= 2) {
          startDate = parseBrazilianDate(dateMatch[0])
          endDate = parseBrazilianDate(dateMatch[dateMatch.length - 1])
          console.log(`Range nas notas: ${dateMatch[0]} a ${dateMatch[dateMatch.length - 1]}`)
        }
      }

      if (!startDate || !endDate) {
        const productName = sale.items[0]?.product?.name || ''
        const daysMatch = productName.match(/(\d+)\s*Dias?/i)
        if (daysMatch) {
          const days = parseInt(daysMatch[1], 10)
          startDate = new Date(sale.saleDate)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + days - 1)
          endDate.setHours(23, 59, 59, 999)
          console.log(`Range do produto: ${startDate.toISOString().split('T')[0]} a ${endDate.toISOString().split('T')[0]} (${days} dias)`)
        } else {
          startDate = new Date(sale.saleDate)
          startDate.setHours(0, 0, 0, 0)
          endDate = new Date(startDate)
          endDate.setHours(23, 59, 59, 999)
          console.log(`Range padrão: ${startDate.toISOString().split('T')[0]} (1 dia)`)
        }
      }

      if (endDate && endDate < today) {
        console.log(`❌ Serviço já realizado`)
        continue
      }

      const targetDateNormalized = new Date(targetDate)
      targetDateNormalized.setHours(0, 0, 0, 0)
      const startDateNormalized = new Date(startDate)
      startDateNormalized.setHours(0, 0, 0, 0)
      const endDateNormalized = new Date(endDate)
      endDateNormalized.setHours(23, 59, 59, 999)

      console.log(`Comparando: ${targetDateNormalized.toISOString().split('T')[0]} >= ${startDateNormalized.toISOString().split('T')[0]} && <= ${endDateNormalized.toISOString().split('T')[0]}`)

      if (startDateNormalized && endDateNormalized && targetDateNormalized >= startDateNormalized && targetDateNormalized <= endDateNormalized) {
        eligible = true
        reason = 'Venda de hotel cobrindo este período'
        console.log(`✅ Elegível`)
        break
      }

      console.log(`❌ Não elegível`)
    }

    if (!eligible) {
      console.log(`\n❌ Não elegível: ${reason}`)
    } else {
      console.log(`\n✅ Elegível: ${reason}`)
    }
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function parseBrazilianDate(dateStr) {
  try {
    const parts = dateStr.split('/')
    if (parts.length !== 3) return null
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const year = parseInt(parts[2], 10)
    return new Date(year, month, day)
  } catch {
    return null
  }
}

main()
