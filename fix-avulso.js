const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const dogs = await prisma.dog.findMany({
    where: { matricula: { startsWith: 'D' } },
    select: { id: true, name: true, matricula: true, dogStatus: true, serviceType: true },
  })

  console.log('Cães com matrícula D encontrados:')
  dogs.forEach(d => console.log(`  ${d.matricula} | ${d.name} | status atual: ${d.dogStatus} | tipo: ${d.serviceType}`))

  const result = await prisma.dog.updateMany({
    where: { matricula: { startsWith: 'D' } },
    data: { dogStatus: 'AVULSO' },
  })

  console.log(`\n✅ ${result.count} cães reclassificados para AVULSO`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
