const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  await prisma.dog.delete({ where: { id: 'cmpo6t2v' } })
  console.log('✅ Júpiter duplicado (ID: cmpo6t2v) removido!')
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
