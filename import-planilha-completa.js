const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Dados da planilha completa (CSV format)
const planilhaData = [
  { name: "Sol", ownerName: "Carla Sato", matricula: "H001", age: "4 anos e 10 meses", breed: "Border Collie", sex: "femea", castrated: "sim", temperament: "media-energia", size: "medio", doenca: null, allergies: "Nenhuma informada", feedingType: "racao_seca", feedingInstructions: "", feedingTimesPerDay: "2", feedingGramsPerMeal: "160", preferredActivities: "Correr e pegar bolinha", vetName: "Autorizo veterinário parceiro AU-Ê", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Hotel", scheduledDays: null, ownerEmail: "Carla.akemi.sato@gmail.com", ownerPhone: "11991289694", ownerCpf: "36704848843" },
  { name: "Dory", ownerName: "Valéria Bellato", matricula: "C001", age: "2 anos e 4 meses", breed: "Lhasa Apso", sex: "femea", castrated: "sim", temperament: "muita-energia", size: "medio", doenca: null, allergies: "Nenhuma informada", feedingType: "mista", feedingInstructions: "Café da manhã: melão (1 fatia) ou batata doce 80 gr) Almoço: ração seca (50 grs)", feedingTimesPerDay: "1", feedingGramsPerMeal: "50", preferredActivities: "Tudo que imaginar", vetName: "Autorizo veterinário parceiro AU-Ê", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Creche", scheduledDays: "Terça", ownerEmail: "bellato.consultora@gmail.com", ownerPhone: "11947746229", ownerCpf: "031.162.158-98" },
  { name: "Sirius Black", ownerName: "Aline Porto Gomes", matricula: "C002", age: "4 anos e 5 meses", breed: "Pug", sex: "macho", castrated: "sim", temperament: "muita-energia", size: "pequeno", doenca: "Ele tem um olhinho operado, que ele enxerga menos e precisa de colirio todos os dias.", allergies: "Perfume direto na pele (barriga, pescoço) dá uma irritação na pele", feedingType: "mista", feedingInstructions: "Ele come 50g de ração com franguinho desfiado 2x ao dia.", feedingTimesPerDay: "2", feedingGramsPerMeal: "50", preferredActivities: "Ele gosta de tudo, mas acho que principalmente de buscar brinquedos.", vetName: "Autorizo veterinário parceiro AU-Ê", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Creche + Hotel", scheduledDays: "Quarta", ownerEmail: "portogomesaline@gmail.com", ownerPhone: "11982356063", ownerCpf: "42131396899" },
  { name: "Luna", ownerName: "Tassia Gomes Jardim Brandão", matricula: "H002", age: "4 anos e 5 meses", breed: "Maltes", sex: "femea", castrated: "sim", temperament: "media-energia", size: "pequeno", doenca: "Dermatite atópica", allergies: "Dermatite atópica, faz uso de medicamento diário (Zenrelia) de 1/2 meio comprimido ao dia. Costumamos dar medicação na hora do jantar junto com pedaço de pão.", feedingType: "mista", feedingInstructions: "Três refeições por dia sendo: Primeira 8h, segunda 12h e terceira 20h. Porção de um scoop cheio em cada refeição.", feedingTimesPerDay: "3", feedingGramsPerMeal: "25", preferredActivities: "Buscar bolinha e muito chamego.", vetName: "Autorizo veterinário parceiro AU-Ê", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Creche + Hotel", scheduledDays: "Segunda, Terça, Quarta, Quinta, Sexta, Sábado", ownerEmail: "tassiagj@gmail.com", ownerPhone: "11971572749", ownerCpf: "35680254859" },
  { name: "Baruc", ownerName: "Debora Cristina Dantas de Sousa", matricula: "D001", age: "6 anos e 0 meses", breed: "Golden Retriever", sex: "macho", castrated: "sim", temperament: "media-energia", size: "medio", doenca: "Alergia atópica", allergies: "Alimentar", feedingType: "racao_seca", feedingInstructions: "", feedingTimesPerDay: "2", feedingGramsPerMeal: "240", preferredActivities: "Jogar brinquedo, puxar corda, correr, puxar a guia", vetName: "Autorizo veterinário parceiro AU-Ê", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Creche + Hotel", scheduledDays: "Quarta, Quinta", ownerEmail: "deboracdantas88@gmail.com", ownerPhone: "11940145681", ownerCpf: "35382667861" },
  { name: "Theodoro", ownerName: "Vitória Peres Cobo Koyama", matricula: "C003", age: "1 anos e 2 meses", breed: "Shih Tzu", sex: "macho", castrated: "sim", temperament: "muita-energia", size: "pequeno", doenca: "Obesidade", allergies: "Nenhuma informada", feedingType: "racao_seca", feedingInstructions: "Ração específica para obesidade", feedingTimesPerDay: "3", feedingGramsPerMeal: "100", preferredActivities: "Buscar bolinha, correr, morder", vetName: "Autorizo veterinário parceiro AU-Ê", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Creche", scheduledDays: "Terça, Quinta", ownerEmail: "vickoyama22@gmail.com", ownerPhone: "11971269888", ownerCpf: "431.548.198-00" },
  { name: "Romain", ownerName: "Gabriel Montanher", matricula: "C004", age: "5 anos e 11 meses", breed: "SRD", sex: "macho", castrated: "sim", temperament: "muita-energia", size: "medio", doenca: null, allergies: "Formigas", feedingType: "racao_seca", feedingInstructions: "", feedingTimesPerDay: "1", feedingGramsPerMeal: "200", preferredActivities: "Buscar bolinha, mordedores e pular", vetName: "Autorizo veterinário parceiro AU-Ê", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Creche", scheduledDays: "Quarta, Sexta", ownerEmail: "gabriel.montanher@icloud.com", ownerPhone: "11954879133", ownerCpf: "4126251138" },
  { name: "Theo", ownerName: "Gabriel Montanher", matricula: "C005", age: "2 anos e 0 meses", breed: "Maltes", sex: "macho", castrated: "sim", temperament: "muita-energia", size: "pequeno", doenca: "Já precisou fazer fisioterapia, devido a luxação e frouxidão na patela", allergies: "Nenhuma informada", feedingType: "alimentacao_natural", feedingInstructions: "A alimentação dele será enviada já pesada, e ele comerá apenas no horário do almoço", feedingTimesPerDay: "1", feedingGramsPerMeal: "60", preferredActivities: "Brinquedos de corda pra fazer cabo de guerra", vetName: "Autorizo veterinário parceiro AU-Ê", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Creche", scheduledDays: "Quarta, Sexta", ownerEmail: "gabriel.montanher@icloud.com", ownerPhone: "11954879133", ownerCpf: "4126251138" },
  { name: "Júpiter", ownerName: "Gabriela Bittencourt", matricula: "C006", age: "3 anos e 6 meses", breed: "Dashround", sex: "macho", castrated: "sim", temperament: "media-energia", size: "pequeno", doenca: null, allergies: "Nenhuma informada", feedingType: "racao_seca", feedingInstructions: "", feedingTimesPerDay: "1", feedingGramsPerMeal: "60", preferredActivities: "Buscar bolinha", vetName: "Autorizo veterinário parceiro AU-Ê", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Creche", scheduledDays: "Terça, Quinta", ownerEmail: "gabittencourtc@hotmail.com", ownerPhone: "11986119285", ownerCpf: "42815015846" },
  { name: "Thifany", ownerName: "Roselaine da Mota Felisberto", matricula: "D002", age: "8 anos e 4 meses", breed: "Ihasa apso", sex: "femea", castrated: "sim", temperament: "media-energia", size: "pequeno", doenca: null, allergies: "Nenhuma informada", feedingType: "mista", feedingInstructions: "Ela gosta de frango desfiado, carne moída, peixe, carne desfiada.", feedingTimesPerDay: "2", feedingGramsPerMeal: "100", preferredActivities: "Gosta de correr atrás de brinquedo", vetName: "Autorizo veterinário parceiro AU-Ê", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Creche + Hotel", scheduledDays: null, ownerEmail: "roselainefelisberto_sp@hotmail.com", ownerPhone: "11997181503", ownerCpf: "18351300896" },
  { name: "Jack Sparrow", ownerName: "Ana Gabriela Monteiro Santos Warkentin", matricula: "D003", age: "3 anos e 10 meses", breed: "SRD", sex: "macho", castrated: "sim", temperament: "muita-energia", size: "medio", doenca: null, allergies: "Ele teve uns episódios em diarreia com a ração que ele comia no café da manha", feedingType: "alimentacao_natural", feedingInstructions: "De manha 1 ovo cozido, no almoço metade do pacote de alimentação natural congelada e a outra metade no horário do jantar", feedingTimesPerDay: "2", feedingGramsPerMeal: "375", preferredActivities: "Adora brincar de bolinha, de pular, de correr e carrinho.", vetName: "Dra ALessan (prevent4pet): 11 95049-2308dra", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Hotel", scheduledDays: null, ownerEmail: "Ana.gabriela.m.santos@gmail.com", ownerPhone: "11992622142", ownerCpf: "400.911.278-66" },
  { name: "Annie Bonny", ownerName: "Ana Gabriela Monteiro Santos Warkentin", matricula: "D004", age: "3 anos e 10 meses", breed: "SRD", sex: "macho", castrated: "sim", temperament: "muita-energia", size: "medio", doenca: null, allergies: "Ele teve uns episódios em diarreia com a ração que ele comia no café da manha", feedingType: "alimentacao_natural", feedingInstructions: "De manha 1 ovo cozido, no almoço metade do pacote de alimentação natural congelada e a outra metade no horário do jantar", feedingTimesPerDay: "2", feedingGramsPerMeal: "375", preferredActivities: "Adora brincar de bolinha, de pular, de correr e carrinho.", vetName: "Dra ALessan (prevent4pet): 11 95049-2308dra", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Hotel", scheduledDays: null, ownerEmail: "Ana.gabriela.m.santos@gmail.com", ownerPhone: "11992622142", ownerCpf: "400.911.278-66" },
  { name: "Tobias", ownerName: "Silvana Cobo", matricula: "C007", age: "7 anos e 11 meses", breed: "Shih Tzu", sex: "macho", castrated: "sim", temperament: "baixa-energia", size: "pequeno", doenca: "Tem lama na vesícula", allergies: "Não que saibamos.", feedingType: "mista", feedingInstructions: "Misturar a ração com pedaços de beterraba, carne moída...", feedingTimesPerDay: "2", feedingGramsPerMeal: "40", preferredActivities: "Dormir", vetName: "Autorizo veterinário parceiro AU-Ê", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Creche", scheduledDays: "Terça, Quinta", ownerEmail: "Cobosilvana28@gmail.com", ownerPhone: "11971521665", ownerCpf: "6061452810" },
  { name: "Maya", ownerName: "Leonardo Gattermayer", matricula: "C008", age: "3 anos e 0 meses", breed: "Golden Retriever", sex: "femea", castrated: "sim", temperament: "muita-energia", size: "grande", doenca: "Sem nenhuma", allergies: "Cloro (piscina) - É fundamental o banho sempre que ela tiver contato com piscina", feedingType: "racao_seca", feedingInstructions: "Ela come duas vezes ao dia. Sempre no primeiro horário da manhã e por volta das 20:00", feedingTimesPerDay: "2", feedingGramsPerMeal: "200", preferredActivities: "Buscar bolinha é a preferida", vetName: "Autorizo veterinário parceiro AU-Ê", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Creche + Hotel", scheduledDays: "Sexta", ownerEmail: "leogattermayer@hotmail.com", ownerPhone: "17996332736", ownerCpf: "41725586827" },
  { name: "Bucky", ownerName: "Lucas de Carvalho Xavier", matricula: "C009", age: "8 anos e 4 meses", breed: "Golden Retriever", sex: "macho", castrated: "sim", temperament: "muita-energia", size: "grande", doenca: "Dermatites", allergies: "Perfume", feedingType: null, feedingInstructions: null, feedingTimesPerDay: "3", feedingGramsPerMeal: "150", preferredActivities: "Buscar bolinha e brinquedos de morder", vetName: "Autorizo veterinário parceiro AU-Ê", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Creche", scheduledDays: "Segunda, Quarta", ownerEmail: "Lucas_xavier@icloud.com", ownerPhone: "11973360863", ownerCpf: "41763354830" },
  { name: "Leonardo", ownerName: "Thaís Gabrielly Pereira Mançano", matricula: "C010", age: "0 anos e 11 meses", breed: "Golden", sex: "macho", castrated: "sim", temperament: "muita-energia", size: "grande", doenca: "Nenhuma informada", allergies: "Nenhuma informada", feedingType: "racao_seca", feedingInstructions: "", feedingTimesPerDay: "4", feedingGramsPerMeal: "100", preferredActivities: null, vetName: "vitha", allowPool: "SIM", allowPhotos: "SIM", serviceType: "Creche", scheduledDays: "Segunda, Quarta", ownerEmail: "mancanothais@gmail.com", ownerPhone: "11960884582", ownerCpf: "36758737810" }
]

// Funções auxiliares
function isEmpty(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim() === '') return true
  return false
}

function cleanValue(value) {
  if (!value) return null
  let cleaned = value.toString().trim()
  if (cleaned === '' || cleaned.toLowerCase() === 'não informado' || cleaned.toLowerCase() === 'nenhuma informada') return null
  return cleaned
}

async function importPlanilha() {
  let updated = 0
  let skipped = 0
  let errors = []

  console.log(`Processando ${planilhaData.length} cães da planilha...\n`)

  for (const data of planilhaData) {
    try {
      // Buscar cão pelo nome
      const dog = await prisma.dog.findFirst({
        where: { 
          name: { contains: data.name, mode: 'insensitive' }
        }
      })

      if (!dog) {
        console.log(`⚠️  ${data.name}: Não encontrado no banco`)
        skipped++
        continue
      }

      // Preparar dados - só preencher campos vazios
      const updateData = {}

      // Tutor
      if (isEmpty(dog.ownerName) && cleanValue(data.ownerName)) updateData.ownerName = cleanValue(data.ownerName)
      if (isEmpty(dog.ownerPhone) && cleanValue(data.ownerPhone)) updateData.ownerPhone = cleanValue(data.ownerPhone)
      if (isEmpty(dog.ownerEmail) && cleanValue(data.ownerEmail)) updateData.ownerEmail = cleanValue(data.ownerEmail)
      if (isEmpty(dog.ownerCpf) && cleanValue(data.ownerCpf)) updateData.ownerCpf = cleanValue(data.ownerCpf)

      // Cão
      if (isEmpty(dog.breed) && cleanValue(data.breed)) updateData.breed = cleanValue(data.breed)
      if (isEmpty(dog.birthDate) && cleanValue(data.age)) updateData.birthDate = cleanValue(data.age)
      if (isEmpty(dog.sex) && cleanValue(data.sex)) updateData.sex = cleanValue(data.sex)
      if (dog.castrated === null && data.castrated) updateData.castrated = data.castrated === 'sim'
      if (isEmpty(dog.temperament) && cleanValue(data.temperament)) updateData.temperament = cleanValue(data.temperament)
      if (isEmpty(dog.size) && cleanValue(data.size)) updateData.size = cleanValue(data.size)
      if (isEmpty(dog.preferredActivities) && cleanValue(data.preferredActivities)) updateData.preferredActivities = cleanValue(data.preferredActivities)

      // Alimentação
      if (isEmpty(dog.feedingType) && cleanValue(data.feedingType)) updateData.feedingType = cleanValue(data.feedingType)
      if (isEmpty(dog.feedingInstructions) && cleanValue(data.feedingInstructions)) updateData.feedingInstructions = cleanValue(data.feedingInstructions)
      if (isEmpty(dog.feedingTimesPerDay) && cleanValue(data.feedingTimesPerDay)) updateData.feedingTimesPerDay = data.feedingTimesPerDay
      if (isEmpty(dog.feedingGramsPerMeal) && cleanValue(data.feedingGramsPerMeal)) updateData.feedingGramsPerMeal = data.feedingGramsPerMeal + 'g'

      // Saúde - combinar doença + alergias
      const healthParts = []
      if (cleanValue(data.doenca)) healthParts.push(`Condição: ${cleanValue(data.doenca)}`)
      if (cleanValue(data.allergies) && !data.allergies.includes('Nenhuma')) healthParts.push(`Alergias: ${cleanValue(data.allergies)}`)
      
      if (healthParts.length > 0) {
        if (isEmpty(dog.medications)) updateData.medications = healthParts.join('. ')
        if (isEmpty(dog.allergies) && cleanValue(data.allergies) && !data.allergies.includes('Nenhuma')) {
          updateData.allergies = cleanValue(data.allergies)
        }
      }

      // Veterinário
      if (isEmpty(dog.vetName) && cleanValue(data.vetName) && !data.vetName.includes('Autorizo')) {
        updateData.vetName = cleanValue(data.vetName)
      }

      // Permissões
      if (dog.allowPool === null && data.allowPool) updateData.allowPool = data.allowPool === 'SIM'
      if (dog.allowPhotos === null && data.allowPhotos) updateData.allowPhotos = data.allowPhotos === 'SIM'

      // Serviço
      if (isEmpty(dog.serviceType) && cleanValue(data.serviceType)) updateData.serviceType = cleanValue(data.serviceType)
      if (isEmpty(dog.scheduledDays) && cleanValue(data.scheduledDays)) updateData.scheduledDays = cleanValue(data.scheduledDays)

      // Verificar se há algo para atualizar
      if (Object.keys(updateData).length === 0) {
        console.log(`⏭️  ${dog.name}: Já completo`)
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
      errors.push({ name: data.name, error: error.message })
    }
  }

  console.log(`\n📊 RESUMO:`)
  console.log(`✅ Atualizados: ${updated}`)
  console.log(`⏭️  Pulados: ${skipped}`)
  console.log(`❌ Erros: ${errors.length}`)
}

importPlanilha()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
