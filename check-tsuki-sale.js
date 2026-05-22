const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const result = await p.sales.updateMany({
    where: { notes: { startsWith: 'Status:' } },
    data: { notes: null }
  })
  console.log('Notas de status antigas limpas:', result.count)
  await p.$disconnect()
}
main().catch(console.error)
