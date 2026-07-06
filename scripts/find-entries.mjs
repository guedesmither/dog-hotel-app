import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const dates = ['2026-07-05', '2026-07-06', '2026-07-07', '2026-07-12', '2026-07-13', '2026-07-14']

for (const date of dates) {
  const entries = await p.dailyRoster.findMany({
    where: { date },
    include: { dog: true },
    orderBy: { dog: { name: 'asc' } },
  })
  console.log(`\n=== ${date} === Total: ${entries.length}`)
  for (const e of entries) {
    console.log(`  ${e.dog?.name || '?'} | ${e.type} | source=${e.source} | dogId=${e.dogId}`)
  }
}

await p.$disconnect()
