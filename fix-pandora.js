const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const dogId = 'cmoovhr2i0000k9cjr6m78dvo'

  console.log('=== Roster da Pandora esta semana ===')
  const roster = await prisma.dailyRoster.findMany({
    where: { dogId, date: { gte: '2026-05-04', lte: '2026-05-10' } },
    orderBy: { date: 'asc' },
  })
  console.log(roster.length > 0 ? roster.map(r => `${r.date} | ${r.type} | present=${r.present} | source=${r.source}`).join('\n') : 'Nenhum')

  console.log('\n=== Seed desta semana ===')
  const seeds = await prisma.dailyRosterSeed.findMany({
    where: { date: { gte: '2026-05-04', lte: '2026-05-10' } },
    orderBy: { date: 'asc' },
  })
  console.log(seeds.map(s => s.date).join('\n') || 'Nenhum')

  // Check if Thursday May 7 is missing
  const thursdayEntry = roster.find(r => r.date === '2026-05-07')
  if (!thursdayEntry) {
    console.log('\n⚠️  Pandora NÃO está na quinta-feira (2026-05-07)!')
    console.log('Adicionando...')
    await prisma.dailyRoster.create({
      data: {
        dogId,
        date: '2026-05-07',
        source: 'MANUAL',
        type: 'CRECHE',
        present: null,
        isPernoite: false,
      },
    })
    console.log('✅ Pandora adicionada na quinta-feira!')
  } else {
    console.log('\n✅ Pandora já está na quinta-feira (2026-05-07)')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
