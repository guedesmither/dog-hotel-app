const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Clear seed for Thursday 2026-05-08
  await prisma.dailyRosterSeed.delete({
    where: { date: '2026-05-08' },
  })

  // Also clear any roster entries for Sol on that date
  const sol = await prisma.dog.findFirst({
    where: { name: 'Sol' },
  })

  if (sol) {
    await prisma.dailyRoster.deleteMany({
      where: {
        dogId: sol.id,
        date: '2026-05-08',
      },
    })
    console.log('Limpei entradas da Sol para 2026-05-08')
  }

  console.log('Seed limpo para 2026-05-08. A próxima requisição vai re-seed com validação.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
