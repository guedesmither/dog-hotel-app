const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Função para verificar se valor é "vazio"
function isEmpty(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (typeof value === 'string' && value.trim().toLowerCase() === 'nenhuma informada') return true
  if (typeof value === 'string' && value.trim().toLowerCase() === 'não informado') return true
  return false
}

// Função para limpar valor da planilha
function cleanValue(value, fieldName) {
  if (!value) return null
  const trimmed = value.toString().trim()
  if (trimmed === '' || 
      trimmed.toLowerCase() === 'nenhuma informada' ||
      trimmed.toLowerCase() === 'não informado' ||
      trimmed.toLowerCase() === 'nao informado') {
    return null
  }
  return trimmed
}

// Extrair número de "2 vezes", "3 vezes"
function parseTimes(value) {
  if (!value) return null
  const match = value.toString().match(/(\d+)/)
  return match ? match[1] : null
}

// Extrair número de "160", "50 grs", "200g"
function parseGrams(value) {
  if (!value) return null
  const match = value.toString().match(/(\d+)/)
  return match ? match[1] + 'g' : value
}

// Dados da planilha (os 19 cães com dados completos)
const planilhaData = [
  {
    name: "Sol",
    ownerName: "Carla Sato",
    matricula: "H001",
    breed: "Border Collie",
    sex: "femea",
    castrated: "sim",
    temperament: "media-energia",
    size: "medio",
    doenca: null,
    allergies: "Nenhuma informada",
    feedingType: "racao_seca",
    feedingInstructions: null,
    feedingTimesPerDay: "2 vezes",
    feedingGramsPerMeal: "160",
    preferredActivities: "Correr e pegar bolinha",
    vetName: "Autorizo veterinário parceiro AU-Ê",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Hotel",
    scheduledDays: null,
    ownerEmail: "Carla.akemi.sato@gmail.com",
    ownerPhone: "11991289694",
    ownerCpf: "36704848843"
  },
  {
    name: "Dory",
    ownerName: "Valéria Bellato",
    matricula: "C001",
    breed: "Lhasa Apso",
    sex: "femea",
    castrated: "sim",
    temperament: "muita-energia",
    size: "medio",
    doenca: null,
    allergies: "Nenhuma informada",
    feedingType: "mista",
    feedingInstructions: "Café da manhã: melão (1 fatia) ou batata doce 80 gr) Almoço: ração seca (50 grs)",
    feedingTimesPerDay: "1 vez",
    feedingGramsPerMeal: "50 grs",
    preferredActivities: "Tudo que imaginar",
    vetName: "Autorizo veterinário parceiro AU-Ê",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Creche",
    scheduledDays: "Terça",
    ownerEmail: "bellato.consultora@gmail.com",
    ownerPhone: "11947746229",
    ownerCpf: "031.162.158-98"
  },
  {
    name: "Sirius Black",
    ownerName: "Aline Porto Gomes",
    matricula: "C002",
    breed: "Pug",
    sex: "macho",
    castrated: "sim",
    temperament: "muita-energia",
    size: "pequeno",
    doenca: "Ele tem um olhinho operado, que ele enxerga menos e precisa de colirio todos os dias.",
    allergies: "Perfume direto na pele (barriga, pescoço) dá uma irritação na pele",
    feedingType: "mista",
    feedingInstructions: "Ele come 50g de ração com franguinho desfiado 2x ao dia.",
    feedingTimesPerDay: "2 vezes",
    feedingGramsPerMeal: "50g",
    preferredActivities: "Ele gosta de tudo, mas acho que principalmente de buscar brinquedos.",
    vetName: "Autorizo veterinário parceiro AU-Ê",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Creche + Hotel",
    scheduledDays: "Quarta",
    ownerEmail: "portogomesaline@gmail.com",
    ownerPhone: "11982356063",
    ownerCpf: "42131396899"
  },
  {
    name: "Luna",
    ownerName: "Tassia Gomes Jardim Brandão",
    matricula: "H002",
    breed: "Maltes",
    sex: "femea",
    castrated: "sim",
    temperament: "media-energia",
    size: "pequeno",
    doenca: "Dermatite atópica",
    allergies: "Dermatite atópica, faz uso de medicamento diário (Zenrelia) de 1/2 meio comprimido ao dia. Costumamos dar medicação na hora do jantar junto com pedaço de pão.",
    feedingType: "mista",
    feedingInstructions: "Três refeições por dia sendo: Primeira 8h, segunda 12h e terceira 20h. Porção de um scoop cheio em cada refeição.",
    feedingTimesPerDay: "3 vezes",
    feedingGramsPerMeal: "25 gramas por refeição",
    preferredActivities: "Buscar bolinha e muito chamego.",
    vetName: "Autorizo veterinário parceiro AU-Ê",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Creche + Hotel",
    scheduledDays: "Segunda, Terça, Quarta, Quinta, Sexta, Sábado",
    ownerEmail: "tassiagj@gmail.com",
    ownerPhone: "11971572749",
    ownerCpf: "35680254859"
  },
  {
    name: "Baruc",
    ownerName: "Debora Cristina Dantas de Sousa",
    matricula: "D001",
    breed: "Golden Retriever",
    sex: "macho",
    castrated: "sim",
    temperament: "media-energia",
    size: "medio",
    doenca: "Alergia atópica",
    allergies: "Alimentar",
    feedingType: "racao_seca",
    feedingInstructions: null,
    feedingTimesPerDay: "2 vezes",
    feedingGramsPerMeal: "240",
    preferredActivities: "Jogar brinquedo, puxar corda, correr, puxar a guia",
    vetName: "Autorizo veterinário parceiro AU-Ê",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Creche + Hotel",
    scheduledDays: "Quarta, Quinta",
    ownerEmail: "deboracdantas88@gmail.com",
    ownerPhone: "11940145681",
    ownerCpf: "35382667861"
  },
  {
    name: "Theodoro",
    ownerName: "Vitória Peres Cobo Koyama",
    matricula: "C003",
    breed: "Shih Tzu",
    sex: "macho",
    castrated: "sim",
    temperament: "muita-energia",
    size: "pequeno",
    doenca: "Obesidade",
    allergies: "Nenhuma informada",
    feedingType: "racao_seca",
    feedingInstructions: "Ração específica para obesidade",
    feedingTimesPerDay: "3 vezes",
    feedingGramsPerMeal: "100",
    preferredActivities: "Buscar bolinha, correr, morder",
    vetName: "Autorizo veterinário parceiro AU-Ê",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Creche",
    scheduledDays: "Terça, Quinta",
    ownerEmail: "vickoyama22@gmail.com",
    ownerPhone: "11971269888",
    ownerCpf: "431.548.198-00"
  },
  {
    name: "Romain",
    ownerName: "Gabriel Montanher",
    matricula: "C004",
    breed: "SRD",
    sex: "macho",
    castrated: "sim",
    temperament: "muita-energia",
    size: "medio",
    doenca: null,
    allergies: "Formigas",
    feedingType: "racao_seca",
    feedingInstructions: null,
    feedingTimesPerDay: "1 vez",
    feedingGramsPerMeal: "200g",
    preferredActivities: "Buscar bolinha, mordedores e pular",
    vetName: "Autorizo veterinário parceiro AU-Ê",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Creche",
    scheduledDays: "Quarta, Sexta",
    ownerEmail: "gabriel.montanher@icloud.com",
    ownerPhone: "11954879133",
    ownerCpf: "4126251138"
  },
  {
    name: "Theo",
    ownerName: "Gabriel Montanher",
    matricula: "C005",
    breed: "Maltes",
    sex: "macho",
    castrated: "sim",
    temperament: "muita-energia",
    size: "pequeno",
    doenca: "Já precisou fazer fisioterapia, devido a luxação e frouxidão na patela",
    allergies: "Nenhuma informada",
    feedingType: "alimentacao_natural",
    feedingInstructions: "A alimentação dele será enviada já pesada, e ele comerá apenas no horário do almoço",
    feedingTimesPerDay: "1 vez",
    feedingGramsPerMeal: "60g",
    preferredActivities: "Brinquedos de corda pra fazer cabo de guerra",
    vetName: "Autorizo veterinário parceiro AU-Ê",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Creche",
    scheduledDays: "Quarta, Sexta",
    ownerEmail: "gabriel.montanher@icloud.com",
    ownerPhone: "11954879133",
    ownerCpf: "4126251138"
  },
  {
    name: "Mel",
    ownerName: "Jeniffer Lemes",
    matricula: "H004",
    breed: "Border Collie",
    sex: "femea",
    castrated: "nao",
    temperament: "muita-energia",
    size: "medio",
    doenca: null,
    allergies: "Nenhuma informada",
    feedingType: "racao_seca",
    feedingInstructions: null,
    feedingTimesPerDay: "3 vezes",
    feedingGramsPerMeal: "180g",
    preferredActivities: null,
    vetName: "Meu veterinário:",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Hotel",
    scheduledDays: null,
    ownerEmail: "jeniffer.lemes.2112@gmail.com",
    ownerPhone: "11947185411",
    ownerCpf: "44306218880"
  },
  {
    name: "Júpiter",
    ownerName: "Gabriela Bittencourt",
    matricula: "C006",
    breed: "Dashround",
    sex: "macho",
    castrated: "sim",
    temperament: "media-energia",
    size: "pequeno",
    doenca: null,
    allergies: "Nenhuma informada",
    feedingType: "racao_seca",
    feedingInstructions: null,
    feedingTimesPerDay: "1 vez",
    feedingGramsPerMeal: "60",
    preferredActivities: "Buscar bolinha",
    vetName: "Autorizo veterinário parceiro AU-Ê",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Creche",
    scheduledDays: "Terça, Quinta",
    ownerEmail: "gabittencourtc@hotmail.com",
    ownerPhone: "11986119285",
    ownerCpf: "42815015846"
  },
  {
    name: "Thifany",
    ownerName: "Roselaine da Mota Felisberto",
    matricula: "D002",
    breed: "Ihasa apso",
    sex: "femea",
    castrated: "sim",
    temperament: "media-energia",
    size: "pequeno",
    doenca: null,
    allergies: "Nenhuma informada",
    feedingType: "mista",
    feedingInstructions: "Ela gosta de frango desfiado, carne moída, peixe, carne desfiada.",
    feedingTimesPerDay: "2 vezes",
    feedingGramsPerMeal: "100",
    preferredActivities: "Gosta de correr atrás de brinquedo",
    vetName: "Autorizo veterinário parceiro AU-Ê",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Creche + Hotel",
    scheduledDays: null,
    ownerEmail: "roselainefelisberto_sp@hotmail.com",
    ownerPhone: "11997181503",
    ownerCpf: "18351300896"
  },
  {
    name: "Jack Sparrow",
    ownerName: "Ana Gabriela Monteiro Santos Warkentin",
    matricula: "D003",
    breed: "SRD",
    sex: "macho",
    castrated: "sim",
    temperament: "muita-energia",
    size: "medio",
    doenca: null,
    allergies: "Ele teve uns episódios em diarreia com a ração que ele comia no café da manha",
    feedingType: "alimentacao_natural",
    feedingInstructions: "De manha 1 ovo cozido, no almoço metade do pacote de alimentação natural congelada e a outra metade no horário do jantar",
    feedingTimesPerDay: "2 vezes",
    feedingGramsPerMeal: "375 aprox",
    preferredActivities: "Adora brincar de bolinha, de pular, de correr e carrinho.",
    vetName: "Dra ALessan (prevent4pet): 11 95049-2308dra",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Hotel",
    scheduledDays: null,
    ownerEmail: "Ana.gabriela.m.santos@gmail.com",
    ownerPhone: "11992622142",
    ownerCpf: "400.911.278-66"
  },
  {
    name: "Annie Bonny",
    ownerName: "Ana Gabriela Monteiro Santos Warkentin",
    matricula: "D004",
    breed: "SRD",
    sex: "macho",
    castrated: "sim",
    temperament: "muita-energia",
    size: "medio",
    doenca: null,
    allergies: "Ele teve uns episódios em diarreia com a ração que ele comia no café da manha",
    feedingType: "alimentacao_natural",
    feedingInstructions: "De manha 1 ovo cozido, no almoço metade do pacote de alimentação natural congelada e a outra metade no horário do jantar",
    feedingTimesPerDay: "2 vezes",
    feedingGramsPerMeal: "375 aprox",
    preferredActivities: "Adora brincar de bolinha, de pular, de correr e carrinho.",
    vetName: "Dra ALessan (prevent4pet): 11 95049-2308dra",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Hotel",
    scheduledDays: null,
    ownerEmail: "Ana.gabriela.m.santos@gmail.com",
    ownerPhone: "11992622142",
    ownerCpf: "400.911.278-66"
  },
  {
    name: "Tobias",
    ownerName: "Silvana Cobo",
    matricula: "C007",
    breed: "Shih Tzu",
    sex: "macho",
    castrated: "sim",
    temperament: "baixa-energia",
    size: "pequeno",
    doenca: "Tem lama na vesícula",
    allergies: "Não que saibamos.",
    feedingType: "mista",
    feedingInstructions: "Misturar a ração com pedaços de beterraba, carne moída...",
    feedingTimesPerDay: "2 vezes",
    feedingGramsPerMeal: "40g",
    preferredActivities: "Dormir",
    vetName: "Autorizo veterinário parceiro AU-Ê",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Creche",
    scheduledDays: "Terça, Quinta",
    ownerEmail: "Cobosilvana28@gmail.com",
    ownerPhone: "11971521665",
    ownerCpf: "6061452810"
  },
  {
    name: "Maya",
    ownerName: "Leonardo Gattermayer",
    matricula: "C008",
    breed: "Golden Retriever",
    sex: "femea",
    castrated: "sim",
    temperament: "muita-energia",
    size: "grande",
    doenca: "Sem nenhuma",
    allergies: "Cloro (piscina) - É fundamental o banho sempre que ela tiver contato com piscina",
    feedingType: "racao_seca",
    feedingInstructions: "Ela come duas vezes ao dia. Sempre no primeiro horário da manhã e por volta das 20:00",
    feedingTimesPerDay: "2 vezes",
    feedingGramsPerMeal: "200g",
    preferredActivities: "Buscar bolinha é a preferida",
    vetName: "Autorizo veterinário parceiro AU-Ê",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Creche + Hotel",
    scheduledDays: "Sexta",
    ownerEmail: "leogattermayer@hotmail.com",
    ownerPhone: "17996332736",
    ownerCpf: "41725586827"
  },
  {
    name: "Bucky",
    ownerName: "Lucas de Carvalho Xavier",
    matricula: "C009",
    breed: "Golden Retriever",
    sex: "macho",
    castrated: "sim",
    temperament: "muita-energia",
    size: "grande",
    doenca: "Dermatites",
    allergies: "Perfume",
    feedingType: null,
    feedingInstructions: null,
    feedingTimesPerDay: "3 vezes",
    feedingGramsPerMeal: "150g",
    preferredActivities: "Buscar bolinha e brinquedos de morder",
    vetName: "Autorizo veterinário parceiro AU-Ê",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Creche",
    scheduledDays: "Segunda, Quarta",
    ownerEmail: "Lucas_xavier@icloud.com",
    ownerPhone: "11973360863",
    ownerCpf: "41763354830"
  },
  {
    name: "Leonardo",
    ownerName: "Thaís Gabrielly Pereira Mançano",
    matricula: "C010",
    breed: "Golden",
    sex: "macho",
    castrated: "sim",
    temperament: "muita-energia",
    size: "grande",
    doenca: "Nenhuma informada",
    allergies: "Nenhuma informada",
    feedingType: "racao_seca",
    feedingInstructions: null,
    feedingTimesPerDay: "4 vezes",
    feedingGramsPerMeal: "100g",
    preferredActivities: null,
    vetName: "vitha",
    allowPool: "SIM",
    allowPhotos: "SIM",
    serviceType: "Creche",
    scheduledDays: "Segunda, Quarta",
    ownerEmail: "mancanothais@gmail.com",
    ownerPhone: "11960884582",
    ownerCpf: "36758737810"
  }
]

async function fillMissingData() {
  let updated = 0
  let notFound = []
  let skipped = 0

  for (const data of planilhaData) {
    try {
      // Buscar cão pelo nome
      const dog = await prisma.dog.findFirst({
        where: { 
          name: { contains: data.name, mode: 'insensitive' }
        }
      })

      if (!dog) {
        notFound.push(data.name)
        continue
      }

      // Preparar objeto de atualização - só campos vazios
      const updateData = {}

      // Dados do tutor
      if (isEmpty(dog.ownerName) && data.ownerName) updateData.ownerName = cleanValue(data.ownerName)
      if (isEmpty(dog.ownerPhone) && data.ownerPhone) updateData.ownerPhone = cleanValue(data.ownerPhone)
      if (isEmpty(dog.ownerEmail) && data.ownerEmail) updateData.ownerEmail = cleanValue(data.ownerEmail)
      if (isEmpty(dog.ownerCpf) && data.ownerCpf) updateData.ownerCpf = cleanValue(data.ownerCpf)

      // Dados do cão
      if (isEmpty(dog.breed) && data.breed) updateData.breed = cleanValue(data.breed)
      if (isEmpty(dog.sex) && data.sex) updateData.sex = cleanValue(data.sex)
      if (dog.castrated === null && data.castrated) {
        updateData.castrated = data.castrated.toLowerCase() === 'sim'
      }
      if (isEmpty(dog.temperament) && data.temperament) updateData.temperament = cleanValue(data.temperament)
      if (isEmpty(dog.size) && data.size) updateData.size = cleanValue(data.size)
      if (isEmpty(dog.preferredActivities) && data.preferredActivities) updateData.preferredActivities = cleanValue(data.preferredActivities)

      // Alimentação
      if (isEmpty(dog.feedingType) && data.feedingType) updateData.feedingType = cleanValue(data.feedingType)
      if (isEmpty(dog.feedingInstructions) && data.feedingInstructions) updateData.feedingInstructions = cleanValue(data.feedingInstructions)
      if (isEmpty(dog.feedingTimesPerDay) && data.feedingTimesPerDay) {
        updateData.feedingTimesPerDay = parseTimes(data.feedingTimesPerDay)
      }
      if (isEmpty(dog.feedingGramsPerMeal) && data.feedingGramsPerMeal) {
        updateData.feedingGramsPerMeal = parseGrams(data.feedingGramsPerMeal)
      }

      // Saúde - IMPORTANTE: mesclar doença pré-existente + medicações
      const existingMeds = isEmpty(dog.medications) ? '' : dog.medications
      const newDoenca = cleanValue(data.doenca)
      const newMeds = cleanValue(data.allergies) // Na planilha, coluna "ALERGIAS" tem as medicações
      
      let combinedMeds = []
      if (newDoenca) combinedMeds.push(`Doença: ${newDoenca}`)
      if (newMeds && !newMeds.toLowerCase().includes('nenhuma')) combinedMeds.push(newMeds)
      
      if (combinedMeds.length > 0 && isEmpty(dog.medications)) {
        updateData.medications = combinedMeds.join('. ')
      }

      // Alergias - usar campo correto
      if (isEmpty(dog.allergies) && data.allergies) {
        const cleanAllergies = cleanValue(data.allergies)
        if (cleanAllergies && !cleanAllergies.toLowerCase().includes('nenhuma')) {
          updateData.allergies = cleanAllergies
        }
      }

      // Veterinário
      if (isEmpty(dog.vetName) && data.vetName) {
        const cleanVet = cleanValue(data.vetName)
        if (cleanVet && !cleanVet.toLowerCase().includes('autorizo')) {
          updateData.vetName = cleanVet
        }
      }

      // Permissões
      if (dog.allowPool === null && data.allowPool) {
        updateData.allowPool = data.allowPool.toUpperCase() === 'SIM'
      }
      if (dog.allowPhotos === null && data.allowPhotos) {
        updateData.allowPhotos = data.allowPhotos.toUpperCase() === 'SIM'
      }

      // Serviço
      if (isEmpty(dog.serviceType) && data.serviceType) updateData.serviceType = cleanValue(data.serviceType)
      if (isEmpty(dog.scheduledDays) && data.scheduledDays) updateData.scheduledDays = cleanValue(data.scheduledDays)

      // Verificar se há algo para atualizar
      if (Object.keys(updateData).length === 0) {
        console.log(`⏭️  ${dog.name}: Nada para atualizar (já preenchido)`)
        skipped++
        continue
      }

      // Atualizar
      await prisma.dog.update({
        where: { id: dog.id },
        data: updateData
      })

      console.log(`✅ ${dog.name}: ${Object.keys(updateData).join(', ')}`)
      updated++

    } catch (error) {
      console.error(`❌ Erro em ${data.name}:`, error.message)
    }
  }

  console.log(`\n📊 Resumo:`)
  console.log(`✅ Atualizados: ${updated}`)
  console.log(`⏭️  Pulados (já tinham dados): ${skipped}`)
  console.log(`⚠️  Não encontrados: ${notFound.join(', ') || 'Nenhum'}`)
}

fillMissingData()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
