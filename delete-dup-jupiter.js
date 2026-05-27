const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Buscar o duplicado
  const dup = await prisma.dog.findFirst({
    where: { 
      ownerName: 'Tutor pendente',
      breed: 'o_seca'
    }
  })
  
  if (dup) {
    console.log(`Removendo: "${dup.name}" (ID: ${dup.id})`)
    await prisma.dog.delete({ where: { id: dup.id } })
    console.log('✅ Removido com sucesso!')
  } else {
    console.log('Não encontrado')
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
