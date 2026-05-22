const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// ── Helpers ──────────────────────────────────────────────────────────────────

function clean(val) {
  if (!val) return null
  const t = val.trim()
  const empties = ['nenhuma informada', 'nenhuma', 'não informado', 'nao informado', 'não teve']
  if (!t || empties.includes(t.toLowerCase())) return null
  return t
}

function parseSex(v) {
  if (!v) return null
  const l = v.trim().toLowerCase()
  if (l === 'femea' || l === 'fêmea') return 'Fêmea'
  if (l === 'macho') return 'Macho'
  return v.trim()
}

function parseCastrated(v) {
  if (!v) return null
  return v.trim().toLowerCase() === 'sim'
}

function parseSize(v) {
  if (!v) return null
  const l = v.trim().toLowerCase()
  if (l === 'pequeno') return 'Pequeno'
  if (l === 'medio' || l === 'médio') return 'Médio'
  if (l === 'grande') return 'Grande'
  return v.trim()
}

function parseBool(v) {
  if (!v) return false
  return v.trim().toUpperCase() === 'SIM'
}

function parseVet(v) {
  if (!v || !v.trim()) return null
  const t = v.trim()
  if (t === 'Autorizo veterinário parceiro AU-Ê') return 'Veterinário parceiro AU-Ê'
  const prefix = 'Meu veterinário: '
  if (t.startsWith(prefix)) {
    const rest = t.slice(prefix.length).trim()
    return rest || null
  }
  return t
}

function dogStatus(serviceType) {
  if (!serviceType) return 'CRECHE'
  const l = serviceType.trim().toLowerCase()
  if (l === 'hotel') return 'HOTEL'
  return 'CRECHE'
}

function notes(checkin, checkout, obs) {
  const parts = []
  if (checkin && checkin.trim() && checkin.trim().toLowerCase() !== 'não informado') parts.push(`Check-in: ${checkin.trim()}`)
  if (checkout && checkout.trim()) parts.push(`Check-out: ${checkout.trim()}`)
  if (obs && obs.trim()) parts.push(obs.trim())
  return parts.length > 0 ? parts.join(' | ') : null
}

// ── Dog data ─────────────────────────────────────────────────────────────────

const dogs = [
  {
    name: 'Sol', ownerName: 'Carla Sato', matricula: 'H001',
    breed: 'Border Collie', sex: parseSex('femea'), castrated: parseCastrated('sim'),
    temperament: 'media-energia', size: parseSize('medio'),
    medications: null, allergies: null,
    feedingType: 'racao_seca', feedingInstructions: null,
    feedingTimesPerDay: '2', feedingGramsPerMeal: '160g',
    preferredActivities: 'Correr e pegar bolinha',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Hotel', scheduledDays: null,
    enrollmentDate: '28/03/2026',
    ownerEmail: 'Carla.akemi.sato@gmail.com', ownerPhone: '11991289694', ownerCpf: '36704848843',
    dogStatus: 'HOTEL', notes: notes('02/04/2026', '05/04/2026', null),
  },
  {
    name: 'Dory', ownerName: 'Valéria Bellato', matricula: 'C001',
    breed: 'Lhasa Apso', sex: parseSex('femea'), castrated: parseCastrated('sim'),
    temperament: 'muita-energia', size: parseSize('medio'),
    medications: null, allergies: null,
    feedingType: 'mista',
    feedingInstructions: 'Café da manhã: melão (1 fatia) ou batata doce (80g). Almoço: ração seca (50g)',
    feedingTimesPerDay: '1', feedingGramsPerMeal: '50g',
    preferredActivities: 'Tudo que imaginar',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche', scheduledDays: 'Terça',
    enrollmentDate: '30/03/2026',
    ownerEmail: 'bellato.consultora@gmail.com', ownerPhone: '11947746229', ownerCpf: '031.162.158-98',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Sirius Black', ownerName: 'Aline Porto Gomes', matricula: 'C002',
    breed: 'Pug', sex: parseSex('macho'), castrated: parseCastrated('sim'),
    temperament: 'muita-energia', size: parseSize('pequeno'),
    medications: 'Olhinho operado — enxerga menos, precisa de colírio todos os dias',
    allergies: 'Perfume direto na pele (barriga, pescoço) causa irritação',
    feedingType: 'mista',
    feedingInstructions: 'Come 50g de ração com franguinho desfiado 2x ao dia',
    feedingTimesPerDay: '2', feedingGramsPerMeal: '50g',
    preferredActivities: 'Buscar brinquedos',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche + Hotel', scheduledDays: 'Quarta',
    enrollmentDate: '20/03/2026',
    ownerEmail: 'portogomesaline@gmail.com', ownerPhone: '11982356063', ownerCpf: '42131396899',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Luna', ownerName: 'Tassia Gomes Jardim Brandão', matricula: 'H002',
    breed: 'Maltês', sex: parseSex('femea'), castrated: parseCastrated('sim'),
    temperament: 'media-energia', size: parseSize('pequeno'),
    medications: 'Dermatite atópica — usa Zenrelia 1/2 comprimido por dia (no jantar com pão)',
    allergies: null,
    feedingType: 'mista',
    feedingInstructions: 'Três refeições: 8h, 12h e 20h — 1 scoop cheio por refeição',
    feedingTimesPerDay: '3', feedingGramsPerMeal: '25g',
    preferredActivities: 'Buscar bolinha e chamego',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche + Hotel', scheduledDays: 'Segunda, Terça, Quarta, Quinta, Sexta, Sábado',
    enrollmentDate: '20/03/2026',
    ownerEmail: 'tassiagj@gmail.com', ownerPhone: '11971572749', ownerCpf: '35680254859',
    dogStatus: 'CRECHE', notes: notes('24/03/2026', '04/04/2026', 'Período viagem de férias'),
  },
  {
    name: 'Baruc', ownerName: 'Débora Cristina Dantas de Sousa', matricula: 'D001',
    breed: 'Golden Retriever', sex: parseSex('macho'), castrated: parseCastrated('sim'),
    temperament: 'media-energia', size: parseSize('medio'),
    medications: 'Alergia atópica', allergies: 'Alimentar',
    feedingType: 'racao_seca', feedingInstructions: null,
    feedingTimesPerDay: '2', feedingGramsPerMeal: '240g',
    preferredActivities: 'Jogar brinquedo, puxar corda, esconder, correr, puxar a guia, empurra-empurra',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche + Hotel', scheduledDays: 'Quarta, Quinta',
    enrollmentDate: '14/03/2026',
    ownerEmail: 'deboracdantas88@gmail.com', ownerPhone: '11940145681', ownerCpf: '35382667861',
    dogStatus: 'CRECHE', notes: notes('16/03/2026', '01/04/2026', 'Em aberto para entender a adaptação. Iniciando com petcare avulso'),
  },
  {
    name: 'Theodoro', ownerName: 'Vitória Peres Cobo Koyama', matricula: 'C003',
    breed: 'Shih Tzu', sex: parseSex('macho'), castrated: parseCastrated('sim'),
    temperament: 'muita-energia', size: parseSize('pequeno'),
    medications: 'Obesidade', allergies: null,
    feedingType: 'racao_seca', feedingInstructions: 'Ração específica para obesidade',
    feedingTimesPerDay: '3', feedingGramsPerMeal: '100g',
    preferredActivities: 'Buscar bolinha, correr, morder',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche', scheduledDays: 'Terça, Quinta',
    enrollmentDate: '17/03/2026',
    ownerEmail: 'vickoyama22@gmail.com', ownerPhone: '11971269888', ownerCpf: '431.548.198-00',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Romain', ownerName: 'Gabriel Montanher', matricula: 'C004',
    breed: 'SRD - Sem Raça Definida', sex: parseSex('macho'), castrated: parseCastrated('sim'),
    temperament: 'muita-energia', size: parseSize('medio'),
    medications: null, allergies: 'Formigas',
    feedingType: 'racao_seca', feedingInstructions: null,
    feedingTimesPerDay: '1', feedingGramsPerMeal: '200g',
    preferredActivities: 'Buscar bolinha, mordedores e pular',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche', scheduledDays: 'Quarta, Sexta',
    enrollmentDate: '18/03/2026',
    ownerEmail: 'gabriel.montanher@icloud.com', ownerPhone: '11954879133', ownerCpf: '4126251138',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Theo', ownerName: 'Gabriel Montanher', matricula: 'C005',
    breed: 'Maltês', sex: parseSex('macho'), castrated: parseCastrated('sim'),
    temperament: 'muita-energia', size: parseSize('pequeno'),
    medications: 'Já precisou fazer fisioterapia por luxação e frouxidão na patela',
    allergies: null,
    feedingType: 'alimentacao_natural',
    feedingInstructions: 'Alimentação enviada já pesada — comerá apenas no horário do almoço',
    feedingTimesPerDay: '1', feedingGramsPerMeal: '60g',
    preferredActivities: 'Brinquedos de corda (cabo de guerra)',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche', scheduledDays: 'Quarta, Sexta',
    enrollmentDate: '18/03/2026',
    ownerEmail: 'gabriel.montanher@icloud.com', ownerPhone: '11954879133', ownerCpf: '4126251138',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Ramiro', ownerName: 'Bárbara Gomes', matricula: 'H003',
    breed: 'SRD - Sem Raça Definida', sex: parseSex('macho'), castrated: parseCastrated('sim'),
    temperament: 'muita-energia', size: parseSize('medio'),
    medications: null, allergies: null,
    feedingType: 'racao_seca', feedingInstructions: null,
    feedingTimesPerDay: null, feedingGramsPerMeal: null,
    preferredActivities: null, vetName: null,
    allowPool: false, allowPhotos: false,
    serviceType: 'Hotel', scheduledDays: null,
    enrollmentDate: null,
    ownerEmail: null, ownerPhone: null, ownerCpf: null,
    dogStatus: 'HOTEL', notes: null,
  },
  {
    name: 'Mel', ownerName: 'Jeniffer Lemes', matricula: 'H004',
    breed: 'Border Collie', sex: parseSex('femea'), castrated: parseCastrated('nao'),
    temperament: 'muita-energia', size: parseSize('medio'),
    medications: null, allergies: null,
    feedingType: 'racao_seca', feedingInstructions: null,
    feedingTimesPerDay: '3', feedingGramsPerMeal: '180g',
    preferredActivities: null, vetName: null,
    allowPool: true, allowPhotos: true,
    serviceType: 'Hotel', scheduledDays: null,
    enrollmentDate: '21/03/2026',
    ownerEmail: 'jeniffer.lemes.2112@gmail.com', ownerPhone: '11947185411', ownerCpf: '44306218880',
    dogStatus: 'HOTEL', notes: notes('21/03/2026', '22/03/2026', null),
  },
  {
    name: 'Júpiter', ownerName: 'Gabriela Bittencourt', matricula: 'C006',
    breed: 'Dachshund', sex: parseSex('macho'), castrated: parseCastrated('sim'),
    temperament: 'media-energia', size: parseSize('pequeno'),
    medications: null, allergies: null,
    feedingType: 'racao_seca', feedingInstructions: null,
    feedingTimesPerDay: '1', feedingGramsPerMeal: '60g',
    preferredActivities: 'Buscar bolinha',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche', scheduledDays: 'Terça, Quinta',
    enrollmentDate: '25/03/2026',
    ownerEmail: 'gabittencourtc@hotmail.com', ownerPhone: '11986119285', ownerCpf: '42815015846',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Thifany', ownerName: 'Roselaine da Mota Felisberto', matricula: 'D002',
    breed: 'Lhasa Apso', sex: parseSex('femea'), castrated: parseCastrated('sim'),
    temperament: 'media-energia', size: parseSize('pequeno'),
    medications: null, allergies: null,
    feedingType: 'mista',
    feedingInstructions: 'Gosta de frango desfiado, carne moída, peixe, carne desfiada',
    feedingTimesPerDay: '2', feedingGramsPerMeal: '100g',
    preferredActivities: 'Correr atrás de brinquedo',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche + Hotel', scheduledDays: null,
    enrollmentDate: '25/03/2026',
    ownerEmail: 'roselainefelisberto_sp@hotmail.com', ownerPhone: '11997181503', ownerCpf: '18351300896',
    dogStatus: 'CRECHE', notes: 'Vou analisar o melhor dia',
  },
  {
    name: 'Jack Sparrow', ownerName: 'Ana Gabriela Monteiro Santos Warkentin', matricula: 'D003',
    breed: 'SRD - Sem Raça Definida', sex: parseSex('macho'), castrated: parseCastrated('sim'),
    temperament: 'muita-energia', size: parseSize('medio'),
    medications: null,
    allergies: 'Episódios de diarreia com ração — suspensa, apenas alimentação natural',
    feedingType: 'alimentacao_natural',
    feedingInstructions: 'Manhã: 1 ovo cozido. Almoço: metade do pacote congelado (descongelar dia anterior). Jantar: outra metade',
    feedingTimesPerDay: '2', feedingGramsPerMeal: '375g aprox',
    preferredActivities: 'Bolinha, pular, correr, carrinho. Tem medo de água.',
    vetName: parseVet('Meu veterinário: Dra Alessan (prevent4pet) — 11 95049-2308'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Hotel', scheduledDays: null,
    enrollmentDate: '26/03/2026',
    ownerEmail: 'Ana.gabriela.m.santos@gmail.com', ownerPhone: '11992622142', ownerCpf: '400.911.278-66',
    dogStatus: 'HOTEL', notes: notes('11/04/2026', '17/04/2026', 'Período de férias'),
  },
  {
    name: 'Annie Bonny', ownerName: 'Ana Gabriela Monteiro Santos Warkentin', matricula: 'D004',
    breed: 'SRD - Sem Raça Definida', sex: parseSex('femea'), castrated: parseCastrated('sim'),
    temperament: 'muita-energia', size: parseSize('medio'),
    medications: null,
    allergies: 'Episódios de diarreia com ração — suspensa, apenas alimentação natural',
    feedingType: 'alimentacao_natural',
    feedingInstructions: 'Manhã: 1 ovo cozido. Almoço: metade do pacote congelado (descongelar dia anterior). Jantar: outra metade',
    feedingTimesPerDay: '2', feedingGramsPerMeal: '375g aprox',
    preferredActivities: 'Bolinha, pular, correr, carrinho. Tem medo de água.',
    vetName: parseVet('Meu veterinário: Dra Alessan (prevent4pet) — 11 95049-2308'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Hotel', scheduledDays: null,
    enrollmentDate: '26/03/2026',
    ownerEmail: 'Ana.gabriela.m.santos@gmail.com', ownerPhone: '11992622142', ownerCpf: '400.911.278-66',
    dogStatus: 'HOTEL', notes: notes('11/04/2026', '17/04/2026', 'Período de férias'),
  },
  {
    name: 'Eunira Keiko Uchida', ownerName: 'Betina', matricula: 'C012',
    breed: 'SRD - Sem Raça Definida', sex: parseSex('femea'), castrated: parseCastrated('sim'),
    temperament: 'media-energia', size: parseSize('medio'),
    medications: null,
    allergies: 'Não pode comer: banana, abobrinha, manga',
    feedingType: 'racao_seca',
    feedingInstructions: 'Almoço 11h: ração seca misturada com úmida (já na quantidade certa). 13h: cenouras cozidas. 15h: batata doce cozida',
    feedingTimesPerDay: '3', feedingGramsPerMeal: '60g',
    preferredActivities: 'Bolinhas, pular arco de bambolê, andar entre cones (com petiscos)',
    vetName: null,
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche', scheduledDays: 'Quinta',
    enrollmentDate: '27/04/2026',
    ownerEmail: 'Eunirakeiko@gmail.com', ownerPhone: '11995061746', ownerCpf: '009.090.608-00',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Tobias', ownerName: 'Silvana Cobo', matricula: 'C007',
    breed: 'Shih Tzu', sex: parseSex('macho'), castrated: parseCastrated('sim'),
    temperament: 'baixa-energia', size: parseSize('pequeno'),
    medications: 'Lama na vesícula', allergies: null,
    feedingType: 'mista',
    feedingInstructions: 'Misturar ração com pedaços de beterraba e carne moída',
    feedingTimesPerDay: '2', feedingGramsPerMeal: '40g',
    preferredActivities: 'Dormir',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche', scheduledDays: 'Terça, Quinta',
    enrollmentDate: '29/03/2026',
    ownerEmail: 'Cobosilvana28@gmail.com', ownerPhone: '11971521665', ownerCpf: '6061452810',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Maya', ownerName: 'Leonardo Gattermayer', matricula: 'C008',
    breed: 'Golden Retriever', sex: parseSex('femea'), castrated: parseCastrated('sim'),
    temperament: 'muita-energia', size: parseSize('grande'),
    medications: null,
    allergies: 'Cloro (piscina) — banho obrigatório após contato com piscina',
    feedingType: 'racao_seca',
    feedingInstructions: 'Duas refeições: primeira de manhã cedo e segunda por volta das 20h',
    feedingTimesPerDay: '2', feedingGramsPerMeal: '200g',
    preferredActivities: 'Buscar bolinha',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche + Hotel', scheduledDays: 'Sexta',
    enrollmentDate: '17/04/2026',
    ownerEmail: 'leogattermayer@hotmail.com', ownerPhone: '17996332736', ownerCpf: '41725586827',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Bucky', ownerName: 'Lucas de Carvalho Xavier', matricula: 'C009',
    breed: 'Golden Retriever', sex: parseSex('macho'), castrated: parseCastrated('sim'),
    temperament: 'muita-energia', size: parseSize('grande'),
    medications: 'Dermatites', allergies: 'Perfume',
    feedingType: 'racao_seca', feedingInstructions: null,
    feedingTimesPerDay: '3', feedingGramsPerMeal: '150g',
    preferredActivities: 'Buscar bolinha e brinquedos de morder',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche', scheduledDays: 'Segunda, Quarta',
    enrollmentDate: '14/04/2026',
    ownerEmail: 'Lucas_xavier@icloud.com', ownerPhone: '11973360863', ownerCpf: '41763354830',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Leonardo', ownerName: 'Thaís Gabrielly Pereira Mançano', matricula: 'C010',
    breed: 'Golden Retriever', sex: parseSex('macho'), castrated: parseCastrated('sim'),
    temperament: 'muita-energia', size: parseSize('grande'),
    medications: null, allergies: null,
    feedingType: 'racao_seca', feedingInstructions: null,
    feedingTimesPerDay: '4', feedingGramsPerMeal: '100g',
    preferredActivities: null,
    vetName: parseVet('Meu veterinário: vitha'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche', scheduledDays: 'Segunda, Quarta',
    enrollmentDate: '22/04/2026',
    ownerEmail: 'mancanothais@gmail.com', ownerPhone: '11960884582', ownerCpf: '36758737810',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Theodoro', ownerName: 'Rafaela', matricula: 'H005',
    breed: 'Não informado', sex: null, castrated: null,
    temperament: null, size: null,
    medications: null, allergies: null,
    feedingType: null, feedingInstructions: null,
    feedingTimesPerDay: null, feedingGramsPerMeal: null,
    preferredActivities: null, vetName: null,
    allowPool: false, allowPhotos: false,
    serviceType: 'Hotel', scheduledDays: null,
    enrollmentDate: null,
    ownerEmail: null, ownerPhone: null, ownerCpf: null,
    dogStatus: 'HOTEL', notes: null,
  },
  {
    name: 'Diana', ownerName: 'Rafaela', matricula: 'H006',
    breed: 'Não informado', sex: null, castrated: null,
    temperament: null, size: null,
    medications: null, allergies: null,
    feedingType: null, feedingInstructions: null,
    feedingTimesPerDay: null, feedingGramsPerMeal: null,
    preferredActivities: null, vetName: null,
    allowPool: false, allowPhotos: false,
    serviceType: 'Hotel', scheduledDays: null,
    enrollmentDate: null,
    ownerEmail: null, ownerPhone: null, ownerCpf: null,
    dogStatus: 'HOTEL', notes: null,
  },
  {
    name: 'Lolla', ownerName: 'Rafaela', matricula: 'H007',
    breed: 'Não informado', sex: null, castrated: null,
    temperament: null, size: null,
    medications: null, allergies: null,
    feedingType: null, feedingInstructions: null,
    feedingTimesPerDay: null, feedingGramsPerMeal: null,
    preferredActivities: null, vetName: null,
    allowPool: false, allowPhotos: false,
    serviceType: 'Hotel', scheduledDays: null,
    enrollmentDate: null,
    ownerEmail: null, ownerPhone: null, ownerCpf: null,
    dogStatus: 'HOTEL', notes: null,
  },
  {
    name: 'Pandora Zenezi', ownerName: 'Rafaella Rodrigues Zenezi', matricula: 'C011',
    breed: 'Golden Retriever', sex: parseSex('femea'), castrated: parseCastrated('nao'),
    temperament: 'muita-energia', size: parseSize('medio'),
    medications: null,
    allergies: 'Cenoura e biscoitos gourmet com banha suína',
    feedingType: 'mista',
    feedingInstructions: 'Ração + legumes cozidos',
    feedingTimesPerDay: '4', feedingGramsPerMeal: '110g',
    preferredActivities: 'Buscar brinquedos, brincadeiras com água, correr',
    vetName: null,
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche', scheduledDays: 'Segunda, Terça, Quarta, Quinta, Sexta',
    enrollmentDate: '28/04/2026',
    ownerEmail: 'rafaellarodrigues.zenezi@gmail.com', ownerPhone: '11996399887', ownerCpf: '51512673889',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Cloe Regina', ownerName: 'Aline Gonzalez', matricula: 'C014',
    breed: 'Bulldog Francês', sex: parseSex('femea'), castrated: parseCastrated('sim'),
    temperament: 'muita-energia', size: parseSize('medio'),
    medications: null, allergies: null,
    feedingType: 'racao_seca', feedingInstructions: null,
    feedingTimesPerDay: '1', feedingGramsPerMeal: '250g',
    preferredActivities: 'Bolinha e pelúcia',
    vetName: null,
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche', scheduledDays: 'Quarta',
    enrollmentDate: '08/05/2026',
    ownerEmail: 'Alinegonzalez89@me.com', ownerPhone: '11976863737', ownerCpf: '36723402863',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Charlotte', ownerName: 'Alexandra Peixoto Demori Lima', matricula: 'C013',
    breed: 'Golden Retriever', sex: parseSex('femea'), castrated: parseCastrated('nao'),
    temperament: 'media-energia', size: parseSize('grande'),
    medications: null, allergies: null,
    feedingType: 'racao_seca', feedingInstructions: null,
    feedingTimesPerDay: '2', feedingGramsPerMeal: '200g',
    preferredActivities: 'Buscar bolinha, esconde-esconde, puxa-puxa, adora água',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche', scheduledDays: 'Terça, Quinta, Sábado',
    enrollmentDate: '25/04/2026',
    ownerEmail: 'alexandra.demori@hotmail.com', ownerPhone: '11949101786', ownerCpf: '219.445.198-66',
    dogStatus: 'CRECHE', notes: null,
  },
  {
    name: 'Nina', ownerName: 'Maísa Barros Donato', matricula: 'H008',
    breed: 'Goldendoodle', sex: parseSex('femea'), castrated: parseCastrated('nao'),
    temperament: 'muita-energia', size: parseSize('medio'),
    medications: null, allergies: null,
    feedingType: 'racao_seca', feedingInstructions: null,
    feedingTimesPerDay: '3', feedingGramsPerMeal: '70g',
    preferredActivities: 'Brinquedos de morder e buscar bolinhas',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: false, allowPhotos: true,
    serviceType: 'Hotel', scheduledDays: null,
    enrollmentDate: '23/04/2026',
    ownerEmail: 'maisabdonato@gmail.com', ownerPhone: '11955849564', ownerCpf: '4643817119',
    dogStatus: 'HOTEL', notes: notes('25/04/2026', '25/04/2026', 'Adaptação'),
  },
  {
    name: 'Tsuki', ownerName: 'Neusa Tomoe Kuga Yamaji', matricula: 'D005',
    breed: 'SRD - Sem Raça Definida', sex: parseSex('femea'), castrated: parseCastrated('sim'),
    temperament: 'media-energia', size: parseSize('medio'),
    medications: null, allergies: null,
    feedingType: 'racao_seca',
    feedingInstructions: 'Ração seca com meio sachê de ração úmida',
    feedingTimesPerDay: '2', feedingGramsPerMeal: '105g',
    preferredActivities: 'Bolinha, corda',
    vetName: parseVet('Autorizo veterinário parceiro AU-Ê'),
    allowPool: true, allowPhotos: true,
    serviceType: 'Creche + Hotel', scheduledDays: null,
    enrollmentDate: '27/04/2026',
    ownerEmail: 'Kugatomoe@hotmail.com', ownerPhone: '11991082272', ownerCpf: '11669722830',
    dogStatus: 'CRECHE', notes: null,
  },
]

// ── Run import ────────────────────────────────────────────────────────────────

async function main() {
  let created = 0, skipped = 0, errors = 0

  for (const dog of dogs) {
    try {
      const existing = dog.matricula
        ? await prisma.dog.findUnique({ where: { matricula: dog.matricula } })
        : null

      if (existing) {
        console.log(`⏭  Pulando ${dog.name} (${dog.matricula}) — já existe`)
        skipped++
        continue
      }

      await prisma.dog.create({
        data: {
          name: dog.name,
          ownerName: dog.ownerName || '',
          ownerPhone: dog.ownerPhone || '',
          ownerEmail: dog.ownerEmail,
          ownerCpf: dog.ownerCpf,
          matricula: dog.matricula,
          breed: dog.breed || '',
          sex: dog.sex,
          castrated: dog.castrated,
          temperament: dog.temperament,
          size: dog.size,
          medications: dog.medications,
          allergies: dog.allergies,
          feedingType: dog.feedingType,
          feedingInstructions: dog.feedingInstructions,
          feedingTimesPerDay: dog.feedingTimesPerDay,
          feedingGramsPerMeal: dog.feedingGramsPerMeal,
          preferredActivities: dog.preferredActivities,
          vetName: dog.vetName,
          allowPool: dog.allowPool,
          allowPhotos: dog.allowPhotos,
          serviceType: dog.serviceType,
          scheduledDays: dog.scheduledDays,
          enrollmentDate: dog.enrollmentDate,
          dogStatus: dog.dogStatus,
          notes: dog.notes,
          isActive: true,
        },
      })

      console.log(`✅ Criado: ${dog.name} (${dog.matricula}) — ${dog.ownerName}`)
      created++
    } catch (err) {
      console.error(`❌ Erro em ${dog.name} (${dog.matricula}):`, err.message)
      errors++
    }
  }

  console.log(`\n📊 Resumo: ${created} criados | ${skipped} pulados | ${errors} erros`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
