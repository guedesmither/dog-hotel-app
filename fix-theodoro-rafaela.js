const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixTheodoroRafaela() {
  console.log('🔧 Removendo dados do Theodoro da Rafaela...\n')
  
  // Buscar o Theodoro da Rafaela
  const theodoroRafaela = await prisma.dog.findFirst({
    where: {
      name: 'Theodoro',
      ownerName: { contains: 'Rafaela', mode: 'insensitive' }
    }
  })
  
  if (!theodoroRafaela) {
    console.log('❌ Theodoro da Rafaela não encontrado')
    return
  }
  
  console.log(`Encontrado: "${theodoroRafaela.name}" (ID: ${theodoroRafaela.id.substring(0, 8)})`)
  console.log(`Tutor: ${theodoroRafaela.ownerName}`)
  console.log(`\nDados atuais:`)
  console.log(`  Alimentação: ${theodoroRafaela.feedingType || 'N/A'}`)
  console.log(`  Instruções: ${theodoroRafaela.feedingInstructions || 'N/A'}`)
  console.log(`  Vezes/dia: ${theodoroRafaela.feedingTimesPerDay || 'N/A'}`)
  console.log(`  Gramas: ${theodoroRafaela.feedingGramsPerMeal || 'N/A'}`)
  console.log(`  Medicações: ${theodoroRafaela.medications || 'N/A'}`)
  console.log(`  Alergias: ${theodoroRafaela.allergies || 'N/A'}`)
  console.log(`  Veterinário: ${theodoroRafaela.vetName || 'N/A'}`)
  
  // Remover dados adicionais (deixar só dados básicos)
  await prisma.dog.update({
    where: { id: theodoroRafaela.id },
    data: {
      feedingType: null,
      feedingInstructions: null,
      feedingTimesPerDay: null,
      feedingGramsPerMeal: null,
      medications: null,
      allergies: null,
      vetName: null
    }
  })
  
  console.log(`\n✅ Dados adicionais removidos!`)
  console.log(`O Theodoro da Rafaela agora está sem informações de alimentação/medicação.`)
}

fixTheodoroRafaela()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
