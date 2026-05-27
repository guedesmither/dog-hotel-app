const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkInstructions() {
  console.log('🔍 Verificando cães SEM instruções de alimentação...\n')
  
  const dogs = await prisma.dog.findMany({
    where: {
      feedingType: { not: null },
      OR: [
        { feedingInstructions: null },
        { feedingInstructions: '' }
      ]
    }
  })
  
  console.log(`Cães com alimentação mas SEM instruções: ${dogs.length}\n`)
  
  for (const dog of dogs) {
    console.log(`- ${dog.name} (Tutor: ${dog.ownerName?.split(' ')[0]})`)
    console.log(`  Tipo: ${dog.feedingType}, Vezes: ${dog.feedingTimesPerDay}x, Gramas: ${dog.feedingGramsPerMeal}`)
    console.log('')
  }
  
  if (dogs.length === 0) {
    console.log('✅ Todos os cães com alimentação possuem instruções!')
  }
}

checkInstructions()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
