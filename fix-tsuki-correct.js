const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  // Delete the wrong package I just created
  const deleted = await p.package.delete({ where: { id: 'cmpe8t6oe0001l1dglxvzlvme' } })
  console.log('Deletado:', deleted.id)

  // Count how many roster entries used this dog's package
  const dog = await p.dog.findFirst({ where: { name: { contains: 'Tsuki' } }, select: { id: true } })
  const usedDays = await p.dailyRoster.count({ where: { dogId: dog.id, type: 'AVULSO' } })
  console.log('Dias usados na agenda (AVULSO):', usedDays)
  
  // Also check roster entries for any type with packageId
  const allRoster = await p.dailyRoster.findMany({ 
    where: { dogId: dog.id },
    select: { date: true, type: true, packageId: true }
  })
  console.log('Todas as entradas na agenda:', JSON.stringify(allRoster, null, 2))
  
  // Recreate with correct remaining days (10 - usedDays)
  const remaining = Math.max(0, 10 - usedDays)
  console.log(`\nRecriando com ${remaining} dias restantes (10 - ${usedDays} usados)`)
  const pkg = await p.package.create({
    data: {
      dogId: dog.id,
      packageType: 'AVULSO_10',
      totalDays: 10,
      remainingDays: remaining,
      purchaseDate: new Date('2026-05-08'),
      expiryDate: new Date('2026-11-08'),
      pricePaid: 1000,
      isActive: true,
    }
  })
  console.log('Pacote recriado:', JSON.stringify(pkg, null, 2))
}
main().catch(console.error).finally(() => p.$disconnect())
