const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function applyFixes() {
  console.log('🔧 APLICANDO CORREÇÕES...\n')
  
  // 1. Corrigir encoding nos nomes
  const encodingFixes = [
    { id: 'c6ec19b8994e9f5495b3b3d', name: 'Sambô' }, // Smb
    { id: 'cmox5zg520008gnqsaf9nbywy', name: 'Ramiro' }, // já corrigido
  ]
  
  for (const fix of encodingFixes) {
    try {
      const dog = await prisma.dog.findUnique({ where: { id: fix.id } })
      if (dog && dog.name !== fix.name) {
        await prisma.dog.update({
          where: { id: fix.id },
          data: { name: fix.name }
        })
        console.log(`✅ Corrigido: "${dog.name}" -> "${fix.name}"`)
      }
    } catch (e) {
      console.log(`❌ Erro ao corrigir ${fix.name}:`, e.message)
    }
  }
  
  // 2. Verificar cães criados recentemente nas fichas que podem ser duplicados
  // Lista de cães que foram criados nas últimas importações e precisam ser verificados
  const recentCreated = [
    'Cacau Cristina', // pode ser duplicado de Cacau
  ]
  
  console.log('\n📋 CÃES CRIADOS RECENTEMENTE (verificar se são duplicados):')
  for (const name of recentCreated) {
    const dogs = await prisma.dog.findMany({
      where: { name: { contains: name.replace('Cristina', '').trim(), mode: 'insensitive' } }
    })
    
    if (dogs.length > 1) {
      console.log(`\n⚠️  "${name}" pode ter duplicado:`)
      for (const d of dogs) {
        const isBolsista = d.isBolsista ? '⭐' : ' '
        console.log(`   ${isBolsista} "${d.name}" (ID: ${d.id.substring(0, 8)}) - Tutor: ${d.ownerName}`)
      }
    }
  }
  
  // 3. Mostrar status final dos bolsistas
  console.log('\n⭐ STATUS DOS BOLSISTAS:')
  const bolsistas = await prisma.dog.findMany({
    where: { isBolsista: true },
    select: { id: true, name: true, ownerName: true, feedingType: true, medications: true, allergies: true, vetName: true }
  })
  
  for (const b of bolsistas) {
    const hasAlim = b.feedingType ? '✅' : '❌'
    const hasMed = b.medications ? '✅' : '❌'
    const hasAler = b.allergies ? '✅' : '❌'
    const hasVet = b.vetName ? '✅' : '❌'
    console.log(`${b.name.padEnd(15)} | Tutor: ${b.ownerName?.split(' ')[0].padEnd(10)} | Alim:${hasAlim} Med:${hasMed} Aler:${hasAler} Vet:${hasVet}`)
  }
  
  // 4. Verificar cães sem tutor definido (criados em importação)
  console.log('\n⚠️  CÃES SEM TUTOR DEFINIDO (possivelmente criados por importação):')
  const semTutor = await prisma.dog.findMany({
    where: {
      ownerName: { in: ['Tutor pendente', ''] }
    }
  })
  
  for (const dog of semTutor) {
    console.log(`   "${dog.name}" (ID: ${dog.id.substring(0, 8)})`)
  }
  
  console.log('\n✅ Verificação concluída!')
}

applyFixes()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
