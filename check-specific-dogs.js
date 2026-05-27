const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDogs() {
  console.log('🔍 Verificando Betina, Lara e Rock...\n')
  
  const dogsToCheck = ['Betina', 'Lara', 'Rock']
  
  for (const name of dogsToCheck) {
    const dogs = await prisma.dog.findMany({
      where: { 
        name: { contains: name, mode: 'insensitive' }
      }
    })
    
    console.log(`\n📋 ${name}:`)
    console.log('-'.repeat(60))
    
    for (const dog of dogs) {
      console.log(`  Nome: ${dog.name}`)
      console.log(`  Tutor: ${dog.ownerName}`)
      console.log(`  Raça: ${dog.breed || 'N/A'}`)
      console.log(`  Alimentação: ${dog.feedingType || '❌ NÃO TEM'}`)
      console.log(`  Instruções: ${dog.feedingInstructions || 'N/A'}`)
      console.log(`  Vezes/dia: ${dog.feedingTimesPerDay || 'N/A'}`)
      console.log(`  Gramas: ${dog.feedingGramsPerMeal || 'N/A'}`)
      console.log(`  Medicações: ${dog.medications || 'N/A'}`)
      console.log(`  Alergias: ${dog.allergies || 'N/A'}`)
      console.log('')
    }
  }
}

checkDogs()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
