const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Fix all DailyRoster entries that correspond to a scheduled replacement
  const replacements = await prisma.replacement.findMany({
    where: { scheduledDate: { not: null } },
    select: { dogId: true, scheduledDate: true, dog: { select: { name: true } } },
  })

  console.log(`Corrigindo ${replacements.length} entradas...`)
  for (const r of replacements) {
    const updated = await prisma.dailyRoster.updateMany({
      where: { dogId: r.dogId, date: r.scheduledDate, type: 'CRECHE' },
      data: { type: 'REPOSICAO' },
    })
    console.log(`  ${r.dog.name} em ${r.scheduledDate} → ${updated.count > 0 ? '✅ REPOSICAO' : '⚠️  já correto ou não encontrado'}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
