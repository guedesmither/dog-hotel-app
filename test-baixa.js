const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Testando conexão com banco de dados...')
    
    // Find first sale
    const sale = await prisma.sales.findFirst()
    if (!sale) {
      console.log('Nenhuma venda encontrada')
      return
    }
    
    console.log('Venda encontrada:', sale.id)
    console.log('Campos da venda:', Object.keys(sale))
    console.log('manualBaixa:', sale.manualBaixa)
    console.log('manualBaixaDate:', sale.manualBaixaDate)
    
    // Try to update
    console.log('Tentando atualizar venda...')
    const updated = await prisma.sales.update({
      where: { id: sale.id },
      data: {
        manualBaixa: true,
        manualBaixaDate: new Date(),
      },
    })
    
    console.log('Venda atualizada com sucesso!')
    console.log('manualBaixa após update:', updated.manualBaixa)
    
    // Revert
    await prisma.sales.update({
      where: { id: sale.id },
      data: {
        manualBaixa: false,
        manualBaixaDate: null,
      },
    })
    
    console.log('Venda revertida com sucesso')
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
