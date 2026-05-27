const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function findEml(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      findEml(fullPath, files)
    } else if (item.endsWith('.eml')) {
      files.push(fullPath)
    }
  }
  return files
}

function extractSection(content, sectionName) {
  // Decodificar quoted-printable
  let decoded = content
    .replace(/=([0-9A-F]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/=\r?\n/g, '')
  
  // Procurar seção específica
  const patterns = {
    'alimentacao': /🍽️?\s*Rotina de Alimentação[\s\S]*?(?=🎮|🛡️|🎯|$)/i,
    'instrucoes': /Instruções Especiais[\s\S]*?(?=Vezes|Gramas|$)/i,
    'comportamento': /🎮?\s*Comportamento[\s\S]*?(?=🛡️|$)/i
  }
  
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = decoded.match(pattern)
    if (match) {
      return match[0].replace(/\s+/g, ' ').trim()
    }
  }
  
  return ''
}

async function main() {
  console.log('🔍 Extraindo instruções de alimentação de todos os arquivos...\n')
  
  // Buscar cães sem instruções
  const dogs = await prisma.dog.findMany({
    where: {
      feedingType: { not: null },
      OR: [
        { feedingInstructions: null },
        { feedingInstructions: '' }
      ]
    },
    select: { id: true, name: true, ownerName: true }
  })
  
  console.log(`Cães sem instruções: ${dogs.length}`)
  
  // Procurar arquivos .eml
  const emlFiles = findEml('C:\\Users\\guede\\Downloads\\anexos')
  console.log(`Arquivos .eml: ${emlFiles.length}\n`)
  
  const updates = []
  
  for (const dog of dogs) {
    const searchName = dog.name.toLowerCase()
    const emlFile = emlFiles.find(f => f.toLowerCase().includes(searchName))
    
    if (emlFile) {
      const content = fs.readFileSync(emlFile, 'utf-8')
      const instructions = extractSection(content, 'alimentacao')
      
      if (instructions) {
        console.log(`✅ ${dog.name}:`)
        console.log(`   ${instructions.substring(0, 200)}...`)
        updates.push({ id: dog.id, instructions })
      } else {
        console.log(`⚠️ ${dog.name}: Arquivo encontrado mas sem instruções claras`)
      }
    } else {
      console.log(`❌ ${dog.name}: Arquivo .eml não encontrado`)
    }
  }
  
  // Aplicar atualizações
  console.log(`\n📝 Aplicando ${updates.length} atualizações...`)
  for (const update of updates) {
    await prisma.dog.update({
      where: { id: update.id },
      data: { feedingInstructions: update.instructions }
    })
    console.log(`✅ Atualizado`)
  }
  
  console.log('\n✅ Concluído!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
