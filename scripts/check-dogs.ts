import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const dogs = await prisma.dog.findMany({
    where: {
      OR: [
        { name: { contains: 'Jack' } },
        { name: { contains: 'Pudim' } },
        { name: { contains: 'Pudin' } },
      ]
    },
    select: { id: true, name: true, ownerName: true, ownerCpf: true }
  })
  console.log(JSON.stringify(dogs, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
