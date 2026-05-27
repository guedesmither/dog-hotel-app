const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixJupiter() {
  console.log('🔍 Verificando Júpiters...\n')
  
  // Buscar todos os cães com nome similar a Júpiter
  const jupiters = await prisma.dog.findMany({
    where: {
      OR: [
        { name: { contains: 'Jupiter', mode: 'insensitive' } },
        { name: { contains: 'Jpiter', mode: 'insensitive' } },
        { name: { contains: 'Júpiter', mode: 'insensitive' } }
      ]
    },
    include: {
      stays: { where: { active: true } },
    }
  })
  
  console.log(`Encontrados ${jupiters.length} registro(s) de Júpiter:\n`)
  
  for (const j of jupiters) {
    const hasData = j.feedingType || j.medications || j.allergies
    const hasStays = j.stays.length > 0
    console.log(`ID: ${j.id}`)
    console.log(`Nome: "${j.name}"`)
    console.log(`Tutor: ${j.ownerName}`)
    console.log(`Dados: ${hasData ? '✅' : '❌'}`)
    console.log(`Estadia ativa: ${hasStays ? '✅' : '❌'}`)
    console.log(`Criado em: ${j.createdAt}`)
    console.log('-'.repeat(50))
  }
  
  if (jupiters.length > 1) {
    // Ordenar: prioridade para quem tem dados ou estadia
    const sorted = jupiters.sort((a, b) => {
      const aHasData = (a.feedingType || a.medications) ? 1 : 0
      const bHasData = (b.feedingType || b.medications) ? 1 : 0
      const aHasStays = a.stays.length
      const bHasStays = b.stays.length
      
      if (bHasData !== aHasData) return bHasData - aHasData
      if (bHasStays !== aHasStays) return bHasStays - aHasStays
      return 0
    })
    
    const keep = sorted[0]
    const remove = sorted.slice(1)
    
    console.log(`\n✅ Manter: "${keep.name}" (ID: ${keep.id.substring(0, 8)})`)
    
    // Corrigir nome se necessário
    if (keep.name !== 'Júpiter') {
      await prisma.dog.update({
        where: { id: keep.id },
        data: { name: 'Júpiter' }
      })
      console.log(`   Nome corrigido para: "Júpiter"`)
    }
    
    // Remover duplicados
    for (const dup of remove) {
      console.log(`\n❌ Removendo duplicado: "${dup.name}" (ID: ${dup.id.substring(0, 8)})`)
      await prisma.dog.delete({ where: { id: dup.id } })
    }
    
    console.log(`\n✅ ${remove.length} Júpiter(s) duplicado(s) removido(s)!`)
  } else if (jupiters.length === 1) {
    // Só tem um, verificar se nome está correto
    if (jupiters[0].name !== 'Júpiter') {
      await prisma.dog.update({
        where: { id: jupiters[0].id },
        data: { name: 'Júpiter' }
      })
      console.log(`\n✅ Nome corrigido para: "Júpiter"`)
    }
  } else {
    console.log('\n⚠️ Nenhum Júpiter encontrado!')
  }
}

fixJupiter()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
