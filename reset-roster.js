const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const today = new Date().toISOString().split('T')[0]

  const seedCount = await prisma.dailyRosterSeed.count()
  const rosterCount = await prisma.dailyRoster.count()
  console.log(`Antes: ${seedCount} seeds | ${rosterCount} roster entries`)

  // Remove all roster entries (past + future) and seed marks so all dates
  // are re-processed with the new sale-based eligibility check
  const delRoster = await prisma.dailyRoster.deleteMany({})
  const delSeeds = await prisma.dailyRosterSeed.deleteMany({})

  console.log(`Removidos: ${delRoster.count} roster entries | ${delSeeds.count} seeds`)
  console.log('Agenda limpa. Na próxima abertura, cada data será re-seeded só para cães com vendas ativas.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
