const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')

// Parser para CSV com campos entre aspas e separados por ;
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// Extrair número de "2 vezes" ou "3 vezes"
function parseTimesPerDay(value) {
  if (!value) return null
  const match = value.match(/(\d+)/)
  return match ? match[1] : null
}

// Extrair número de "120gr" ou "160 gr"
function parseGrams(value) {
  if (!value) return null
  const match = value.match(/(\d+)/)
  return match ? match[1] + 'g' : value
}

async function importFromCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(l => l.trim())
  
  let updated = 0
  let notFound = []
  
  for (const line of lines) {
    const fields = parseCSVLine(line)
    if (fields.length < 10) continue
    
    // Mapeamento dos campos CSV
    const [
      ownerName,           // 0: Tutor
      dogName,             // 1: Cão
      age,                 // 2: Idade
      breed,               // 3: Raça
      sex,                 // 4: Sexo
      castrated,           // 5: Castrado
      temperament,         // 6: Temperamento
      size,                // 7: Porte
      allergies,           // 8: Alergias
      medications,         // 9: Medicações
      feedingType,         // 10: Tipo alimentação
      feedingInstructions, // 11: Instruções
      feedingTimes,        // 12: Vezes por dia
      feedingGrams,        // 13: Quantidade
      vetName,             // 14: Veterinário
      vetAuthorized,       // 15: Autorização
      allowPool,           // 16: Piscina
      allowPhotos,         // 17: Fotos
      serviceType,         // 18: Tipo serviço
      scheduledDays,         // 19: Dias agendados
      ,                    // 20: vazio
      ,                    // 21: vazio
      ,                    // 22: vazio
      enrollmentDate,       // 23: Data matrícula
      ownerEmail,          // 24: Email
      ownerPhone,          // 25: Telefone
      ownerCpf             // 26: CPF
    ] = fields
    
    // Limpar valores
    const cleanAllergies = allergies === 'Nenhuma informada' || allergies === 'Não informado' ? null : allergies
    const cleanMeds = medications === 'Nenhuma informada' || medications === 'Não informado' ? null : medications
    const cleanVet = vetName === 'Não informado' || vetName === 'Autorizo veterinário parceiro AU-Ê' ? null : vetName
    const cleanInstructions = feedingInstructions === 'Não informado' ? null : feedingInstructions
    
    // Buscar cão pelo nome
    const dog = await prisma.dog.findFirst({
      where: { 
        name: { contains: dogName.replace(/"/g, ''), mode: 'insensitive' }
      }
    })
    
    if (!dog) {
      notFound.push(dogName)
      continue
    }
    
    // Atualizar cão
    await prisma.dog.update({
      where: { id: dog.id },
      data: {
        // Dados do cão
        breed: breed || dog.breed,
        sex: sex || dog.sex,
        castrated: castrated?.toLowerCase() === 'sim' ? true : castrated?.toLowerCase() === 'não' ? false : dog.castrated,
        temperament: temperament || dog.temperament,
        size: size || dog.size,
        
        // Alimentação
        feedingType: feedingType || dog.feedingType,
        feedingInstructions: cleanInstructions || dog.feedingInstructions,
        feedingTimesPerDay: parseTimesPerDay(feedingTimes) || dog.feedingTimesPerDay,
        feedingGramsPerMeal: parseGrams(feedingGrams) || dog.feedingGramsPerMeal,
        
        // Saúde
        allergies: cleanAllergies || dog.allergies,
        medications: cleanMeds || dog.medications,
        vetName: cleanVet || dog.vetName,
        
        // Permissões
        allowPool: allowPool?.toUpperCase() === 'SIM' ? true : allowPool?.toUpperCase() === 'NÃO' ? false : dog.allowPool,
        allowPhotos: allowPhotos?.toUpperCase() === 'SIM' ? true : allowPhotos?.toUpperCase() === 'NÃO' ? false : dog.allowPhotos,
        
        // Serviço
        serviceType: serviceType || dog.serviceType,
        scheduledDays: scheduledDays || dog.scheduledDays,
        
        // Tutor
        ownerName: ownerName || dog.ownerName,
        ownerPhone: ownerPhone || dog.ownerPhone,
        ownerEmail: ownerEmail || dog.ownerEmail,
        ownerCpf: ownerCpf || dog.ownerCpf,
      }
    })
    
    console.log(`✅ ${dogName} atualizado`)
    updated++
  }
  
  console.log(`\n✅ Total atualizado: ${updated} cães`)
  if (notFound.length > 0) {
    console.log(`⚠️ Não encontrados: ${notFound.join(', ')}`)
  }
}

// Verificar se foi passado arquivo como argumento
const filePath = process.argv[2]
if (!filePath) {
  console.log('Uso: node import-csv-dogs.js <arquivo.csv>')
  console.log('')
  console.log('Formato esperado do CSV (campos separados por ;):')
  console.log('Tutor;Cão;Idade;Raça;Sexo;Castrado;Temperamento;Porte;Alergias;Medicações;Tipo_Alimentação;Instruções;Vezes_Dia;Quantidade;Veterinário;Autorização;Piscina;Fotos;Serviço;Dias;...;Email;Telefone;CPF')
  process.exit(1)
}

importFromCSV(filePath)
  .catch(console.error)
  .finally(() => prisma.$disconnect())
