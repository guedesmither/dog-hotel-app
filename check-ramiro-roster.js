const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Verificando situação do Ramiro ===')
    
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
      },
    })

    if (!ramiro) {
      console.log('Cão Ramiro não encontrado')
      return
    }

    console.log('Cão:', ramiro.name)
    console.log('ID:', ramiro.id)

    // Check roster entries
    const rosterEntries = await prisma.dailyRoster.findMany({
      where: { dogId: ramiro.id },
      orderBy: { date: 'asc' },
    })

    console.log(`\nTotal de entradas no roster: ${rosterEntries.length}`)
    
    rosterEntries.forEach((entry) => {
      console.log(`\n--- Roster Entry ---`)
      console.log(`Data: ${entry.date}`)
      console.log(`Tipo: ${entry.type}`)
      console.log(`Presente: ${entry.present}`)
    })

    // Check tomorrow's roster
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setUTCHours(0, 0, 0, 0)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    const tomorrowEntry = await prisma.dailyRoster.findFirst({
      where: {
        dogId: ramiro.id,
        date: tomorrowStr,
      },
    })

    console.log(`\n--- Amanhã (${tomorrowStr}) ---`)
    if (tomorrowEntry) {
      console.log(`Ramiro está na agenda: Sim`)
      console.log(`Tipo: ${tomorrowEntry.type}`)
      console.log(`Presente: ${tomorrowEntry.present}`)
    } else {
      console.log(`Ramiro está na agenda: Não`)
    }

    // Check stays
    const stays = await prisma.stay.findMany({
      where: { dogId: ramiro.id },
      orderBy: { scheduledCheckIn: 'desc' },
    })

    console.log(`\n--- Estadias ---`)
    stays.forEach((stay) => {
      console.log(`Check-in: ${stay.scheduledCheckIn}`)
      console.log(`Check-out: ${stay.scheduledCheckOut}`)
      console.log(`Ativa: ${stay.active}`)
      console.log(`Agendada: ${stay.isScheduled}`)
    })
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
