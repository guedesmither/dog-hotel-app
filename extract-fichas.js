const fs = require('fs')
const path = require('path')

// Simples extrator de campos de email
function extractFicha(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8')
  
  const data = {}
  
  // Extrair campos com regex
  const fields = [
    ['name', /Nome do c[ãa]o\s*[:\-]?\s*([^\n]+)/i],
    ['ownerName', /Nome do tutor\s*[:\-]?\s*([^\n]+)/i],
    ['breed', /Ra[çc]a\s*[:\-]?\s*([^\n]+)/i],
    ['birthDate', /Idade\s*[:\-]?\s*([^\n]+)/i],
    ['sex', /Sexo\s*[:\-]?\s*([^\n]+)/i],
    ['castrated', /Castrado\?\s*[:\-]?\s*([^\n]+)/i],
    ['temperament', /N[íi]vel de energia\s*[:\-]?\s*([^\n]+)/i],
    ['size', /Porte\s*[:\-]?\s*([^\n]+)/i],
    ['doenca', /Doen[çc]a pr[ée]-existente\s*[:\-]?\s*([^\n]+)/i],
    ['allergies', /Alergias\s*[:\-]?\s*([^\n]+)/i],
    ['feedingType', /Tipo alimenta[çc][ãa]o\s*[:\-]?\s*([^\n]+)/i],
    ['feedingTimesPerDay', /Vezes ao dia\s*[:\-]?\s*([^\n]+)/i],
    ['feedingGramsPerMeal', /Gramas por refei[çc][ãa]o\s*[:\-]?\s*([^\n]+)/i],
    ['preferredActivities', /Brincadeiras preferidas\s*[:\-]?\s*([^\n]+)/i],
    ['vetName', /Veterin[áa]rio\s*[:\-]?\s*([^\n]+)/i],
    ['allowPool', /Piscina\?\s*[:\-]?\s*([^\n]+)/i],
    ['allowPhotos', /Fotos nas redes\?\s*[:\-]?\s*([^\n]+)/i],
    ['serviceType', /Servi[çc]os desejados\s*[:\-]?\s*([^\n]+)/i],
    ['scheduledDays', /Dias de frequ[êe]ncia\s*[:\-]?\s*([^\n]+)/i],
    ['ownerEmail', /Email\s*[:\-]?\s*([^\n]+)/i],
    ['ownerPhone', /Telefone\s*[:\-]?\s*([^\n]+)/i],
    ['ownerCpf', /CPF\s*[:\-]?\s*([^\n]+)/i],
  ]
  
  // Instruções é multi-linha, extrair especial
  const instrMatch = content.match(/Instru[çc][õo]es\s*[:\-]?\s*([\s\S]*?)(?=Vezes ao dia|Brincadeiras preferidas|Veterin[áa]rio|Piscina\?|$)/i)
  if (instrMatch) {
    let instr = instrMatch[1].trim()
    // Limpar
    instr = instr.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ')
    if (instr && instr.length > 3 && !instr.toLowerCase().includes('não informado')) {
      data.feedingInstructions = instr.substring(0, 500) // Limitar
    }
  }
  
  for (const [field, regex] of fields) {
    const match = content.match(regex)
    if (match) {
      let value = match[1].trim()
      // Limpar
      value = value.replace(/\r/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ')
      if (value && value.length > 0 && 
          !value.toLowerCase().includes('não informado') && 
          !value.toLowerCase().includes('nenhuma informada') &&
          value !== '_') {
        data[field] = value
      }
    }
  }
  
  return data
}

const anexosDir = 'C:\\Users\\guede\\Downloads\\anexos'
const files = fs.readdirSync(anexosDir).filter(f => f.endsWith('.eml'))

const allFichas = []

console.log(`Processando ${files.length} fichas...\n`)

for (const filename of files) {
  const filepath = path.join(anexosDir, filename)
  
  try {
    const data = extractFicha(filepath)
    
    // Extrair nome do arquivo se não encontrou
    if (!data.name) {
      const nameMatch = filename.match(/- (.+?) \(/)
      if (nameMatch) {
        data.name = nameMatch[1].trim()
      }
    }
    
    data._source = filename
    allFichas.push(data)
    
    const hasFeeding = data.feedingType || data.feedingInstructions
    const hasMeds = data.doenca || data.allergies
    console.log(`✅ ${data.name || '???'}: Alim=${hasFeeding ? '✓' : '✗'} Meds=${hasMeds ? '✓' : '✗'}`)
    
  } catch (e) {
    console.log(`❌ Erro em ${filename}: ${e.message}`)
  }
}

// Salvar
const outputFile = 'C:\\Users\\guede\\CascadeProjects\\dog-hotel-app\\all-fichas.json'
fs.writeFileSync(outputFile, JSON.stringify(allFichas, null, 2))

console.log(`\n✅ ${allFichas.length} fichas salvas em ${outputFile}`)

// Resumo
console.log('\n📊 Resumo:')
for (const f of allFichas) {
  const fields = Object.keys(f).filter(k => !k.startsWith('_')).length
  console.log(`  ${f.name || '???'}: ${fields} campos`)
}
