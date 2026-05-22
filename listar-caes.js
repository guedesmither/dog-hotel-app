const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function listar() {
  const caes = await prisma.dog.findMany({
    where: {
      name: { contains: 'rocky' }
    },
    select: { id: true, name: true }
  })
  console.log('Cães com "rocky":', caes)

  const caes2 = await prisma.dog.findMany({
    where: {
      name: { contains: 'lara' }
    },
    select: { id: true, name: true }
  })
  console.log('Cães com "lara":', caes2)

  await prisma.$disconnect()
}

listar()
