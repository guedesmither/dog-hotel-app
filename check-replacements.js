const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const all = await prisma.replacement.findMany({
    include: { dog: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  console.log(`=== ${all.length} reposições no banco ===`)
  all.forEach(r => console.log(`  ${r.dog.name} | status:${r.status} | falta:${r.absentDate} | agendada:${r.scheduledDate || '-'}`))

  // Also check roster entries for Romain and Theo on May 18
  const entries = await prisma.dailyRoster.findMany({
    where: { date: '2026-05-18' },
    include: { dog: { select: { name: true } } },
    orderBy: { dog: { name: 'asc' } },
  })
  console.log(`\n=== Agenda de 2026-05-18 ===`)
  entries.forEach(e => console.log(`  ${e.dog.name} | type:${e.type} | source:${e.source}`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
