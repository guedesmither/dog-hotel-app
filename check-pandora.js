const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const inativos = await prisma.dog.findMany({
    where: { OR: [{ isActive: false }, { dogStatus: 'INATIVO' }] },
    select: { id: true, name: true, ownerName: true, dogStatus: true, isActive: true, scheduledDays: true, serviceType: true },
    orderBy: { name: 'asc' }
  })
  console.log(`Total inativos: ${inativos.length}`)
  inativos.forEach(d => console.log(`  ${d.name} | ${d.ownerName} | ${d.dogStatus} | ${d.scheduledDays || '-'} | ${d.serviceType || '-'}`))
}

main().catch(console.error).finally(() => prisma.$disconnect())
