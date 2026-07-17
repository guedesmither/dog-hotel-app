const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const dog = await prisma.dog.findUnique({
    where: { id: 'cmox5zg66000dgnqstz9zdj1t' },
    select: { ownerCpf: true }
  })
  console.log('Annie ownerCpf:', dog?.ownerCpf)

  const packages = await prisma.package.findMany({
    where: {
      isActive: true,
      expiryDate: { gte: new Date() },
      OR: [
        { dogId: 'cmox5zg66000dgnqstz9zdj1t' },
        ...(dog.ownerCpf ? [{ dog: { ownerCpf: dog.ownerCpf } }] : [])
      ]
    },
    orderBy: { createdAt: 'desc' }
  })
  console.log('Packages found:', packages.length)
  console.log(JSON.stringify(packages, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
