// fix-ionice-schedule: remove future roster entries for Belinha, Hera, Suzy and clear seeds
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // 1. Add isBolsista column if not exists
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Dog" ADD COLUMN "isBolsista" BOOLEAN NOT NULL DEFAULT false`)
    console.log('Coluna isBolsista adicionada.')
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      console.log('Coluna isBolsista já existe.')
    } else {
      console.error('Erro ao adicionar coluna:', e.message)
    }
  }

  // 2. Create dogs
  const dogs = [
    // AU-Ê (nossos cães - bolsistas, todos os dias)
    {
      name: 'Teobaldo',
      breed: 'Bulldog Francês',
      ownerName: 'AU-Ê',
      ownerPhone: '',
      dogStatus: 'BOLSISTA',
      isBolsista: true,
      isActive: true,
      serviceType: 'Creche',
      scheduledDays: 'Segunda, Terça, Quarta, Quinta, Sexta',
      feedingGramsPerMeal: '80',
      feedingTimesPerDay: '1',
    },
    {
      name: 'Cacau',
      breed: 'Shih Tzu',
      ownerName: 'AU-Ê',
      ownerPhone: '',
      dogStatus: 'BOLSISTA',
      isBolsista: true,
      isActive: true,
      serviceType: 'Creche',
      scheduledDays: 'Segunda, Terça, Quarta, Quinta, Sexta',
      feedingGramsPerMeal: '30',
      feedingTimesPerDay: '2',
    },
    {
      name: 'Sambô',
      breed: 'Blue Heeler',
      ownerName: 'AU-Ê',
      ownerPhone: '',
      dogStatus: 'BOLSISTA',
      isBolsista: true,
      isActive: true,
      serviceType: 'Creche',
      scheduledDays: 'Segunda, Terça, Quarta, Quinta, Sexta',
      feedingGramsPerMeal: '200',
      feedingTimesPerDay: '2',
    },
    {
      name: 'Auê',
      breed: 'Brown Heeler',
      ownerName: 'AU-Ê',
      ownerPhone: '',
      dogStatus: 'BOLSISTA',
      isBolsista: true,
      isActive: true,
      serviceType: 'Creche',
      scheduledDays: 'Segunda, Terça, Quarta, Quinta, Sexta',
      feedingGramsPerMeal: '200',
      feedingTimesPerDay: '2',
    },
    // Ionice Leite (bolsistas)
    {
      name: 'Belinha',
      breed: 'Chihuahua',
      ownerName: 'Ionice Leite',
      ownerPhone: '',
      dogStatus: 'BOLSISTA',
      isBolsista: true,
      isActive: true,
      serviceType: 'Creche',
      scheduledDays: 'Segunda, Terça, Quarta, Quinta, Sexta',
      feedingGramsPerMeal: '20',
      feedingTimesPerDay: '3',
    },
    {
      name: 'Hera',
      breed: 'Border Collie',
      ownerName: 'Ionice Leite',
      ownerPhone: '',
      dogStatus: 'BOLSISTA',
      isBolsista: true,
      isActive: true,
      serviceType: 'Creche',
      scheduledDays: 'Segunda, Terça, Quarta, Quinta, Sexta',
      feedingGramsPerMeal: '85',
      feedingTimesPerDay: '3',
    },
    {
      name: 'Suzy',
      breed: 'Border Collie',
      ownerName: 'Ionice Leite',
      ownerPhone: '',
      dogStatus: 'BOLSISTA',
      isBolsista: true,
      isActive: true,
      serviceType: 'Creche',
      scheduledDays: 'Segunda, Terça, Quarta, Quinta, Sexta',
      feedingGramsPerMeal: '85',
      feedingTimesPerDay: '3',
    },
  ]

  const { v4: uuidv4 } = require('crypto')
  function newId() {
    // cuid-like: use random hex
    return 'c' + require('crypto').randomBytes(11).toString('hex')
  }

  for (const d of dogs) {
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id FROM "Dog" WHERE name = ? AND "ownerName" = ? LIMIT 1`, d.name, d.ownerName
    )
    if (existing && existing.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE "Dog" SET "dogStatus"=?, "isBolsista"=?, "isActive"=?, "serviceType"=?, "scheduledDays"=?, "feedingGramsPerMeal"=?, "feedingTimesPerDay"=?, "updatedAt"=datetime('now') WHERE id=?`,
        d.dogStatus, 1, 1, d.serviceType, d.scheduledDays, d.feedingGramsPerMeal, d.feedingTimesPerDay, existing[0].id
      )
      console.log(`Atualizado: ${d.name}`)
    } else {
      const id = newId()
      const now = new Date().toISOString()
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Dog" (id, name, breed, "ownerName", "ownerPhone", "dogStatus", "isBolsista", "isActive", "serviceType", "scheduledDays", "feedingGramsPerMeal", "feedingTimesPerDay", "createdAt", "updatedAt") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        id, d.name, d.breed, d.ownerName, d.ownerPhone, d.dogStatus, 1, 1, d.serviceType, d.scheduledDays, d.feedingGramsPerMeal, d.feedingTimesPerDay, now, now
      )
      console.log(`Criado: ${d.name} (id: ${id})`)
    }
  }

  // 3. Clear seeds for next 60 days so bolsistas are seeded on all days
  const dates = []
  for (let i = 0; i <= 60; i++) {
    const d = new Date('2026-05-12T12:00:00Z')
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  const clr = await prisma.dailyRosterSeed.deleteMany({ where: { date: { in: dates } } })
  console.log(`Seeds limpos para re-semente (${clr.count} datas) - bolsistas serão incluídos automaticamente.`)

  await prisma.$disconnect()
}

main().catch(console.error)
