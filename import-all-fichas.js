const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')

// Carregar fichas extraídas
const fichas = JSON.parse(fs.readFileSync('all-fichas.json', 'utf-8'))

// Agrupar por nome (alguns cães têm múltiplas fichas)
const fichasByName = {}
for (const f of fichas) {
  if (!f.name) continue
  // Normalizar nome
  const normalizedName = f.name.trim().toLowerCase().replace(/[^a-záéíóúãõç\s]/gi, '')
  if (!fichasByName[normalizedName]) {
    fichasByName[normalizedName] = []
  }
  fichasByName[normalizedName].push(f)
}

// Merge de múltiplas fichas do mesmo cão
function mergeFichas(fichaList) {
  const merged = {}
  for (const f of fichaList) {
    for (const [key, value] of Object.entries(f)) {
      if (key.startsWith('_')) continue
      if (!merged[key] || (merged[key] && value && value.length > merged[key].length)) {
        merged[key] = value
      }
    }
  }
  return merged
}

// Funções auxiliares
function isEmpty(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim() === '') return true
  return false
}

function cleanValue(value) {
  if (!value) return null
  let cleaned = value.toString().trim()
  // Remover encoding quoted-printable
  cleaned = cleaned.replace(/=([0-9A-F]{2})/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
  cleaned = cleaned.replace(/=\r?\n/g, '')
  cleaned = cleaned.replace(/\s+/g, ' ')
  // Limpar valores vazios
  const empties = ['não informado', 'nenhuma informada', 'nao informado', 'desconhecido', '-', '_', '=']
  if (empties.includes(cleaned.toLowerCase())) return null
  return cleaned
}

function parseTimes(value) {
  if (!value) return null
  const match = value.toString().match(/(\d+)/)
  return match ? match[1] : null
}

function parseGrams(value) {
  if (!value) return null
  const match = value.toString().match(/(\d+)/)
  return match ? match[1] + 'g' : value
}

function parseBoolean(value) {
  if (!value) return null
  const v = value.toString().toLowerCase().trim()
  if (v === 'sim' || v === 's' || v === 'yes') return true
  if (v === 'não' || v === 'nao' || v === 'n' || v === 'no') return false
  return null
}

async function importFichas() {
  let updated = 0
  let created = 0
  let skipped = 0
  let errors = []

  console.log(`Processando ${Object.keys(fichasByName).length} cães únicos...\n`)

  for (const [normalizedName, fichaList] of Object.entries(fichasByName)) {
    // Merge fichas
    const ficha = mergeFichas(fichaList)
    const displayName = fichaList[0].name // Nome original
    
    try {
      // Buscar cão no banco (case insensitive, parcial)
      let dog = await prisma.dog.findFirst({
        where: { 
          name: { contains: displayName.replace(/[^a-zA-Záéíóúãõç\s]/gi, ''), mode: 'insensitive' }
        }
      })

      // Preparar dados
      const updateData = {}
      
      // Campos do tutor
      if (cleanValue(ficha.ownerName)) updateData.ownerName = cleanValue(ficha.ownerName)
      if (cleanValue(ficha.ownerPhone)) updateData.ownerPhone = cleanValue(ficha.ownerPhone)
      if (cleanValue(ficha.ownerEmail)) updateData.ownerEmail = cleanValue(ficha.ownerEmail)
      if (cleanValue(ficha.ownerCpf)) updateData.ownerCpf = cleanValue(ficha.ownerCpf)
      
      // Campos do cão
      if (cleanValue(ficha.breed)) updateData.breed = cleanValue(ficha.breed)
      if (cleanValue(ficha.birthDate)) updateData.birthDate = cleanValue(ficha.birthDate)
      if (cleanValue(ficha.sex)) updateData.sex = cleanValue(ficha.sex)
      if (parseBoolean(ficha.castrated) !== null) updateData.castrated = parseBoolean(ficha.castrated)
      if (cleanValue(ficha.temperament)) updateData.temperament = cleanValue(ficha.temperament)
      if (cleanValue(ficha.size)) updateData.size = cleanValue(ficha.size)
      if (cleanValue(ficha.preferredActivities)) updateData.preferredActivities = cleanValue(ficha.preferredActivities)
      
      // Alimentação
      if (cleanValue(ficha.feedingType)) updateData.feedingType = cleanValue(ficha.feedingType)
      if (cleanValue(ficha.feedingInstructions)) updateData.feedingInstructions = cleanValue(ficha.feedingInstructions)
      if (parseTimes(ficha.feedingTimesPerDay)) updateData.feedingTimesPerDay = parseTimes(ficha.feedingTimesPerDay)
      if (parseGrams(ficha.feedingGramsPerMeal)) updateData.feedingGramsPerMeal = parseGrams(ficha.feedingGramsPerMeal)
      
      // Saúde - mesclar doença e medicações
      const doenca = cleanValue(ficha.doenca)
      const allergies = cleanValue(ficha.allergies)
      
      if (doenca || allergies) {
        const healthNotes = []
        if (doenca) healthNotes.push(`Doença: ${doenca}`)
        if (allergies && !allergies.toLowerCase().includes('nenhuma') && !allergies.toLowerCase().includes('desconheço')) {
          updateData.allergies = allergies
        }
        if (healthNotes.length > 0) {
          updateData.medications = healthNotes.join('. ')
        }
      }
      
      // Veterinário
      if (cleanValue(ficha.vetName)) {
        const vet = cleanValue(ficha.vetName)
        if (!vet.toLowerCase().includes('autorizo')) {
          updateData.vetName = vet
        }
      }
      
      // Permissões
      if (parseBoolean(ficha.allowPool) !== null) updateData.allowPool = parseBoolean(ficha.allowPool)
      if (parseBoolean(ficha.allowPhotos) !== null) updateData.allowPhotos = parseBoolean(ficha.allowPhotos)
      
      // Serviço
      if (cleanValue(ficha.serviceType)) updateData.serviceType = cleanValue(ficha.serviceType)
      if (cleanValue(ficha.scheduledDays)) updateData.scheduledDays = cleanValue(ficha.scheduledDays)

      if (dog) {
        // Cão existe - só preencher campos vazios
        const filledData = {}
        for (const [key, value] of Object.entries(updateData)) {
          if (isEmpty(dog[key]) && !isEmpty(value)) {
            filledData[key] = value
          }
        }
        
        if (Object.keys(filledData).length > 0) {
          await prisma.dog.update({
            where: { id: dog.id },
            data: filledData
          })
          console.log(`✅ ${displayName}: ${Object.keys(filledData).join(', ')}`)
          updated++
        } else {
          console.log(`⏭️  ${displayName}: Já completo`)
          skipped++
        }
      } else {
        // Cão não existe - criar
        console.log(`🆕 ${displayName}: Criando novo cão...`)
        
        // Dados mínimos obrigatórios
        if (!updateData.ownerName) updateData.ownerName = 'Tutor pendente'
        if (!updateData.ownerPhone) updateData.ownerPhone = '00000000000'
        
        await prisma.dog.create({
          data: {
            name: displayName,
            breed: updateData.breed || 'SRD',
            ownerName: updateData.ownerName,
            ownerPhone: updateData.ownerPhone,
            ...updateData
          }
        })
        created++
      }
      
    } catch (error) {
      console.error(`❌ Erro em ${displayName}:`, error.message)
      errors.push({ name: displayName, error: error.message })
    }
  }

  console.log(`\n📊 RESUMO:`)
  console.log(`✅ Atualizados: ${updated}`)
  console.log(`🆕 Criados: ${created}`)
  console.log(`⏭️  Pulados: ${skipped}`)
  console.log(`❌ Erros: ${errors.length}`)
  
  if (errors.length > 0) {
    console.log(`\nErros:`)
    errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`))
  }
}

importFichas()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
