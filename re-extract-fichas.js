const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')
const path = require('path')

// Campos que geralmente contêm alimentação
const feedingKeywords = [
  'alimentação', 'racao', 'ração', 'scoops', 'gramas', 'vezes', 'dia',
  'natural', 'seca', 'úmida', 'umida', 'mista', 'quantidade', 'porção'
]

async function findFeedingInFichas() {
  console.log('🔍 Re-analisando fichas para encontrar alimentação...\n')
  
  const fichasPath = path.join(__dirname, 'all-fichas.json')
  if (!fs.existsSync(fichasPath)) {
    console.log('❌ Arquivo all-fichas.json não encontrado')
    return
  }
  
  const fichas = JSON.parse(fs.readFileSync(fichasPath, 'utf-8'))
  
  // Cães sem alimentação no banco
  const dogsWithoutFeeding = await prisma.dog.findMany({
    where: {
      AND: [
        { feedingType: null },
        { feedingInstructions: null },
        { feedingGramsPerMeal: null }
      ]
    }
  })
  
  console.log(`Cães sem alimentação no banco: ${dogsWithoutFeeding.length}`)
  console.log('Nomes:', dogsWithoutFeeding.map(d => d.name).join(', '))
  console.log('')
  
  // Para cada cão, procurar na ficha original
  for (const dog of dogsWithoutFeeding) {
    console.log(`\n📋 ${dog.name} (Tutor: ${dog.ownerName}):`)
    console.log('-'.repeat(60))
    
    // Procurar na ficha por nome similar
    const ficha = fichas.find(f => {
      const fichaName = f.name?.toLowerCase() || ''
      const dogName = dog.name.toLowerCase()
      return fichaName.includes(dogName) || dogName.includes(fichaName)
    })
    
    if (!ficha) {
      console.log('  ⚠️ Ficha não encontrada')
      continue
    }
    
    // Mostrar TODOS os campos da ficha
    console.log('  Campos disponíveis na ficha:')
    for (const [key, value] of Object.entries(ficha)) {
      if (key.startsWith('_')) continue
      if (value && value.toString().trim() !== '' && value !== '=') {
        // Verificar se parece ser alimentação
        const isFeedingRelated = feedingKeywords.some(kw => 
          key.toLowerCase().includes(kw) || 
          value.toLowerCase().includes(kw)
        )
        const marker = isFeedingRelated ? ' 🍖' : ''
        console.log(`    ${key}: "${value}"${marker}`)
      }
    }
  }
  
  console.log('\n\n✅ Análise concluída!')
  console.log('Campos marcados com 🍖 podem conter dados de alimentação.')
}

findFeedingInFichas()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
