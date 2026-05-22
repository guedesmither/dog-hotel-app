const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Restaurando dias do pacote do Jack Sparrow ===')
    
    // Find Jack Sparrow
    const jack = await prisma.dog.findFirst({
      where: { name: { contains: 'Jack' } },
      include: {
        packages: true,
      },
    })

    if (!jack) {
      console.log('Cão Jack Sparrow não encontrado')
      return
    }

    console.log('Cão:', jack.name)
    console.log('Pacotes:', jack.packages.length)
    
    jack.packages.forEach(pkg => {
      console.log(`\nPacote ID: ${pkg.id}`)
      console.log(`  Dias restantes: ${pkg.remainingDays}`)
      console.log(`  Dias originais: ${pkg.totalDays}`)
      console.log(`  Ativo: ${pkg.isActive}`)
      console.log(`  Expira em: ${pkg.expiryDate}`)
    })
    
    // Set to 2 days as requested
    for (const pkg of jack.packages) {
      const updated = await prisma.package.update({
        where: { id: pkg.id },
        data: { remainingDays: 2 },
      })
      console.log(`\n✓ Pacote ${pkg.id} ajustado para ${updated.remainingDays} dias`)
    }
    
    console.log('\nPacote do Jack Sparrow ajustado para 2 dias!')
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
