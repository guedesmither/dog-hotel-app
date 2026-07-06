import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const grouped = await p.dailyRoster.groupBy({
  by: ['date'],
  _count: { dogId: true },
  orderBy: { date: 'desc' },
  take: 50,
})

console.log('Últimas 50 datas com entradas:')
for (const g of grouped) {
  console.log(`  ${g.date}: ${g._count.dogId} entradas`)
}

await p.$disconnect()
