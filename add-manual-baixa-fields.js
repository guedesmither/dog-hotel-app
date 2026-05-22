const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Verificando se campos manualBaixa existem...')
    
    // Try to update a sale with manualBaixa to see if the field exists
    const testSale = await prisma.sales.findFirst()
    if (!testSale) {
      console.log('Nenhuma venda encontrada para teste')
      return
    }
    
    console.log('Venda de teste encontrada:', testSale.id)
    console.log('Campos disponíveis:', Object.keys(testSale))
    
    // Check if manualBaixa field exists
    if ('manualBaixa' in testSale) {
      console.log('✓ Campo manualBaixa já existe')
    } else {
      console.log('✗ Campo manualBaixa não existe - schema precisa ser atualizado')
      console.log('Por favor, execute: npx prisma db push')
    }
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
