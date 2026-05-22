const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const sale = await p.sales.findFirst({
    where: { id: 'cmox8r6480085on3asp7s3afc' },
    include: { items: { include: { product: true } } }
  })
  console.log('Venda:', JSON.stringify(sale, null, 2))

  // Extract total days from product name e.g. "Pacote 10 Dias"
  const productName = sale.items?.[0]?.product?.name || ''
  const match = productName.match(/(\d+)\s*Dia/i)
  const totalDays = match ? parseInt(match[1]) : 10
  console.log(`\nProduto: "${productName}" → totalDays: ${totalDays}`)

  // Create the Package record
  const expiryDate = sale.endDate || new Date(new Date().setMonth(new Date().getMonth() + 6))
  const pkg = await p.package.create({
    data: {
      dogId: sale.dogId,
      packageType: 'AVULSO_' + totalDays,
      totalDays,
      remainingDays: totalDays,
      purchaseDate: sale.saleDate,
      expiryDate: new Date(expiryDate),
      pricePaid: sale.finalPrice,
      isActive: true,
    }
  })
  console.log('\nPacote criado:', JSON.stringify(pkg, null, 2))
}
main().catch(console.error).finally(() => p.$disconnect())
