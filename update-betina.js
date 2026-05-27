const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function updateBetina() {
  console.log('Atualizando Betina...\n')
  
  const betina = await prisma.dog.findFirst({
    where: { name: { contains: 'Betina', mode: 'insensitive' } }
  })
  
  if (!betina) {
    console.log('❌ Betina não encontrada')
    return
  }
  
  await prisma.dog.update({
    where: { id: betina.id },
    data: {
      feedingTimesPerDay: '3',
      feedingGramsPerMeal: '60g',
      feedingInstructions: 'Vou levar almoço já na quantidade que ela come, ração seca, só misturar com a úmida. Para comer as 11:00 hs. As 13:00 hs umas cenouras cozidas e umas 15:00 hs batata doce cozida Entre os horarios',
      vetName: 'Meu veterinário:',
      allowPool: true,
      allowPhotos: true
    }
  })
  
  console.log(`✅ Betina atualizada:`)
  console.log(`   Alimentação: ração seca`)
  console.log(`   Vezes/dia: 3x`)
  console.log(`   Gramas: 60g`)
  console.log(`   Instruções: OK`)
}

updateBetina()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
