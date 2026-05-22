// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const dogs = await prisma.dog.findMany({ select: { id: true, name: true, notes: true, matricula: true } })
  let updated = 0

  for (const dog of dogs) {
    if (dog.matricula) continue
    const match = (dog.notes || '').match(/Matr[íi]cula:\s*([A-Z]\d+)/)
    if (match) {
      await prisma.dog.update({ where: { id: dog.id }, data: { matricula: match[1] } })
      console.log(`✅ ${dog.name} → ${match[1]}`)
      updated++
    }
  }
  console.log(`\n${updated} matrículas migradas.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
