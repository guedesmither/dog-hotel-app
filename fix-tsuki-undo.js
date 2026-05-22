const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const dog = await p.dog.findFirst({ where: { name: { contains: 'Tsuki' } }, select: { id: true, name: true } })
  console.log('Dog:', dog)
  
  const pkgs = await p.package.findMany({ where: { dogId: dog.id }, orderBy: { createdAt: 'desc' } })
  console.log('Todos os pacotes:', JSON.stringify(pkgs, null, 2))
}
main().catch(console.error).finally(() => p.$disconnect())
