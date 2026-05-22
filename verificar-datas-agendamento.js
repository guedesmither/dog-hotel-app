const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verificar() {
  const caes = ['Ramiro', 'Maya']
  
  for (const nome of caes) {
    const dog = await prisma.dog.findFirst({
      where: { name: { contains: nome } },
      select: { id: true, name: true }
    })
    
    if (!dog) {
      console.log(`❌ ${nome} não encontrado`)
      continue
    }
    
    console.log(`\n=== ${dog.name} ===`)
    
    const stays = await prisma.stay.findMany({
      where: { 
        dogId: dog.id,
        isScheduled: true
      },
      orderBy: { scheduledCheckIn: 'desc' },
      take: 3
    })
    
    for (const stay of stays) {
      console.log(`Agendamento ID: ${stay.id}`)
      console.log(`  scheduledCheckIn: ${stay.scheduledCheckIn}`)
      console.log(`  scheduledCheckOut: ${stay.scheduledCheckOut}`)
      console.log(`  isScheduled: ${stay.isScheduled}`)
      console.log(`  active: ${stay.active}`)
      
      // Verificar como o date-fns interpretaria
      const checkIn = stay.scheduledCheckIn ? new Date(stay.scheduledCheckIn) : null
      if (checkIn) {
        console.log(`  Data convertida: ${checkIn.toISOString()}`)
        console.log(`  Dia da semana: ${checkIn.getDay()}`)
      }
      console.log('')
    }
  }
  
  await prisma.$disconnect()
}

verificar()
