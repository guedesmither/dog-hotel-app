const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Find all SCHEDULED replacements that don't have a DailyRoster entry
  const scheduled = await p.replacement.findMany({
    where: { status: 'SCHEDULED', scheduledDate: { not: null } },
    include: { dog: { select: { id: true, name: true } } }
  })

  console.log(`Found ${scheduled.length} scheduled replacements`)

  for (const r of scheduled) {
    if (!r.scheduledDate || !r.dogId) continue

    const existing = await p.dailyRoster.findFirst({
      where: { dogId: r.dogId, date: r.scheduledDate }
    })

    if (!existing) {
      await p.dailyRoster.create({
        data: { dogId: r.dogId, date: r.scheduledDate, source: 'MANUAL', type: 'CRECHE' }
      })
      console.log(`  ✅ Criado roster para ${r.dog.name} em ${r.scheduledDate}`)
    } else {
      console.log(`  ⚠️  ${r.dog.name} em ${r.scheduledDate} já existe (source: ${existing.source})`)
    }
  }

  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
