import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const seeds = await p.dailyRosterSeed.findMany({
  orderBy: { date: 'desc' },
  take: 50,
})

console.log('Últimas 50 datas semeadas:')
for (const s of seeds) {
  console.log(`  ${s.date}`)
}

await p.$disconnect()
