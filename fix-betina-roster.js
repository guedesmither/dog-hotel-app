const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const dog = await p.dog.findFirst({ where: { name: { contains: 'Betina' } } })
  console.log('Betina id:', dog.id, '| scheduledDays:', dog.scheduledDays)

  const today = '2026-05-12'

  // Delete future AUTO entries
  const del = await p.dailyRoster.deleteMany({ where: { dogId: dog.id, source: 'AUTO', date: { gt: today } } })
  console.log('Entradas AUTO futuras removidas:', del.count)

  // Clear DailyRosterSeed for next 90 days so they get re-seeded with new schedule (Quarta)
  const dates = []
  for (let i = 1; i <= 90; i++) {
    const d = new Date('2026-05-12T12:00:00Z')
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }
  const clr = await p.dailyRosterSeed.deleteMany({ where: { date: { in: dates } } })
  console.log('Seeds limpos para re-semente:', clr.count)
  console.log('Próxima vez que acessar a agenda, as quartas-feiras serão semeadas automaticamente com a Betina.')

  await p.$disconnect()
}
main().catch(console.error)
