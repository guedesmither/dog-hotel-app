const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Adicionando campos manualBaixa e manualBaixaDate ao banco de dados...')
    
    // Execute raw SQL to add the columns (without IF NOT EXISTS for SQLite compatibility)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Sales" 
        ADD COLUMN "manualBaixa" BOOLEAN NOT NULL DEFAULT false
      `)
      console.log('✓ Campo manualBaixa adicionado')
    } catch (error) {
      if (error.code === 'P2010') {
        console.log('Campo manualBaixa já existe')
      } else {
        throw error
      }
    }
    
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Sales" 
        ADD COLUMN "manualBaixaDate" TIMESTAMP
      `)
      console.log('✓ Campo manualBaixaDate adicionado')
    } catch (error) {
      if (error.code === 'P2010') {
        console.log('Campo manualBaixaDate já existe')
      } else {
        throw error
      }
    }
    
    console.log('✓ Campos adicionados com sucesso!')
  } catch (error) {
    console.error('Erro ao adicionar campos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
