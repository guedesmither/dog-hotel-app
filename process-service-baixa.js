const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('=== Processando baixa manual de serviços com status OK ===\n')

  // Tabela fornecida pelo usuário
  const services = [
    { dog: 'Sol', owner: 'Carla', type: 'Hotel', start: '12/02/2026', end: '15/02/2026', status: 'OK' },
    { dog: 'Luna', owner: 'Tássia', type: 'Daycare', start: '27/02/2026', end: '27/02/2026', status: 'OK' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Hotel', start: '28/02/2026', end: '02/03/2026', status: 'OK' },
    { dog: 'Dory', owner: 'Valéria Bellato', type: 'Creche', start: '03/03/2026', end: '31/03/2026', status: 'OK' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Hotel', start: '05/03/2026', end: '07/03/2026', status: 'OK' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Creche', start: '11/03/2026', end: '08/04/2026', status: 'OK' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Hotel', start: '14/03/2026', end: '16/03/2026', status: 'OK' },
    { dog: 'Baruc', owner: 'Débora Dantas', type: 'Pacote', start: '16/03/2026', end: '16/09/2026', status: 'OK' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Hotel', start: '17/03/2026', end: '20/03/2026', status: 'OK' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Pernoite', start: '18/03/2026', end: '19/03/2026', status: 'OK' },
    { dog: 'Ramiro', owner: 'Barbara Gomes', type: 'Hotel', start: '20/03/2026', end: '23/03/2026', status: 'OK' },
    { dog: 'Mel', owner: 'Alcides', type: 'Hotel', start: '21/03/2026', end: '22/03/2026', status: 'OK' },
    { dog: 'Theodoro', owner: 'Vitoria Koyama', type: 'Creche', start: '24/03/2026', end: '23/04/2026', status: 'OK' },
    { dog: 'Luna', owner: 'Tássia', type: 'Hotel', start: '24/03/2026', end: '03/04/2026', status: 'OK' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Pernoite', start: '24/03/2026', end: '25/03/2026', status: 'OK' },
    { dog: 'Romain', owner: 'Gabriel Montanher', type: 'Creche', start: '25/03/2026', end: '24/04/2026', status: 'OK' },
    { dog: 'Theo', owner: 'Gabriel Montanher', type: 'Creche', start: '25/03/2026', end: '24/04/2026', status: 'OK' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Hotel', start: '25/03/2026', end: '26/03/2026', status: 'OK' },
    { dog: 'Betina', owner: 'Eunira Keiko', type: 'Daycare', start: '28/03/2026', end: '28/03/2026', status: 'OK' },
    { dog: 'Jack Sparrow', owner: 'Maria Gabriela', type: 'Pacote', start: '28/03/2026', end: '28/09/2026', status: '3/5' },
    { dog: 'Annie Bonny', owner: 'Maria Gabriela', type: 'Pacote', start: '28/03/2026', end: '28/09/2026', status: '3/5' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Hotel', start: '28/03/2026', end: '30/03/2026', status: 'OK' },
    { dog: 'Tobias', owner: 'Silvana Cobo', type: 'Creche', start: '31/03/2026', end: '30/04/2026', status: 'OK' },
    { dog: 'Sol', owner: 'Carla', type: 'Hotel', start: '02/04/2026', end: '05/04/2026', status: 'OK' },
    { dog: 'Baruc', owner: 'Débora Dantas', type: 'Daycare', start: '02/04/2026', end: '02/04/2026', status: 'OK' },
    { dog: 'Baruc', owner: 'Débora Dantas', type: 'Hotel', start: '03/04/2026', end: '04/04/2026', status: 'OK' },
    { dog: 'Thifany', owner: 'Roselaine da Mota', type: 'Hotel', start: '04/04/2026', end: '05/04/2026', status: 'OK' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Hotel', start: '04/04/2026', end: '06/04/2026', status: 'OK' },
    { dog: 'Mel', owner: 'Jeniffer Lemes', type: 'Hotel', start: '09/04/2026', end: '10/04/2026', status: 'OK' },
    { dog: 'Jack Sparrow', owner: 'Maria Gabriela', type: 'Hotel', start: '11/04/2026', end: '17/04/2026', status: 'OK' },
    { dog: 'Annie Bonny', owner: 'Maria Gabriela', type: 'Hotel', start: '11/04/2026', end: '17/04/2026', status: 'OK' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Hotel', start: '11/04/2026', end: '13/04/2026', status: 'OK' },
    { dog: 'Luna', owner: 'Tássia', type: 'Daycare', start: '14/04/2026', end: '14/04/2026', status: 'OK' },
    { dog: 'Thifany', owner: 'Roselaine da Mota', type: 'Daycare', start: '15/04/2026', end: '15/04/2026', status: 'OK' },
    { dog: 'Ramiro', owner: 'Barbara Gomes', type: 'Hotel', start: '17/04/2026', end: '22/04/2026', status: 'OK' },
    { dog: 'Maya', owner: 'Leonardo', type: 'Daycare', start: '18/04/2026', end: '18/04/2026', status: 'OK' },
    { dog: 'Maya', owner: 'Leonardo', type: 'Banho', start: '18/04/2026', end: '18/04/2026', status: 'OK' },
    { dog: 'Hera', owner: 'Ionice Leite', type: 'Banho', start: '18/04/2026', end: '18/04/2026', status: 'OK' },
    { dog: 'Suzy', owner: 'Ionice Leite', type: 'Banho', start: '18/04/2026', end: '18/04/2026', status: 'OK' },
    { dog: 'Belinha', owner: 'Ionice Leite', type: 'Banho', start: '18/04/2026', end: '18/04/2026', status: 'OK' },
    { dog: 'Thifany', owner: 'Roselaine da Mota', type: 'Hotel', start: '20/04/2026', end: '21/04/2026', status: 'OK' },
    { dog: 'Sirius Black', owner: 'Aline Porto', type: 'Hotel', start: '21/04/2026', end: '22/04/2026', status: 'OK' },
    { dog: 'Bucky', owner: 'Lucas de Carvalho Xavier', type: 'Hotel', start: '24/04/2026', end: '27/04/2026', status: 'OK' },
    { dog: 'Ramiro', owner: 'Barbara Gomes', type: 'Hotel', start: '24/04/2026', end: '26/04/2026', status: 'OK' },
  ]

  let baixados = 0
  let naoEncontrados = 0

  for (const service of services) {
    if (service.status !== 'OK') continue

    // Parse dates
    const parseDate = (dateStr) => {
      const parts = dateStr.split('/')
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    }

    const startDate = parseDate(service.start)
    const endDate = parseDate(service.end)

    // Find matching sale - more flexible search
    const sales = await prisma.sales.findMany({
      where: {
        dog: {
          name: {
            contains: service.dog.split(' ')[0], // Use first name for flexibility
          },
        },
        saleDate: {
          gte: new Date(startDate.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days before
          lte: new Date(endDate.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days after
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
      naoEncontrados++
      continue
    }

    // Mark all matching sales as manually completed
    for (const sale of sales) {
      if (sale.manualBaixa) {
        console.log(`- Já baixado: ${sale.dog.name} - ${sale.saleType} (${sale.saleDate})`)
        continue
      }

      await prisma.sales.update({
        where: { id: sale.id },
        data: {
          manualBaixa: true,
          manualBaixaDate: new Date(),
        },
      })

      console.log(`✓ Baixado: ${sale.dog.name} - ${sale.saleType} (${sale.saleDate})`)
      baixados++
    }
  }

  console.log(`\n=== Resumo ===`)
  console.log(`✓ Serviços baixados: ${baixados}`)
  console.log(`✗ Não encontrados: ${naoEncontrados}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
