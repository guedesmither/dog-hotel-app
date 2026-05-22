const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Find Jack Sparrow and Annie Bonny
  const jackSparrow = await prisma.dog.findFirst({
    where: { name: 'Jack Sparrow' },
  })

  const annieBonny = await prisma.dog.findFirst({
    where: { name: 'Annie Bonny' },
  })

  if (!jackSparrow) {
    console.log('Jack Sparrow não encontrado')
    return
  }

  if (!annieBonny) {
    console.log('Annie Bonny não encontrada')
    return
  }

  console.log(`=== Criando pacotes ===`)
  console.log(`Jack Sparrow ID: ${jackSparrow.id}`)
  console.log(`Annie Bonny ID: ${annieBonny.id}`)

  // Calculate expiry date (6 months from now)
  const expiryDate = new Date()
  expiryDate.setMonth(expiryDate.getMonth() + 6)

  // Create package for Jack Sparrow
  const jackPackage = await prisma.package.create({
    data: {
      dogId: jackSparrow.id,
      packageType: '5 DIAS',
      totalDays: 5,
      remainingDays: 5,
      purchaseDate: new Date(),
      expiryDate,
      pricePaid: 500,
      isActive: true,
    },
  })
  console.log(`✓ Pacote criado para Jack Sparrow: ${jackPackage.id} (5 dias)`)

  // Create package for Annie Bonny
  const anniePackage = await prisma.package.create({
    data: {
      dogId: annieBonny.id,
      packageType: '5 DIAS',
      totalDays: 5,
      remainingDays: 5,
      purchaseDate: new Date(),
      expiryDate,
      pricePaid: 500,
      isActive: true,
    },
  })
  console.log(`✓ Pacote criado para Annie Bonny: ${anniePackage.id} (5 dias)`)

  console.log('\n✓ Pacotes criados com sucesso')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
