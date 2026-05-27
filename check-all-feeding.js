const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAllFeeding() {
  console.log('📊 RELATÓRIO DE ALIMENTAÇÃO - TODOS OS CÃES\n')
  console.log('=' .repeat(80))
  
  const allDogs = await prisma.dog.findMany({
    orderBy: { name: 'asc' }
  })
  
  let withFeeding = 0
  let withoutFeeding = 0
  let bolsistas = 0
  
  console.log(`\nTotal de cães: ${allDogs.length}\n`)
  
  // Separar por status
  const comAlimentacao = []
  const semAlimentacao = []
  
  for (const dog of allDogs) {
    const hasFeeding = dog.feedingType || dog.feedingInstructions || dog.feedingGramsPerMeal
    
    if (hasFeeding) {
      withFeeding++
      comAlimentacao.push(dog)
    } else {
      withoutFeeding++
      semAlimentacao.push(dog)
    }
    
    if (dog.isBolsista) bolsistas++
  }
  
  // Mostrar cães COM alimentação
  console.log(`✅ CÃES COM ALIMENTAÇÃO (${withFeeding}):`)
  console.log('-' .repeat(80))
  for (const dog of comAlimentacao) {
    const type = dog.feedingType || 'N/A'
    const times = dog.feedingTimesPerDay || 'N/A'
    const grams = dog.feedingGramsPerMeal || 'N/A'
    const bolsista = dog.isBolsista ? '⭐' : ' '
    console.log(`${bolsista} ${dog.name.padEnd(25)} | ${type.padEnd(15)} | ${times}x | ${grams}`)
  }
  
  // Mostrar cães SEM alimentação
  if (semAlimentacao.length > 0) {
    console.log(`\n❌ CÃES SEM ALIMENTAÇÃO (${withoutFeeding}):`)
    console.log('-' .repeat(80))
    for (const dog of semAlimentacao) {
      const bolsista = dog.isBolsista ? '⭐' : ' '
      console.log(`${bolsista} ${dog.name.padEnd(25)} | Tutor: ${dog.ownerName?.substring(0, 20) || 'N/A'}`)
    }
  }
  
  // Resumo
  console.log('\n' + '=' .repeat(80))
  console.log('📈 RESUMO:')
  console.log(`   Total: ${allDogs.length}`)
  console.log(`   Com alimentação: ${withFeeding} (${Math.round(withFeeding/allDogs.length*100)}%)`)
  console.log(`   Sem alimentação: ${withoutFeeding}`)
  console.log(`   Bolsistas: ${bolsistas}`)
}

checkAllFeeding()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
