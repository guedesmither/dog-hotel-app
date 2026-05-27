const fs = require('fs')
const path = require('path')

// Ler o arquivo de fichas
const fichas = JSON.parse(fs.readFileSync(path.join(__dirname, 'all-fichas.json'), 'utf-8'))

// Encontrar Betina
const betina = fichas.find(f => f.name && f.name.toLowerCase().includes('betina'))

if (betina) {
  console.log('📋 FICHA DA BETINA:')
  console.log('='.repeat(60))
  
  // Mostrar TODOS os campos
  for (const [key, value] of Object.entries(betina)) {
    if (value && value.toString().trim() !== '' && value !== '=' && !key.startsWith('_')) {
      console.log(`${key}: "${value}"`)
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('⚠️ Campos de alimentação presentes:')
  const hasFeeding = betina.feedingType || betina.feedingTimesPerDay || betina.feedingGramsPerMeal
  console.log(hasFeeding ? 'Alguns dados encontrados' : '❌ NENHUM dado de alimentação na ficha extraída')
  
  console.log('\n📝 Arquivo original:', betina._source)
} else {
  console.log('❌ Betina não encontrada nas fichas')
}
