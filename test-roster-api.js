const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Testando API de roster ===')
    
    // Test fetching roster for today
    const today = new Date()
    today.setUTCHours(12, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    console.log('Buscando agenda para:', todayStr)
    
    const entries = await prisma.dailyRoster.findMany({
      where: { date: todayStr },
      include: { dog: true },
    })
    
    console.log(`Entradas para hoje (${todayStr}):`, entries.length)
    entries.forEach(e => console.log(`  ${e.dog.name} - ${e.type} - ${e.source}`))
    
    // Check if there are any dogs with scheduledDays for today
    const dayName = today.toLocaleDateString('pt-BR', { weekday: 'long' })
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1)
    console.log(`\nDia da semana: ${capitalizedDay}`)
    
    const dogsWithScheduledDays = await prisma.dog.findMany({
      where: {
        isActive: true,
        scheduledDays: { contains: capitalizedDay },
      },
      select: { id: true, name: true, scheduledDays: true },
    })
    
    console.log(`Cães com scheduledDays para ${capitalizedDay}:`, dogsWithScheduledDays.length)
    dogsWithScheduledDays.forEach(d => console.log(`  ${d.name} - ${d.scheduledDays}`))
    
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
