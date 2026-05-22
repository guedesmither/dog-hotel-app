const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Testando elegibilidade do Ramiro para HOTEL ===')
    
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
            saleDate: 'desc',
          },
        },
        packages: true,
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
    tomorrow.setUTCHours(0, 0, 0, 0)
    const targetDateStr = tomorrow.toISOString().split('T')[0]

    console.log(`\nTestando elegibilidade para: ${targetDateStr}`)

    // Check if dog is already in roster
    const existingRoster = await prisma.dailyRoster.findFirst({
      where: {
        dogId: ramiro.id,
        date: targetDateStr,
      },
    })

    if (existingRoster) {
      console.log(`❌ Cão já está na agenda como ${existingRoster.type} para esta data`)
      return
    }

    // Check hotel sales
    const hotelSales = ramiro.sales.filter((s) => 
      s.saleType === 'HOTEL' || 
      (s.items.some((i) => i.product?.category === 'HOTEL' || i.product?.name.includes('Hotel')))
    )

    console.log(`\nVendas de HOTEL encontradas: ${hotelSales.length}`)

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

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
        console.log(`❌ Serviço já realizado (endDate: ${endDate.toISOString().split('T')[0]} < today)`)
        continue
      }

      // Normalize all dates to local midnight for comparison
      const targetDateNormalized = new Date(targetDateStr + 'T00:00:00.000')
      targetDateNormalized.setHours(0, 0, 0, 0)
      const startDateNormalized = new Date(startDate)
      startDateNormalized.setHours(0, 0, 0, 0)
      const endDateNormalized = new Date(endDate)
      endDateNormalized.setHours(23, 59, 59, 999)
      
      console.log(`Comparando: ${targetDateNormalized.toISOString().split('T')[0]} >= ${startDateNormalized.toISOString().split('T')[0]} && <= ${endDateNormalized.toISOString().split('T')[0]}`)

      if (startDateNormalized && endDateNormalized && targetDateNormalized >= startDateNormalized && targetDateNormalized <= endDateNormalized) {
        console.log(`✅ Elegível: ${startDateNormalized.toISOString().split('T')[0]} a ${endDateNormalized.toISOString().split('T')[0]} cobre ${targetDateStr}`)
        return
      }

      console.log(`❌ Não elegível: ${startDateNormalized.toISOString().split('T')[0]} a ${endDateNormalized.toISOString().split('T')[0]} não cobre ${targetDateStr}`)
    }

    // Check packages
    const activePackages = ramiro.packages.filter((p) => 
      p.isActive && 
      p.remainingDays > 0 && 
      new Date(p.expiryDate) >= targetDate
    )

    console.log(`\nPacotes ativos: ${activePackages.length}`)
    if (activePackages.length > 0) {
      console.log('✅ Elegível via pacote')
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
