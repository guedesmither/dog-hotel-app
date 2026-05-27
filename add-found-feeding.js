const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const feedingUpdates = [
  {
    name: 'Charlotte',
    tutor: 'alexandra',
    feedingType: 'racao_seca',
    feedingTimesPerDay: '2',
    feedingGramsPerMeal: '200g'
  },
  {
    name: 'Nina',
    tutor: 'maisa',
    feedingType: 'racao_seca',
    feedingTimesPerDay: '3',
    feedingGramsPerMeal: '70g'
  },
  {
    name: 'Pandora',
    tutor: 'rafaella',
    feedingType: 'racao_seca',
    feedingTimesPerDay: '2',
    feedingGramsPerMeal: '110g'
  },
  {
    name: 'Sirius Black',
    tutor: 'franciele',
    feedingType: 'racao_seca',
    feedingTimesPerDay: '2',
    feedingGramsPerMeal: '120g'
  }
]

async function addFeeding() {
  console.log('Adicionando dados de alimentação encontrados...\n')
  
  for (const data of feedingUpdates) {
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
    
    if (dog.feedingType) {
      console.log(`⏭️ ${dog.name}: Já tem alimentação`)
      continue
    }
    
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
  console.log('\n⚠️ Ainda sem dados: Diana, Lolla (arquivos .eml não encontrados)')
}

addFeeding()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
