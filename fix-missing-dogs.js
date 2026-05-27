const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function analyzeAndFix() {
  console.log('🔍 Verificando cães com problemas...\n')
  
  // 1. Verificar Lara, Rock, Tsuki, Cloe
  const dogsToCheck = ['Lara', 'Rock', 'Tsuki', 'Cloe', 'Cloe Regina']
  
  console.log('1️⃣ CÃES SEM ALIMENTAÇÃO:')
  console.log('='.repeat(60))
  
  for (const name of dogsToCheck) {
    const dogs = await prisma.dog.findMany({
      where: { 
        name: { contains: name, mode: 'insensitive' }
      }
    })
    
    for (const dog of dogs) {
      const hasFood = dog.feedingType || dog.feedingInstructions
      console.log(`${hasFood ? '✅' : '❌'} ${dog.name} | Tutor: ${dog.ownerName?.split(' ')[0] || 'N/A'} | Alim: ${hasFood ? 'OK' : 'FALTANDO'}`)
      
      if (!hasFood) {
        console.log(`   ID: ${dog.id.substring(0, 8)} | Criado: ${dog.createdAt.toISOString().split('T')[0]}`)
      }
    }
  }
  
  // 2. Verificar Sirius Black
  console.log('\n2️⃣ SIRIUS BLACK:')
  console.log('='.repeat(60))
  
  const siriusDogs = await prisma.dog.findMany({
    where: {
      name: { contains: 'Sirius', mode: 'insensitive' }
    }
  })
  
  console.log(`Total encontrado: ${siriusDogs.length}`)
  for (const dog of siriusDogs) {
    console.log(`  "${dog.name}" | ID: ${dog.id.substring(0, 8)} | Tutor: ${dog.ownerName}`)
  }
  
  // 3. Verificar se existe segundo Sirius Black não cadastrado
  // Verificar na planilha de dados originais
  console.log('\n📋 VERIFICAÇÃO NECESSÁRIA:')
  console.log('Preciso verificar na base de importação se existe outro Sirius Black')
}

analyzeAndFix()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
