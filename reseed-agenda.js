const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function reseed() {
  const hoje = new Date().toISOString().split('T')[0]
  console.log('Re-seeding a partir de:', hoje)
  
  // Deletar seeds dos próximos 7 dias para forçar re-seed
  for (let i = 0; i < 7; i++) {
    const date = new Date()
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    await prisma.dailyRosterSeed.deleteMany({
      where: { date: dateStr }
    })
    console.log(`Seed removido para: ${dateStr}`)
  }
  
  console.log('\nAgora acesse a agenda no navegador para recarregar os dados')
  await prisma.$disconnect()
}

reseed()
