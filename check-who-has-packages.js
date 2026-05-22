const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const today = new Date().toISOString().split('T')[0]

  // Dogs with null presence in past
  const nullEntries = await prisma.dailyRoster.findMany({
    where: { date: { lt: today }, present: null },
    select: { dogId: true, date: true, type: true, dog: { select: { name: true } } },
  })

  const dogIds = [...new Set(nullEntries.map(e => e.dogId))]

  // Check which have active packages
  const packages = await prisma.package.findMany({
    where: { dogId: { in: dogIds }, isActive: true, remainingDays: { gt: 0 } },
    include: { dog: { select: { name: true } } },
  })

  console.log('=== Cães com entradas passadas sem presença + pacotes ativos ===')
  if (packages.length === 0) {
    console.log('Nenhum desses cães tem pacotes ativos.')
  } else {
    packages.forEach(p => console.log(`  ${p.dog.name} | ${p.remainingDays}/${p.totalDays} dias restantes | expira ${new Date(p.expiryDate).toLocaleDateString('pt-BR')}`))
  }

  console.log('\n=== Todos os 11 sem presença ===')
  nullEntries.forEach(e => console.log(`  ${e.date} | ${e.dog.name}`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
