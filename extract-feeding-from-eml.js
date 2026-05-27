const fs = require('fs')
const path = require('path')

const targetDogs = ['Charlotte', 'Diana', 'Lolla', 'Nina', 'Pandora', 'Sirius Black']

function findEmlFiles(dir, files = []) {
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

function extractContent(emlPath) {
  const content = fs.readFileSync(emlPath, 'utf-8')
  
  // Procurar por seções de alimentação
  const feedingPatterns = [
    /Alimenta[çc][ãa]o[\s\S]*?(?=Nome|Ra[çc]a|Porte|\.\.\.|$)/i,
    /Tipo de alimenta[çc][ãa]o[\s\S]*?(?=Nome|Ra[çc]a|Porte|\.\.\.|$)/i,
    /Ra[çc][ãa]o[\s\S]*?gramas/i,
    /Scoops[\s\S]*?dia/i,
    /Natural[\s\S]*?refei[çc][õo]es/i
  ]
  
  let feedingInfo = ''
  for (const pattern of feedingPatterns) {
    const match = content.match(pattern)
    if (match) {
      feedingInfo += match[0] + '\n'
    }
  }
  
  // Também procurar linhas específicas
  const lines = content.split('\n')
  for (const line of lines) {
    if (/alimenta[çc]|racao|ra[çc][ãa]o|scoops|gramas|refei[çc]/i.test(line)) {
      if (!line.includes('Content-Type') && !line.includes('boundary=')) {
        feedingInfo += line.trim() + '\n'
      }
    }
  }
  
  return feedingInfo
}

async function main() {
  console.log('🔍 Procurando dados de alimentação nas fichas .eml...\n')
  
  // Procurar pasta com anexos/fichas
  const possiblePaths = [
    path.join(__dirname, 'anexos'),
    path.join(__dirname, 'fichas'),
    path.join(__dirname, 'emails'),
    'C:\\Users\\guede\\Downloads\\anexos'
  ]
  
  let emlFiles = []
  for (const dir of possiblePaths) {
    if (fs.existsSync(dir)) {
      console.log(`Verificando: ${dir}`)
      emlFiles = findEmlFiles(dir)
      if (emlFiles.length > 0) {
        console.log(`✅ Encontrados ${emlFiles.length} arquivos .eml`)
        break
      }
    }
  }
  
  if (emlFiles.length === 0) {
    console.log('\n❌ Nenhuma pasta com arquivos .eml encontrada')
    console.log('Verifique se existe uma pasta "anexos" ou "fichas" no projeto')
    return
  }
  
  console.log('\n' + '='.repeat(80))
  
  for (const dogName of targetDogs) {
    console.log(`\n📋 ${dogName}:`)
    console.log('-'.repeat(80))
    
    // Procurar arquivo relacionado a este cão
    const relatedFiles = emlFiles.filter(f => 
      f.toLowerCase().includes(dogName.toLowerCase())
    )
    
    if (relatedFiles.length === 0) {
      console.log('  ⚠️ Arquivo .eml não encontrado')
      continue
    }
    
    for (const file of relatedFiles) {
      console.log(`  Arquivo: ${path.basename(file)}`)
      const feedingInfo = extractContent(file)
      if (feedingInfo.trim()) {
        console.log(`  Dados encontrados:`)
        console.log(feedingInfo.split('\n').map(l => '    ' + l).join('\n'))
      } else {
        console.log('  ⚠️ Sem dados de alimentação no email')
      }
    }
  }
}

main().catch(console.error)
