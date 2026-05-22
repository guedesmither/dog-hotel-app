const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Check roster for 2026-05-18
  const entries = await p.dailyRoster.findMany({
    where: { date: '2026-05-18' },
    include: { dog: { select: { name: true } } }
  })
  console.log('Roster 18/05:', entries.map(e => ({ dog: e.dog.name, type: e.type, source: e.source })))

  // Check replacements for Romain and Theo
  const replacements = await p.replacement.findMany({
    where: { dog: { name: { in: ['Romain', 'Theo'] } } },
    include: { dog: { select: { name: true } } }
  })
  console.log('\nReplacements:', replacements.map(r => ({
    dog: r.dog.name,
    absentDate: r.absentDate,
    scheduledDate: r.scheduledDate,
    status: r.status,
    billingMonthEnd: r.billingMonthEnd
  })))

  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
