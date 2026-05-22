const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const today = new Date().toISOString().split('T')[0]

  const nullEntries = await prisma.dailyRoster.findMany({
    where: { date: { lt: today }, present: null },
    include: { dog: { select: { name: true } } },
    orderBy: [{ type: 'asc' }, { date: 'asc' }],
  })

  console.log(`=== ${nullEntries.length} entradas passadas sem presença registrada ===`)
  const byType = {}
  nullEntries.forEach(e => {
    byType[e.type] = (byType[e.type] || 0) + 1
    console.log(`  ${e.date} | ${e.type} | ${e.dog.name} | packageId:${e.packageId || '-'}`)
  })
  console.log('\nPor tipo:', byType)
}

main().catch(console.error).finally(() => prisma.$disconnect())
