const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function removeDuplicateJupiter() {
  console.log('🔍 Buscando Júpiter duplicado...\n')
  
  // Buscar TODOS os cães
  const allDogs = await prisma.dog.findMany({
    orderBy: { name: 'asc' }
  })
  
  // Filtrar os que contêm "jpiter" (case insensitive)
  const jupiters = allDogs.filter(d => 
    d.name.toLowerCase().includes('jpiter') || 
    d.name.toLowerCase().includes('jupiter')
  )
  
  console.log(`Encontrados ${jupiters.length} registro(s):\n`)
  
  for (const j of jupiters) {
    console.log(`ID: ${j.id}`)
    console.log(`Nome: "${j.name}"`)
    console.log(`Tutor: ${j.ownerName || 'N/A'}`)
    console.log(`Raça: ${j.breed || 'N/A'}`)
    console.log(`Telefone: ${j.ownerPhone || 'N/A'}`)
    console.log(`---`)
  }
  
  // Identificar o duplicado (o que tem "Tutor pendente")
  const duplicate = jupiters.find(j => 
    j.ownerName === 'Tutor pendente' || 
    j.breed === 'o_seca' ||
    j.name === 'Jpiter'
  )
  
  // Identificar o correto (o que tem dados completos)
  const correct = jupiters.find(j => 
    j.ownerName && j.ownerName !== 'Tutor pendente' &&
    j.breed && j.breed !== 'o_seca'
  )
  
  if (duplicate) {
    console.log(`\n❌ Removendo duplicado: "${duplicate.name}" (ID: ${duplicate.id.substring(0, 8)})`)
    console.log(`   Tutor: ${duplicate.ownerName}`)
    console.log(`   Raça: ${duplicate.breed}`)
    
    await prisma.dog.delete({ where: { id: duplicate.id } })
    console.log(`   ✅ Removido!`)
  }
  
  if (correct && correct.name !== 'Júpiter') {
    console.log(`\n✏️ Corrigindo nome do correto: "${correct.name}" -> "Júpiter"`)
    await prisma.dog.update({
      where: { id: correct.id },
      data: { name: 'Júpiter' }
    })
  }
  
  console.log('\n✅ Limpeza concluída!')
}

removeDuplicateJupiter()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
