const fs = require('fs')
const path = require('path')

function findBetinaEml() {
  const possiblePaths = [
    'C:\\Users\\guede\\Downloads\\anexos',
    path.join(__dirname, 'anexos'),
    path.join(__dirname, 'fichas')
  ]
  
  for (const dir of possiblePaths) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
      const betinaFile = files.find(f => f.toLowerCase().includes('betina') && f.endsWith('.eml'))
      if (betinaFile) {
        return path.join(dir, betinaFile)
      }
    }
  }
  return null
}

function extractBetinaData(emlPath) {
  const content = fs.readFileSync(emlPath, 'utf-8')
  
  console.log('📧 Analisando email da Betina...\n')
  console.log('Tamanho do arquivo:', content.length, 'caracteres')
  
  // Procurar por campos de alimentação no conteúdo bruto
  const patterns = [
    /Alimenta[çc][ãa]o[\s\S]{0,200}/i,
    /Ra[çc][ãa]o[\s\S]{0,100}/i,
    /Scoops[\s\S]{0,100}/i,
    /Vezes?[\s\S]{0,50}/i,
    /dia[\s\S]{0,50}/i
  ]
  
  console.log('\n🔍 Procurando dados de alimentação...\n')
  
  for (const pattern of patterns) {
    const matches = content.match(pattern)
    if (matches) {
      matches.forEach((match, i) => {
        console.log(`Encontrado (${i + 1}):`)
        console.log('  ', match.replace(/\s+/g, ' ').substring(0, 150))
        console.log('')
      })
    }
  }
  
  // Procurar linhas específicas com alimentação
  console.log('\n📋 Linhas relacionadas a alimentação:\n')
  const lines = content.split('\n')
  let foundAny = false
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase()
    if (/alimenta[çc]|racao|ra[çc][ãa]o|scoops|gramas|refei[çc]/i.test(lowerLine)) {
      if (!line.includes('Content-Type') && !line.includes('boundary=') && line.trim().length > 5) {
        console.log('  ', line.trim().substring(0, 100))
        foundAny = true
      }
    }
  }
  
  if (!foundAny) {
    console.log('  ❌ Nenhuma linha com dados de alimentação encontrada')
  }
  
  // Mostrar uma parte do conteúdo decodificado (se for quoted-printable)
  console.log('\n\n📄 Trecho do conteúdo (primeiros 2000 caracteres):\n')
  const cleanContent = content
    .replace(/=([0-9A-F]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/=\r?\n/g, '')
  
  console.log(cleanContent.substring(0, 2000))
}

const emlPath = findBetinaEml()

if (emlPath) {
  console.log('Arquivo encontrado:', emlPath, '\n')
  extractBetinaData(emlPath)
} else {
  console.log('❌ Arquivo .eml da Betina não encontrado')
  console.log('Procurando em:')
  console.log('  - C:\\Users\\guede\\Downloads\\anexos')
  console.log('  - ./anexos')
  console.log('  - ./fichas')
}
