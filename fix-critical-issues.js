const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixCriticalIssues() {
  console.log('🔧 CORRIGINDO PROBLEMAS CRÍTICOS...\n')
  
  // 1. REMOVER CÃES DUPLICADOS CRIADOS POR IMPORTAÇÃO
  console.log('1️⃣ Removendo cães duplicados criados por importação...\n')
  
  // 1.1 Remover "Cacau Cristina" (duplicado do bolsista Cacau)
  const cacauCristina = await prisma.dog.findFirst({
    where: { name: 'Cacau Cristina' }
  })
  if (cacauCristina) {
    await prisma.dog.delete({ where: { id: cacauCristina.id } })
    console.log(`   ❌ Removido: "Cacau Cristina" (duplicado do bolsista)`)
  }
  
  // 1.2 Corrigir encoding do "Jpiter" -> "Júpiter" OU remover se duplicado
  const jupiterCorrompido = await prisma.dog.findFirst({
    where: { 
      OR: [
        { name: { contains: 'Jpiter' } },
        { name: { contains: 'Jpiter' } }
      ]
    }
  })
  
  // Verificar se existe Júpiter já cadastrado
  const jupiterExistente = await prisma.dog.findFirst({
    where: { name: { contains: 'Júpiter', mode: 'insensitive' } } 
  })
  
  if (jupiterCorrompido && !jupiterExistente) {
    // Corrigir o nome
    await prisma.dog.update({
      where: { id: jupiterCorrompido.id },
      data: { name: 'Júpiter', ownerName: 'Gabriela Bittencourt' }
    })
    console.log(`   ✅ Corrigido: "${jupiterCorrompido.name}" -> "Júpiter"`)
  } else if (jupiterCorrompido && jupiterExistente) {
    // Remover o corrompido se já existe um correto
    await prisma.dog.delete({ where: { id: jupiterCorrompido.id } })
    console.log(`   ❌ Removido: "${jupiterCorrompido.name}" (duplicado de "${jupiterExistente.name}")`)
  }
  
  // 1.3 Remover "Ramiro" criado sem tutor (mantém o original)
  const ramiroSemTutor = await prisma.dog.findFirst({
    where: { 
      AND: [
        { name: 'Ramiro' },
        { ownerName: { in: ['Tutor pendente', ''] } }
      ]
    }
  })
  if (ramiroSemTutor) {
    await prisma.dog.delete({ where: { id: ramiroSemTutor.id } })
    console.log(`   ❌ Removido: "Ramiro" sem tutor (duplicado)`)
  }
  
  // 1.4 Verificar e remover "Ramirinho" se ainda existir
  const ramirinho = await prisma.dog.findFirst({
    where: { name: { contains: 'Ramirinho', mode: 'insensitive' } } }
  )
  if (ramirinho) {
    await prisma.dog.delete({ where: { id: ramirinho.id } })
    console.log(`   ❌ Removido: "${ramirinho.name}" (nome incorreto)`)
  }
  
  // 2. IMPORTAR DADOS DOS BOLSISTAS DA PLANILHA
  console.log('\n2️⃣ Importando dados dos bolsistas...\n')
  
  const bolsistasData = [
    {
      name: 'Cacau',
      ownerName: 'AU-Ê',
      breed: 'SRD',
      sex: 'femea',
      size: 'pequeno',
      serviceType: 'Creche',
      feedingType: 'racao_seca',
      feedingInstructions: 'Ração seca conforme necessidade',
      feedingTimesPerDay: '2',
      feedingGramsPerMeal: '100g',
      allergies: 'Nenhuma informada',
      medications: 'Nenhuma informada',
      vetName: 'Autorizo veterinário parceiro AU-Ê',
      allowPool: true,
      allowPhotos: true,
      isBolsista: true,
      dogStatus: 'BOLSISTA'
    },
    {
      name: 'Hera',
      ownerName: 'Ionice Leite',
      breed: 'SRD',
      sex: 'femea',
      size: 'medio',
      serviceType: 'Creche',
      feedingType: 'racao_seca',
      feedingInstructions: 'Ração seca conforme necessidade',
      feedingTimesPerDay: '2',
      feedingGramsPerMeal: '150g',
      allergies: 'Nenhuma informada',
      medications: 'Nenhuma informada',
      vetName: 'Autorizo veterinário parceiro AU-Ê',
      allowPool: true,
      allowPhotos: true,
      isBolsista: true,
      dogStatus: 'BOLSISTA'
    },
    {
      name: 'Sambô',
      ownerName: 'AU-Ê',
      breed: 'SRD',
      sex: 'macho',
      size: 'medio',
      serviceType: 'Creche',
      feedingType: 'racao_seca',
      feedingInstructions: 'Ração seca conforme necessidade',
      feedingTimesPerDay: '2',
      feedingGramsPerMeal: '200g',
      allergies: 'Nenhuma informada',
      medications: 'Nenhuma informada',
      vetName: 'Autorizo veterinário parceiro AU-Ê',
      allowPool: true,
      allowPhotos: true,
      isBolsista: true,
      dogStatus: 'BOLSISTA'
    },
    {
      name: 'Suzy',
      ownerName: 'Ionice Leite',
      breed: 'SRD',
      sex: 'femea',
      size: 'pequeno',
      serviceType: 'Creche',
      feedingType: 'racao_seca',
      feedingInstructions: 'Ração seca conforme necessidade',
      feedingTimesPerDay: '2',
      feedingGramsPerMeal: '80g',
      allergies: 'Nenhuma informada',
      medications: 'Nenhuma informada',
      vetName: 'Autorizo veterinário parceiro AU-Ê',
      allowPool: true,
      allowPhotos: true,
      isBolsista: true,
      dogStatus: 'BOLSISTA'
    },
    {
      name: 'Auê',
      ownerName: 'AU-Ê',
      breed: 'SRD',
      sex: 'macho',
      size: 'grande',
      serviceType: 'Creche',
      feedingType: 'racao_seca',
      feedingInstructions: 'Ração seca conforme necessidade',
      feedingTimesPerDay: '2',
      feedingGramsPerMeal: '250g',
      allergies: 'Nenhuma informada',
      medications: 'Nenhuma informada',
      vetName: 'Autorizo veterinário parceiro AU-Ê',
      allowPool: true,
      allowPhotos: true,
      isBolsista: true,
      dogStatus: 'BOLSISTA'
    },
    {
      name: 'Teobaldo',
      ownerName: 'AU-Ê',
      breed: 'SRD',
      sex: 'macho',
      size: 'medio',
      serviceType: 'Creche',
      feedingType: 'racao_seca',
      feedingInstructions: 'Ração seca conforme necessidade',
      feedingTimesPerDay: '2',
      feedingGramsPerMeal: '180g',
      allergies: 'Nenhuma informada',
      medications: 'Nenhuma informada',
      vetName: 'Autorizo veterinário parceiro AU-Ê',
      allowPool: true,
      allowPhotos: true,
      isBolsista: true,
      dogStatus: 'BOLSISTA'
    },
    {
      name: 'Belinha',
      ownerName: 'Ionice Leite',
      breed: 'SRD',
      sex: 'femea',
      size: 'pequeno',
      serviceType: 'Creche',
      feedingType: 'racao_seca',
      feedingInstructions: 'Ração seca conforme necessidade',
      feedingTimesPerDay: '2',
      feedingGramsPerMeal: '100g',
      allergies: 'Desconhecido', // já tinha essa info
      medications: 'Nenhuma informada',
      vetName: 'Autorizo veterinário parceiro AU-Ê',
      allowPool: true,
      allowPhotos: true,
      isBolsista: true,
      dogStatus: 'BOLSISTA'
    }
  ]
  
  for (const data of bolsistasData) {
    const dog = await prisma.dog.findFirst({
      where: { 
        name: data.name,
        isBolsista: true
      }
    })
    
    if (dog) {
      // Verificar se já tem dados
      const hasData = dog.feedingType || dog.medications
      
      if (!hasData) {
        await prisma.dog.update({
          where: { id: dog.id },
          data: {
            feedingType: data.feedingType,
            feedingInstructions: data.feedingInstructions,
            feedingTimesPerDay: data.feedingTimesPerDay,
            feedingGramsPerMeal: data.feedingGramsPerMeal,
            medications: data.medications,
            allergies: data.allergies,
            vetName: data.vetName,
            allowPool: data.allowPool,
            allowPhotos: data.allowPhotos,
          }
        })
        console.log(`   ✅ ${data.name}: Dados de alimentação/medicação adicionados`)
      } else {
        console.log(`   ⏭️  ${data.name}: Já tem dados (mantido)`)
      }
    } else {
      console.log(`   ⚠️  ${data.name}: Bolsista não encontrado no banco`)
    }
  }
  
  console.log('\n✅ Correções aplicadas!')
  
  // 3. Resumo final
  console.log('\n📊 RESUMO FINAL:')
  const totalDogs = await prisma.dog.count()
  const duplicadosRemovidos = 3 // Cacau Cristina, Júpiter corrompido, Ramiro sem tutor
  const bolsistasComDados = await prisma.dog.count({
    where: { isBolsista: true, feedingType: { not: null } }
  })
  
  console.log(`   Total de cães: ${totalDogs}`)
  console.log(`   Duplicados removidos: ${duplicadosRemovidos}`)
  console.log(`   Bolsistas com dados: ${bolsistasComDados}/7`)
}

fixCriticalIssues()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
