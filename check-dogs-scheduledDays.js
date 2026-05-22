const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Verificando scheduledDays dos cães ===')
    
    const dogs = await prisma.dog.findMany({
      where: { isActive: true },
      select: { id: true, name: true, scheduledDays: true, serviceType: true },
    })
    
    console.log(`Total de cães ativos: ${dogs.length}`)
    console.log('\nCães com scheduledDays:')
    dogs.forEach(d => {
      if (d.scheduledDays) {
        console.log(`  ${d.name} - ${d.serviceType} - ${d.scheduledDays}`)
      }
    })
    
    console.log('\nCães SEM scheduledDays:')
    dogs.forEach(d => {
      if (!d.scheduledDays) {
        console.log(`  ${d.name} - ${d.serviceType}`)
      }
    })
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
