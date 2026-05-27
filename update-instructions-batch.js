const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const updates = [
  { name: 'Charlotte', tutor: 'alexandra', instructions: 'Vou levar a ração já separada' },
  { name: 'Baruc', tutor: 'débora', instructions: 'Alimentação conforme necessidade' },
  { name: 'Romain', tutor: 'gabriel', instructions: 'Alimentação padrão' },
  { name: 'Mel', tutor: 'jeniffer', instructions: 'Alimentação conforme necessidade' },
  { name: 'Leonardo', tutor: 'thaís', instructions: 'Alimentação conforme necessidade' },
  { name: 'Sol', tutor: 'carla', instructions: 'Alimentação conforme necessidade' },
  { name: 'Pandora', tutor: 'rafaella', instructions: 'Alimentação conforme necessidade' },
  { name: 'Cloe Regina', tutor: 'aline', instructions: 'Alimentação conforme necessidade' }
]

async function applyUpdates() {
  console.log('Atualizando instruções...\n')
  
  for (const data of updates) {
    const dog = await prisma.dog.findFirst({
      where: {
        name: { contains: data.name, mode: 'insensitive' },
        ownerName: { contains: data.tutor, mode: 'insensitive' }
      }
    })
    
    if (dog && !dog.feedingInstructions) {
      await prisma.dog.update({
        where: { id: dog.id },
        data: { feedingInstructions: data.instructions }
      })
      console.log(`✅ ${dog.name}: ${data.instructions.substring(0, 50)}...`)
    } else if (dog?.feedingInstructions) {
      console.log(`⏭️ ${dog.name}: Já tem instruções`)
    } else {
      console.log(`⚠️ ${data.name}: Não encontrado`)
    }
  }
  
  console.log('\n✅ Concluído!')
}

applyUpdates()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
