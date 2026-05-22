const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Find replacements with status SCHEDULED that have a scheduledDate
  const replacements = await prisma.replacement.findMany({
    where: { status: 'SCHEDULED', scheduledDate: { not: null } },
    include: { dog: { select: { name: true } } },
  })

  console.log(`=== ${replacements.length} reposições agendadas ===`)
  for (const r of replacements) {
    console.log(`  ${r.dog.name} | falta: ${r.absentDate} → reposição: ${r.scheduledDate}`)
  }

  if (replacements.length === 0) return

  // Fix their DailyRoster entries to type REPOSICAO
  for (const r of replacements) {
    const updated = await prisma.dailyRoster.updateMany({
      where: { dogId: r.dogId, date: r.scheduledDate, type: 'CRECHE' },
      data: { type: 'REPOSICAO' },
    })
    if (updated.count > 0) {
      console.log(`  ✅ ${r.dog.name} em ${r.scheduledDate} → REPOSICAO`)
    } else {
      console.log(`  ⚠️  ${r.dog.name} em ${r.scheduledDate} — entrada não encontrada ou já correta`)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
