const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function updateDogs() {
  console.log('Atualizando Lara e Rocky...\n')
  
  // Lara
  const lara = await prisma.dog.findFirst({
    where: { 
      name: { contains: 'Lara', mode: 'insensitive' },
      ownerName: { contains: 'Thalita', mode: 'insensitive' }
    }
  })
  
  if (lara) {
    await prisma.dog.update({
      where: { id: lara.id },
      data: {
        feedingType: 'mista',
        feedingTimesPerDay: '2',
        feedingGramsPerMeal: 'metade metade',
        feedingInstructions: 'A Lara come ração misturada. Ela pode comer frango, carne, cenoura, batata doce, xuxu, brocolis todos cozinhados e frutinhas banana, maça melão e melancia.',
        medications: 'Sem doenças',
        allergies: 'sem alergias',
        vetName: 'Autorizo veterinário parceiro AU-Ê',
        allowPool: true,
        allowPhotos: true
      }
    })
    console.log(`✅ Lara atualizada:`)
    console.log(`   Alimentação: mista`)
    console.log(`   Vezes/dia: 2x`)
    console.log(`   Instruções: OK`)
  } else {
    console.log('⚠️ Lara não encontrada')
  }
  
  // Rocky
  const rocky = await prisma.dog.findFirst({
    where: { 
      name: { contains: 'Rock', mode: 'insensitive' },
      ownerName: { contains: 'Thalita', mode: 'insensitive' }
    }
  })
  
  if (rocky) {
    await prisma.dog.update({
      where: { id: rocky.id },
      data: {
        feedingType: 'mista',
        feedingTimesPerDay: '2',
        feedingGramsPerMeal: 'metadinha metadinha',
        feedingInstructions: 'Pode dar metadinha de ração seca e metade de AN ou RN pode comer legumes cozidos e frutas',
        medications: 'Falta de ar e ronco mas por causa do fucinho mesmo!',
        allergies: 'nenhuma',
        vetName: 'Autorizo veterinário parceiro AU-Ê',
        allowPool: true,
        allowPhotos: true
      }
    })
    console.log(`\n✅ Rocky atualizado:`)
    console.log(`   Alimentação: mista`)
    console.log(`   Vezes/dia: 2x`)
    console.log(`   Instruções: OK`)
  } else {
    console.log('⚠️ Rocky não encontrado')
  }
  
  console.log('\n✅ Concluído!')
}

updateDogs()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
