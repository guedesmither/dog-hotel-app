const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Buscar cães com o telefone da Gabriela
  const dogs = await prisma.dog.findMany({ 
    where: { ownerPhone: '11986119285' },
    select: { id: true, name: true, ownerName: true, breed: true, createdAt: true }
  })
  
  console.log(`Cães com telefone 11986119285: ${dogs.length}`)
  dogs.forEach(d => {
    console.log(`  ${d.id.substring(0,8)} | "${d.name}" | ${d.ownerName} | ${d.breed} | ${d.createdAt.toISOString().split('T')[0]}`)
  })
  
  // Buscar cães com tutor pendente
  const pending = await prisma.dog.findMany({
    where: { ownerName: 'Tutor pendente' },
    select: { id: true, name: true, breed: true, createdAt: true }
  })
  
  console.log(`\nCães com Tutor pendente: ${pending.length}`)
  pending.forEach(d => {
    console.log(`  ${d.id.substring(0,8)} | "${d.name}" | ${d.breed} | ${d.createdAt.toISOString().split('T')[0]}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
