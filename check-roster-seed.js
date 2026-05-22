const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Check if Thursday 2026-05-08 is already seeded
  const seed = await prisma.dailyRosterSeed.findUnique({
    where: { date: '2026-05-08' },
  })

  console.log('=== VERIFICAÇÃO DE SEED DATA ===')
  console.log('Data: 2026-05-08 (quinta-feira)')
  console.log('Seed existe?', seed ? 'SIM' : 'NÃO')
  if (seed) {
    console.log('Data do seed:', seed.date)
  }

  // Check roster entries for Sol on that date
  const rosterEntries = await prisma.dailyRoster.findMany({
    where: {
      date: '2026-05-08',
    },
    include: {
      dog: {
        select: {
          id: true,
          name: true,
          serviceType: true,
          scheduledDays: true,
        },
      },
    },
  })

  console.log('\n=== ENTRADAS NO ROSTER PARA 2026-05-08 ===')
  console.log('Total de entradas:', rosterEntries.length)
  
  rosterEntries.forEach((entry, index) => {
    console.log(`\nEntrada ${index + 1}:`)
    console.log('  Cão:', entry.dog.name)
    console.log('  Tipo de serviço:', entry.dog.serviceType)
    console.log('  Dias agendados:', entry.dog.scheduledDays)
    console.log('  Tipo de entrada:', entry.type)
    console.log('  Origem:', entry.source)
    console.log('  Presente:', entry.present)
    console.log('  Pernoite:', entry.isPernoite)
    console.log('  Package ID:', entry.packageId)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
