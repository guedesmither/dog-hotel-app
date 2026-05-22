// fix-bucky-fridays
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const dog = await prisma.dog.findFirst({ where: { name: { contains: 'Bucky' } } })
  console.log('Bucky id:', dog.id, '| scheduledDays:', dog.scheduledDays)

  const fridays = ['2026-05-15','2026-05-22','2026-05-29','2026-06-05','2026-06-12','2026-06-19']

  // Clear seeds so they get re-seeded with Bucky included
  const clr = await prisma.dailyRosterSeed.deleteMany({ where: { date: { in: fridays } } })
  console.log('Seeds das sextas limpos:', clr.count)

  // Add Bucky to this Friday 15/05 manually (since 15/05 is covered by April sale ending 20/05)
  const e = await prisma.dailyRoster.upsert({
    where: { dogId_date: { dogId: dog.id, date: '2026-05-15' } },
    update: { source: 'MANUAL', type: 'CRECHE' },
    create: { dogId: dog.id, date: '2026-05-15', source: 'MANUAL', type: 'CRECHE' }
  })
  console.log('Bucky adicionado manualmente em 15/05:', e.date)
  console.log('As demais sextas serão semeadas automaticamente ao abrir a agenda.')

  await prisma.$disconnect()
}
main().catch(console.error)
