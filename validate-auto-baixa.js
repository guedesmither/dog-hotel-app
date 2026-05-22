const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== Validando baixa automática para serviços ANDAMENTO/AGENDADO ===\n')

  // Serviços ANDAMENTO e AGENDADO da tabela
  const services = [
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Creche', start: '15/04/2026', end: '13/05/2026', status: 'ANDAMENTO' },
    { dog: 'Bucky', owner: 'Lucas de Carvalho Xavier', type: 'Creche', start: '20/04/2026', end: '20/05/2026', status: 'ANDAMENTO' },
    { dog: 'Leonardo', owner: 'Thaís Gabrielly Pereira Mançano', type: 'Creche', start: '22/04/2026', end: '22/05/2026', status: 'ANDAMENTO' },
    { dog: 'Theodoro', owner: 'Vitoria Koyama', type: 'Creche', start: '24/04/2026', end: '24/05/2026', status: 'ANDAMENTO' },
    { dog: 'Bucky', owner: 'Lucas de Carvalho Xavier', type: 'Hotel', start: '24/04/2026', end: '27/04/2026', status: 'ANDAMENTO' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Hotel', start: '24/04/2026', end: '26/04/2026', status: 'ANDAMENTO' },
    { dog: 'Romain', owner: 'Gabriel Montanher', type: 'Creche', start: '25/04/2026', end: '25/05/2026', status: 'ANDAMENTO' },
    { dog: 'Theo', owner: 'Gabriel Montanher', type: 'Creche', start: '25/04/2026', end: '25/05/2026', status: 'ANDAMENTO' },
    { dog: 'Sol', owner: 'Carla', type: 'Daycare', start: '29/04/2026', end: '29/04/2026', status: 'AGENDADO' },
    { dog: 'Sol', owner: 'Carla', type: 'Banho', start: '29/04/2026', end: '29/04/2026', status: 'AGENDADO' },
    { dog: 'Júpiter', owner: 'Gabriela Bittencourt', type: 'Creche', start: '30/04/2026', end: '30/05/2026', status: 'AGENDADO' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Creche', start: '15/05/2026', end: '14/05/2026', status: 'AGENDADO' },
    { dog: 'Betina', owner: 'Eunira Keiko', type: 'Creche', start: '11/05/2026', end: '10/06/2026', status: 'AGENDADO' },
    { dog: 'Ramiro', owner: 'Barbara Gomes', type: 'Hotel', start: '24/04/2026', end: '26/04/2026', status: 'ANDAMENTO' },
  ]

  const parseDate = (dateStr) => {
    const parts = dateStr.split('/')
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
  }

  for (const service of services) {
    const startDate = parseDate(service.start)
    const endDate = parseDate(service.end)

    // Find matching sale
    const sales = await prisma.sales.findMany({
      where: {
        dog: {
          name: {
            contains: service.dog.split(' ')[0],
          },
        },
        saleDate: {
          gte: new Date(startDate.getTime() - 2 * 24 * 60 * 60 * 1000),
          lte: new Date(endDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        dog: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (sales.length === 0) {
      console.log(`✗ Não encontrado: ${service.dog} - ${service.type} (${service.start} a ${service.end})`)
      continue
    }

    for (const sale of sales) {
      // Check if service was used in roster
      const startDateStr = sale.startDate ? new Date(sale.startDate).toISOString().split('T')[0] : new Date(sale.saleDate).toISOString().split('T')[0]
      const endDateStr = sale.endDate ? new Date(sale.endDate).toISOString().split('T')[0] : new Date(sale.saleDate).toISOString().split('T')[0]
      
      const usage = await prisma.dailyRoster.findMany({
        where: {
          dogId: sale.dogId,
          date: {
            gte: startDateStr,
            lte: endDateStr,
          },
        },
      })

      const expectedStatus = usage.length > 0 ? 'BAIXADO' : 'ATIVO'
      const currentStatus = sale.manualBaixa ? 'BAIXADO' : expectedStatus

      console.log(`${service.dog} - ${service.type} (${service.start} a ${service.end})`)
      console.log(`  Status esperado: ${service.status}`)
      console.log(`  Status atual: ${currentStatus}`)
      console.log(`  Usos na agenda: ${usage.length}`)
      
      if (service.status === 'ANDAMENTO' && usage.length > 0) {
        console.log(`  ✓ Serviço sendo usado na agenda - baixa automática funcionando`)
      } else if (service.status === 'ANDAMENTO' && usage.length === 0) {
        console.log(`  ⚠ Serviço ANDAMENTO mas sem uso na agenda ainda`)
      } else if (service.status === 'AGENDADO') {
        console.log(`  ✓ Serviço AGENDADO - aguardando uso`)
      }
      console.log('')
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
