const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Limpando DailyRosterSeed para forçar re-seed ===')
    
    // Delete all DailyRosterSeed entries
    const deleted = await prisma.dailyRosterSeed.deleteMany({})
    console.log(`✓ ${deleted.count} entradas de seed removidas`)
    
    console.log('\nA agenda será re-semeada automaticamente na próxima consulta')
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
