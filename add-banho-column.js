const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "DailyRoster" ADD COLUMN "hasBanho" BOOLEAN NOT NULL DEFAULT false`
    )
    console.log('✅ Coluna hasBanho adicionada com sucesso.')
  } catch (e) {
    if (e.message && e.message.includes('duplicate column')) {
      console.log('ℹ️ Coluna hasBanho já existe.')
    } else {
      throw e
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
