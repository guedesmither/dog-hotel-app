const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  const users = await prisma.user.findMany({ select: { name: true, email: true, role: true } })
  users.forEach(u => console.log(u.role, '|', u.name, '|', u.email))
}
main().catch(console.error).finally(() => prisma.$disconnect())
