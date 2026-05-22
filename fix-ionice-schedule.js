// Check Maya data
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const today = new Date().toISOString().split('T')[0]

  // Find AU-Ê dogs
  const aueDogs = await prisma.dog.findMany({
    where: { ownerName: { contains: 'AU' } },
    select: { id: true, name: true, ownerName: true, scheduledDays: true }
  })
  console.log('Cães AU-Ê encontrados:')
  aueDogs.forEach(d => console.log(`  ${d.name} | ${d.ownerName} | scheduledDays: "${d.scheduledDays}"`))

  // Update to Mon-Sat
  const newDays = 'Segunda, Terça, Quarta, Quinta, Sexta, Sábado'
  for (const d of aueDogs) {
    await prisma.dog.update({
      where: { id: d.id },
      data: { scheduledDays: newDays }
    })
    // Remove future AUTO entries so they get re-seeded with Saturday included
    const del = await prisma.dailyRoster.deleteMany({
      where: { dogId: d.id, source: 'AUTO', date: { gt: today } }
    })
    console.log(`  ${d.name}: scheduledDays atualizado, ${del.count} entradas futuras removidas`)
  }

  // Clear seeds for next 60 days
  const dates = []
  for (let i = 1; i <= 60; i++) {
    const dt = new Date(today + 'T12:00:00Z')
    dt.setDate(dt.getDate() + i)
    dates.push(dt.toISOString().split('T')[0])
  }
  const clr = await prisma.dailyRosterSeed.deleteMany({ where: { date: { in: dates } } })
  console.log(`\nSeeds limpos: ${clr.count} datas - sábados serão incluídos na próxima abertura da agenda.`)

  await prisma.$disconnect()
}

main().catch(console.error)
