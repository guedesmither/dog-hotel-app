const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Find Jack Sparrow and Annie Bonny
  const jackSparrow = await prisma.dog.findFirst({
    where: { name: 'Jack Sparrow' },
    include: { packages: true },
  })

  const annieBonny = await prisma.dog.findFirst({
    where: { name: 'Annie Bonny' },
    include: { packages: true },
  })

  if (!jackSparrow || !annieBonny) {
    console.log('Cães não encontrados')
    return
  }

  // Correct expiry date to 28/09/2026
  const expiryDate = new Date('2026-09-28T23:59:59.000Z')

  console.log(`=== Corrigindo pacotes ===`)
  console.log(`Data de expiração: 28/09/2026`)
  console.log(`Dias usados: 3`)
  console.log(`Dias restantes: 2`)

  // Update Jack Sparrow's package
  if (jackSparrow.packages.length > 0) {
    const jackPackage = jackSparrow.packages[0]
    await prisma.package.update({
      where: { id: jackPackage.id },
      data: {
        totalDays: 5,
        remainingDays: 2,
        expiryDate,
      },
    })
    console.log(`✓ Pacote do Jack Sparrow atualizado: ${jackPackage.id}`)
  }

  // Update Annie Bonny's package
  if (annieBonny.packages.length > 0) {
    const anniePackage = annieBonny.packages[0]
    await prisma.package.update({
      where: { id: anniePackage.id },
      data: {
        totalDays: 5,
        remainingDays: 2,
        expiryDate,
      },
    })
    console.log(`✓ Pacote da Annie Bonny atualizado: ${anniePackage.id}`)
  }

  console.log('\n✓ Pacotes corrigidos com sucesso')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
