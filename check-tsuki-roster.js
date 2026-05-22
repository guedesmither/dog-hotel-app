const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const dog = await p.dog.findFirst({ where: { name: { contains: 'Tsuki' } }, select: { id: true, name: true } })
  
  // All roster entries for Tsuki with PACOTE type
  const roster = await p.dailyRoster.findMany({
    where: { dogId: dog.id },
    orderBy: { date: 'desc' },
    select: { date: true, type: true, packageId: true, source: true }
  })
  console.log('Roster da Tsuki:', JSON.stringify(roster, null, 2))
  
  // Current packages
  const pkgs = await p.package.findMany({ where: { dogId: dog.id } })
  console.log('\nPacotes atuais:', JSON.stringify(pkgs, null, 2))
}
main().catch(console.error).finally(() => p.$disconnect())
