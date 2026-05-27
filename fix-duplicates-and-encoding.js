const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Normalizar nome para comparação
function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .trim()
}

// Verificar se nome tem encoding problemático
function hasEncodingIssues(name) {
  if (!name) return false
  // Padrões comuns de encoding corrompido
  const badPatterns = [
    /=C3=BD/, /=C3=A7/, /=C3=A3/, /=C3=B5/, /=C3=A1/, /=C3=A9/, /=C3=AD/, /=C3=B3/, /=C3=BA/,
    //, /\?/, /=C[0-9A-F]{2}/,
    /Jpiter/, /Smb/, /ramirinho/i
  ]
  return badPatterns.some(p => p.test(name))
}

// Corrigir encoding
function fixEncoding(name) {
  if (!name) return name
  
  // Mapeamento de erros comuns
  const fixes = {
    'Jpiter': 'Júpiter',
    'JPITER': 'Júpiter',
    'Smb': 'Sambô',
    'Ramirinho': 'Ramiro',
    'ramirinho': 'Ramiro',
    'Anne': 'Annie',
    'Cacau Cristina': 'Cacau',
    'Lara Tenorio Guedes': 'Lara',
    'Rocky Tenorio Guedes': 'Rocky',
    'Nina': 'Nina', // pode ser duplicada
    'Annie bonny': 'Annie Bonny',
    'Annie Bonny': 'Annie Bonny',
    'Sirius Black': 'Sirius Black',
    'Sirius black': 'Sirius Black',
    'Theodoro': 'Theodoro', // pode ter 2
    'Luna': 'Luna', // pode ter 2
    'Lolla': 'Lolla',
    'Pandora Zenezi': 'Pandora',
    'Betina': 'Betina',
    'Belinha': 'Belinha',
    'Teobaldo': 'Teobaldo',
    'Tsuki': 'Tsuki',
    'Thifany': 'Thifany',
    'Tobias': 'Tobias',
    'Bucky': 'Bucky',
    'Maya': 'Maya',
    'Charlotte': 'Charlotte',
    'Cloe Regina': 'Cloe',
    'Diana': 'Diana',
    'Hera': 'Hera',
    'Mel': 'Mel',
    'Suzy': 'Suzy',
    'Auê': 'Auê',
    'Sambô': 'Sambô'
  }
  
  // Tentar match exato primeiro
  if (fixes[name]) return fixes[name]
  
  // Limpar caracteres de encoding quoted-printable
  let cleaned = name
    .replace(/=C3=A7/g, 'ç')
    .replace(/=C3=A0/g, 'à')
    .replace(/=C3=A1/g, 'á')
    .replace(/=C3=A9/g, 'é')
    .replace(/=C3=AA/g, 'ê')
    .replace(/=C3=AD/g, 'í')
    .replace(/=C3=B3/g, 'ó')
    .replace(/=C3=B4/g, 'ô')
    .replace(/=C3=BA/g, 'ú')
    .replace(/=C3=BC/g, 'ü')
    .replace(/=C3=A3/g, 'ã')
    .replace(/=C3=B5/g, 'õ')
    .replace(/=C3=A2/g, 'â')
    .replace(/=C3=82/g, 'Â')
    .replace(/=C3=87/g, 'Ç')
    .replace(/=C3=89/g, 'É')
    .replace(/=C3=8D/g, 'Í')
    .replace(/=C3=93/g, 'Ó')
    .replace(/=C3=9A/g, 'Ú')
    .replace(/=C3=9C/g, 'Ü')
    .replace(/=C3=83/g, 'Ã')
    .replace(/=C3=95/g, 'Õ')
    .replace(/=C2=A0/g, ' ')
    .replace(/=20/g, ' ')
    .replace(/=/g, '')
    .trim()
  
  return cleaned
}

async function analyzeDogs() {
  console.log('🔍 Analisando base de cães...\n')
  
  const allDogs = await prisma.dog.findMany({
    include: {
      stays: { where: { active: true } },
      reports: { take: 1 }
    },
    orderBy: { name: 'asc' }
  })
  
  console.log(`Total de registros: ${allDogs.length}\n`)
  
  // 1. Identificar problemas de encoding
  console.log('⚠️  CÃES COM PROBLEMAS DE ENCODING:')
  console.log('=' .repeat(60))
  const encodingIssues = []
  for (const dog of allDogs) {
    if (hasEncodingIssues(dog.name) || hasEncodingIssues(dog.ownerName)) {
      encodingIssues.push(dog)
      console.log(`ID: ${dog.id.substring(0, 8)} | Nome: "${dog.name}" | Tutor: "${dog.ownerName}"`)
    }
  }
  
  if (encodingIssues.length === 0) {
    console.log('Nenhum problema de encoding encontrado.\n')
  } else {
    console.log(`\n${encodingIssues.length} cães com encoding issues\n`)
  }
  
  // 2. Identificar duplicados por nome normalizado
  console.log('\n🔴 POSSÍVEIS DUPLICADOS (mesmo nome normalizado):')
  console.log('=' .repeat(80))
  
  const byNormalizedName = {}
  for (const dog of allDogs) {
    const normalized = normalizeName(dog.name)
    if (!byNormalizedName[normalized]) {
      byNormalizedName[normalized] = []
    }
    byNormalizedName[normalized].push(dog)
  }
  
  const duplicates = Object.entries(byNormalizedName).filter(([name, dogs]) => dogs.length > 1)
  
  for (const [normalizedName, dogs] of duplicates) {
    console.log(`\n📌 "${normalizedName}" (${dogs.length} registros):`)
    for (const dog of dogs) {
      const hasData = dog.feedingType || dog.medications || dog.allergies
      const hasStays = dog.stays.length > 0
      const isBolsista = dog.isBolsista
      console.log(`   ID: ${dog.id.substring(0, 8)} | Nome: "${dog.name}" | Tutor: ${dog.ownerName?.split(' ')[0] || '???'} | Dados: ${hasData ? '✅' : '❌'} | Estadia: ${hasStays ? '✅' : '❌'} | Bolsista: ${isBolsista ? '⭐' : ' '}`)
    }
  }
  
  if (duplicates.length === 0) {
    console.log('Nenhum duplicado encontrado.\n')
  } else {
    console.log(`\n${duplicates.length} grupos de duplicados encontrados`)
  }
  
  // 3. Identificar similares (nomes parecidos)
  console.log('\n🟡 NOMES SIMILARES (pode ser o mesmo cão):')
  console.log('=' .repeat(80))
  
  const similarGroups = []
  const processed = new Set()
  
  for (const dog1 of allDogs) {
    if (processed.has(dog1.id)) continue
    
    const group = [dog1]
    const norm1 = normalizeName(dog1.name)
    
    for (const dog2 of allDogs) {
      if (dog1.id === dog2.id) continue
      if (processed.has(dog2.id)) continue
      
      const norm2 = normalizeName(dog2.name)
      
      // Verificar se são similares (um contém o outro ou distância pequena)
      if (norm1.includes(norm2) || norm2.includes(norm1)) {
        if (norm1 !== norm2 || dog1.name !== dog2.name) { // Só se forem diferentes
          group.push(dog2)
        }
      }
    }
    
    if (group.length > 1) {
      similarGroups.push(group)
      for (const dog of group) processed.add(dog.id)
    }
  }
  
  for (const group of similarGroups) {
    console.log(`\n📌 Grupo similar:`)
    for (const dog of group) {
      console.log(`   "${dog.name}" (ID: ${dog.id.substring(0, 8)}) - Tutor: ${dog.ownerName?.split(' ')[0] || '???'}`)
    }
  }
  
  // 4. Mostrar bolsistas
  console.log('\n⭐ BOLSISTAS ENCONTRADOS:')
  console.log('=' .repeat(80))
  const bolsistas = allDogs.filter(d => d.isBolsista)
  if (bolsistas.length === 0) {
    console.log('Nenhum bolsista encontrado.')
  } else {
    for (const dog of bolsistas) {
      console.log(`"${dog.name}" (ID: ${dog.id.substring(0, 8)}) - Tutor: ${dog.ownerName}`)
    }
  }
  
  return { encodingIssues, duplicates, similarGroups, bolsistas, allDogs }
}

async function fixIssues(analysis) {
  const { encodingIssues, duplicates, allDogs } = analysis
  
  console.log('\n\n🔧 CORRIGINDO PROBLEMAS...\n')
  
  // 1. Corrigir encoding
  for (const dog of encodingIssues) {
    const fixedName = fixEncoding(dog.name)
    const fixedOwner = fixEncoding(dog.ownerName)
    
    if (fixedName !== dog.name || fixedOwner !== dog.ownerName) {
      console.log(`Corrigindo: "${dog.name}" -> "${fixedName}"`)
      await prisma.dog.update({
        where: { id: dog.id },
        data: {
          name: fixedName,
          ownerName: fixedOwner || dog.ownerName
        }
      })
    }
  }
  
  // 2. Sugerir merge de duplicados (só log, não executa automaticamente)
  console.log('\n📋 SUGESTÕES DE MERGE (requer aprovação manual):')
  console.log('=' .repeat(80))
  
  for (const [normalizedName, dogs] of duplicates) {
    // Separar bolsistas (não tocar)
    const bolsistas = dogs.filter(d => d.isBolsista)
    const normais = dogs.filter(d => !d.isBolsista)
    
    if (bolsistas.length > 0) {
      console.log(`\n📌 "${normalizedName}":`)
      console.log(`   ⭐ BOLSISTA (manter): "${bolsistas[0].name}" (ID: ${bolsistas[0].id.substring(0, 8)})`)
      
      for (const dup of normais) {
        console.log(`   ❌ Possível duplicado: "${dup.name}" (ID: ${dup.id.substring(0, 8)}) - Tutor: ${dup.ownerName?.split(' ')[0]}`)
      }
    } else if (normais.length > 1) {
      // Ordenar por: tem dados > tem estadia > mais recente
      const sorted = normais.sort((a, b) => {
        const aHasData = (a.feedingType || a.medications || a.allergies) ? 1 : 0
        const bHasData = (b.feedingType || b.medications || b.allergies) ? 1 : 0
        const aHasStays = a.stays.length
        const bHasStays = b.stays.length
        
        if (bHasData !== aHasData) return bHasData - aHasData
        if (bHasStays !== aHasStays) return bHasStays - aHasStays
        return 0
      })
      
      console.log(`\n📌 "${normalizedName}":`)
      console.log(`   ✅ Manter (mais dados): "${sorted[0].name}" (ID: ${sorted[0].id.substring(0, 8)})`)
      
      for (let i = 1; i < sorted.length; i++) {
        console.log(`   ❌ Possível duplicado: "${sorted[i].name}" (ID: ${sorted[i].id.substring(0, 8)}) - Tutor: ${sorted[i].ownerName?.split(' ')[0]}`)
      }
    }
  }
}

async function main() {
  const analysis = await analyzeDogs()
  await fixIssues(analysis)
  
  console.log('\n✅ Análise concluída!')
  console.log('\nPróximos passos:')
  console.log('1. Revise as sugestões de merge acima')
  console.log('2. Confirme quais cães duplicados devem ser removidos')
  console.log('3. Execute o merge manualmente ou me peça para fazer')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
