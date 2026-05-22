const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Verificando roster do Sirius Black ===')
    
    const sirius = await prisma.dog.findFirst({
      where: { name: { contains: 'Sirius' } },
    })

    if (!sirius) {
      console.log('Cão Sirius não encontrado')
      return
    }

    console.log('Cão:', sirius.name)
    console.log('ID:', sirius.id)

    // Check roster entries
    const rosterEntries = await prisma.dailyRoster.findMany({
      where: { dogId: sirius.id },
      orderBy: { date: 'asc' },
    })

    console.log(`\nTotal de entradas no roster: ${rosterEntries.length}`)
    
    rosterEntries.forEach((entry) => {
      console.log(`\n--- Roster Entry ---`)
      console.log(`ID: ${entry.id}`)
      console.log(`Data: ${entry.date}`)
      console.log(`Tipo: ${entry.type}`)
      console.log(`Presente: ${entry.present}`)
      console.log(`Pernoite: ${entry.isPernoite}`)
      console.log(`Package ID: ${entry.packageId}`)
    })

    // Check tomorrow's roster
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setUTCHours(0, 0, 0, 0)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    const tomorrowEntry = await prisma.dailyRoster.findFirst({
      where: {
        dogId: sirius.id,
        date: tomorrowStr,
      },
    })

    console.log(`\n--- Amanhã (${tomorrowStr}) ---`)
    if (tomorrowEntry) {
      console.log(`Sirius está na agenda: Sim`)
      console.log(`Tipo: ${tomorrowEntry.type}`)
      console.log(`Presente: ${tomorrowEntry.present}`)
    } else {
      console.log(`Sirius está na agenda: Não`)
    }
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
