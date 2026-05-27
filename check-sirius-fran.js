const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkSirius() {
  console.log('🔍 Verificando Sirius Black da Franciele...\n')
  
  const siriusFran = await prisma.dog.findFirst({
    where: {
      name: { contains: 'Sirius', mode: 'insensitive' },
      ownerName: { contains: 'Franciele', mode: 'insensitive' }
    }
  })
  
  if (siriusFran) {
    console.log('✅ ENCONTRADO:')
    console.log(`  ID: ${siriusFran.id}`)
    console.log(`  Nome: ${siriusFran.name}`)
    console.log(`  Tutor: ${siriusFran.ownerName}`)
    console.log(`  Raça: ${siriusFran.breed}`)
    console.log(`  Alimentação: ${siriusFran.feedingType || 'N/A'}`)
    console.log(`  Vezes: ${siriusFran.feedingTimesPerDay || 'N/A'}`)
    console.log(`  Gramas: ${siriusFran.feedingGramsPerMeal || 'N/A'}`)
    console.log(`  Instruções: ${siriusFran.feedingInstructions ? '✅' : '❌'}`)
    console.log(`  Criado em: ${siriusFran.createdAt}`)
  } else {
    console.log('❌ Sirius Black (Franciele) NÃO ENCONTRADO no banco!')
    
    // Listar todos os Sirius
    console.log('\n📋 Todos os Sirius no banco:')
    const allSirius = await prisma.dog.findMany({
      where: { name: { contains: 'Sirius', mode: 'insensitive' } }
    })
    for (const s of allSirius) {
      console.log(`  - ${s.name} | ${s.ownerName} | ID: ${s.id.substring(0,8)}`)
    }
  }
}

checkSirius()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
