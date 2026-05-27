const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const dogs = await prisma.dog.findMany({ 
    select: { id: true, name: true, matricula: true },
    orderBy: { name: 'asc' }
  })
  console.log('Total de cães:', dogs.length)
  dogs.forEach(d => {
    console.log(`${d.matricula || 'sem matricula'} - ${d.name} (${d.id})`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
