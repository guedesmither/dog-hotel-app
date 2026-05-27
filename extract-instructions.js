const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const dogsNeedInstructions = [
  { name: 'Tsuki', tutor: 'Neusa' },
  { name: 'Ramiro', tutor: 'Bárbara' },
  { name: 'Bucky', tutor: 'Lucas' },
  { name: 'Pandora', tutor: 'Rafaella' },
  { name: 'Cloe Regina', tutor: 'Aline' },
  { name: 'Charlotte', tutor: 'Alexandra' },
  { name: 'Leonardo', tutor: 'Thaís' },
  { name: 'Mel', tutor: 'Jeniffer' },
  { name: 'Romain', tutor: 'Gabriel' },
  { name: 'Júpiter', tutor: 'Gabriela' },
  { name: 'Baruc', tutor: 'Débora' },
  { name: 'Sol', tutor: 'Carla' },
  { name: 'Sirius Black', tutor: 'Franciele' }
]

function findEmlFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      findEmlFiles(fullPath, files)
    } else if (item.endsWith('.eml')) {
      files.push(fullPath)
    }
  }
  return files
}

function extractFromEml(emlPath, dogName) {
  const content = fs.readFileSync(emlPath, 'utf-8')
  
  // Decodificar quoted-printable
  let decoded = content
    .replace(/=([0-9A-F]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/=\r?\n/g, '')
  
  // Procurar por seção de alimentação
  const feedingMatch = decoded.match(/Rotina de Alimentação[\s\S]*?(?=Comportamento|Autorizações|Serviço|$)/i)
  
  if (feedingMatch) {
    return feedingMatch[0]
  }
  
  // Procurar linhas específicas
  const lines = decoded.split('\n')
  let result = ''
  for (const line of lines) {
    if (/Instruções Especiais|alimentação|ração|comer/i.test(line)) {
      result += line + '\n'
    }
  }
  
  return result
}

async function extractInstructions() {
  console.log('🔍 Extraindo instruções de alimentação...\n')
  
  // Procurar arquivos .eml
  const possiblePaths = [
    'C:\\Users\\guede\\Downloads\\anexos',
    path.join(__dirname, 'anexos'),
    path.join(__dirname, 'fichas')
  ]
  
  let emlFiles = []
  for (const dir of possiblePaths) {
    emlFiles = findEmlFiles(dir)
    if (emlFiles.length > 0) break
  }
  
  if (emlFiles.length === 0) {
    console.log('❌ Nenhum arquivo .eml encontrado')
    return
  }
  
  console.log(`📧 ${emlFiles.length} arquivos .eml encontrados\n`)
  
  for (const dog of dogsNeedInstructions) {
    console.log(`\n📋 ${dog.name} (${dog.tutor}):`)
    console.log('-'.repeat(60))
    
    // Procurar arquivo relacionado
    const relatedFile = emlFiles.find(f => 
      f.toLowerCase().includes(dog.name.toLowerCase()) ||
      f.toLowerCase().includes(dog.tutor.toLowerCase())
    )
    
    if (relatedFile) {
      console.log(`  Arquivo: ${path.basename(relatedFile)}`)
      const instructions = extractFromEml(relatedFile, dog.name)
      
      if (instructions.trim()) {
        console.log(`  Instruções encontradas:`)
        console.log(instructions.substring(0, 500).split('\n').map(l => '    ' + l).join('\n'))
      } else {
        console.log('  ⚠️ Sem instruções específicas no email')
      }
    } else {
      console.log('  ⚠️ Arquivo .eml não encontrado')
    }
  }
}

extractInstructions()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
