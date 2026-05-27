const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const feedingData = [
  { name: 'Lara', tutor: 'Thalita', feedingType: 'racao_seca', feedingTimesPerDay: '2', feedingGramsPerMeal: '100g' },
  { name: 'Rocky', tutor: 'Thalita', feedingType: 'racao_seca', feedingTimesPerDay: '2', feedingGramsPerMeal: '150g' },
  { name: 'Tsuki', tutor: 'Neusa', feedingType: 'racao_seca', feedingTimesPerDay: '2', feedingGramsPerMeal: '80g' },
  { name: 'Cloe', tutor: 'Aline', feedingType: 'racao_seca', feedingTimesPerDay: '2', feedingGramsPerMeal: '120g' }
]

async function addFeedingData() {
  console.log('Adicionando dados de alimentação...\n')
  
  for (const data of feedingData) {
    const dog = await prisma.dog.findFirst({
      where: {
        name: { contains: data.name, mode: 'insensitive' },
        ownerName: { contains: data.tutor, mode: 'insensitive' }
      }
    })
    
    if (!dog) {
      console.log(`⚠️ ${data.name} (${data.tutor}) não encontrado`)
      continue
    }
    
    // Verificar se já tem dados
    if (dog.feedingType) {
      console.log(`⏭️ ${dog.name}: Já tem alimentação (${dog.feedingType})`)
      continue
    }
    
    // Adicionar dados
    await prisma.dog.update({
      where: { id: dog.id },
      data: {
        feedingType: data.feedingType,
        feedingTimesPerDay: data.feedingTimesPerDay,
        feedingGramsPerMeal: data.feedingGramsPerMeal,
        vetName: 'Autorizo veterinário parceiro AU-Ê'
      }
    })
    
    console.log(`✅ ${dog.name}: ${data.feedingType} ${data.feedingTimesPerDay}x ${data.feedingGramsPerMeal}`)
  }
  
  console.log('\n✅ Concluído!')
}

addFeedingData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
