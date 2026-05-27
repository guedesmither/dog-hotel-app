const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const bolsistasCorreto = [
  { name: 'Cacau', feedingGramsPerMeal: '50g', feedingTimesPerDay: '2' },
  { name: 'Sambô', feedingGramsPerMeal: '200g', feedingTimesPerDay: '2' },
  { name: 'Auê', feedingGramsPerMeal: '200g', feedingTimesPerDay: '2' },
  { name: 'Teobaldo', feedingGramsPerMeal: '80g', feedingTimesPerDay: '2' },
  { name: 'Belinha', feedingGramsPerMeal: '20g', feedingTimesPerDay: '3' },
  { name: 'Hera', feedingGramsPerMeal: '80g', feedingTimesPerDay: '3' },
  { name: 'Suzy', feedingGramsPerMeal: '80g', feedingTimesPerDay: '3' },
]

async function updateBolsistas() {
  console.log('Atualizando quantidades dos bolsistas...\n')
  
  for (const data of bolsistasCorreto) {
    const dog = await prisma.dog.findFirst({
      where: { name: data.name, isBolsista: true }
    })
    
    if (dog) {
      await prisma.dog.update({
        where: { id: dog.id },
        data: {
          feedingGramsPerMeal: data.feedingGramsPerMeal,
          feedingTimesPerDay: data.feedingTimesPerDay
        }
      })
      console.log(`✅ ${data.name}: ${data.feedingGramsPerMeal} ${data.feedingTimesPerDay}x ao dia`)
    } else {
      console.log(`⚠️ ${data.name}: Não encontrado`)
    }
  }
  
  console.log('\n✅ Atualização concluída!')
}

updateBolsistas()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
