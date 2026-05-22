const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const today = new Date().toISOString().split('T')[0]

  // Preview first
  const toMark = await prisma.dailyRoster.findMany({
    where: {
      date: { lt: today },
      present: null,
    },
    include: { dog: { select: { name: true } } },
    orderBy: { date: 'asc' },
  })

  console.log(`=== Preview: ${toMark.length} entradas PACOTE passadas sem presença ===`)
  toMark.forEach(e => console.log(`  ${e.date} | ${e.dog.name}`))

  if (toMark.length === 0) {
    console.log('Nada a fazer.')
    return
  }

  // Execute update
  const result = await prisma.dailyRoster.updateMany({
    where: {
      date: { lt: today },
      present: null,
    },
    data: { present: true },
  })

  console.log(`\n✅ ${result.count} entradas marcadas como presentes.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
