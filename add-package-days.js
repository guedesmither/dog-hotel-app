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

  if (!jackSparrow && !annieBonny) {
    console.log('Cães não encontrados')
    return
  }

  if (jackSparrow) {
    console.log(`=== Jack Sparrow ===`)
    console.log(`ID: ${jackSparrow.id}`)
    console.log(`Pacotes: ${jackSparrow.packages.length}`)
    
    if (jackSparrow.packages.length > 0) {
      for (const pkg of jackSparrow.packages) {
        console.log(`  Pacote ID: ${pkg.id}`)
        console.log(`  Dias totais: ${pkg.totalDays}`)
        console.log(`  Dias restantes antes: ${pkg.remainingDays}`)
        
        await prisma.package.update({
          where: { id: pkg.id },
          data: { remainingDays: pkg.remainingDays + 2 },
        })
        
        console.log(`  Dias restantes depois: ${pkg.remainingDays + 2}`)
      }
    } else {
      console.log('  Sem pacotes')
    }
  }

  if (annieBonny) {
    console.log(`\n=== Annie Bonny ===`)
    console.log(`ID: ${annieBonny.id}`)
    console.log(`Pacotes: ${annieBonny.packages.length}`)
    
    if (annieBonny.packages.length > 0) {
      for (const pkg of annieBonny.packages) {
        console.log(`  Pacote ID: ${pkg.id}`)
        console.log(`  Dias totais: ${pkg.totalDays}`)
        console.log(`  Dias restantes antes: ${pkg.remainingDays}`)
        
        await prisma.package.update({
          where: { id: pkg.id },
          data: { remainingDays: pkg.remainingDays + 2 },
        })
        
        console.log(`  Dias restantes depois: ${pkg.remainingDays + 2}`)
      }
    } else {
      console.log('  Sem pacotes')
    }
  }

  console.log('\n✓ Adicionadas 2 diárias aos pacotes do Jack Sparrow e Annie Bonny')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
