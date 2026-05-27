const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Dados do segundo Sirius Black
const siriusBlack2 = {
  name: 'Sirius Black',
  breed: 'SRD',
  sex: 'macho',
  size: 'medio',
  ownerName: 'Franciele',
  ownerEmail: 'fran.did@gmail.com',
  ownerPhone: '11982550628',
  birthDate: '2 anos e 2 meses',
  serviceType: 'Creche',
  isBolsista: false,
  dogStatus: 'ATIVO'
  // Sem dados de alimentação conforme solicitado
}

async function addMissingSirius() {
  console.log('🔍 Verificando Sirius Black...\n')
  
  // Verificar se já existe Sirius Black com tutor Franciele
  const existing = await prisma.dog.findFirst({
    where: {
      name: { contains: 'Sirius', mode: 'insensitive' },
      ownerName: { contains: 'Franciele', mode: 'insensitive' }
    }
  })
  
  if (existing) {
    console.log(`✅ Sirius Black (Franciele) já existe: ${existing.name}`)
    return
  }
  
  // Verificar outro Sirius Black
  const otherSirius = await prisma.dog.findFirst({
    where: { name: { contains: 'Sirius', mode: 'insensitive' } }
  })
  
  if (otherSirius) {
    console.log(`ℹ️ Outro Sirius Black encontrado: ${otherSirius.name} - Tutor: ${otherSirius.ownerName}`)
  }
  
  // Criar segundo Sirius Black
  console.log('\n🆕 Criando segundo Sirius Black...')
  const newDog = await prisma.dog.create({
    data: siriusBlack2
  })
  
  console.log(`✅ Criado: "${newDog.name}" (ID: ${newDog.id.substring(0, 8)})`)
  console.log(`   Tutor: ${newDog.ownerName}`)
  console.log(`   Telefone: ${newDog.ownerPhone}`)
}

async function checkFeedingData() {
  console.log('\n\n🔍 Verificando dados de alimentação...\n')
  
  const dogsToCheck = [
    { name: 'Lara', searchName: 'Lara' },
    { name: 'Rocky', searchName: 'Rock' },
    { name: 'Tsuki', searchName: 'Tsuki' },
    { name: 'Cloe', searchName: 'Cloe' }
  ]
  
  for (const { name, searchName } of dogsToCheck) {
    const dogs = await prisma.dog.findMany({
      where: { name: { contains: searchName, mode: 'insensitive' } }
    })
    
    for (const dog of dogs) {
      const hasFood = dog.feedingType || dog.feedingInstructions || dog.feedingGramsPerMeal
      console.log(`${hasFood ? '✅' : '❌'} ${dog.name} | Tutor: ${dog.ownerName?.split(' ')[0] || 'N/A'} | Alim: ${hasFood ? 'OK' : 'FALTANDO'}`)
    }
  }
  
  console.log('\n📋 Nota: Algumas fichas de email podem não ter dados de alimentação.')
  console.log('Se precisar adicionar dados manualmente, me informe as informações.')
}

async function main() {
  await addMissingSirius()
  await checkFeedingData()
  console.log('\n✅ Processo concluído!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
