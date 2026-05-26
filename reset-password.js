const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const p = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('Samboaue2026', 10)
  
  // Reset senha do admin
  const updated = await p.user.updateMany({
    where: { email: 'guedesmither@gmail.com' },
    data: { password: hash }
  })
  console.log('Atualizado guedesmither@gmail.com:', updated.count, 'registro(s)')

  // Também garantir que tem role ADMIN
  await p.user.updateMany({
    where: { email: 'guedesmither@gmail.com' },
    data: { role: 'ADMIN' }
  })
  console.log('Role definido como ADMIN')

  // Verificar todos os usuários
  const users = await p.user.findMany({ select: { email: true, name: true, role: true } })
  console.log('\n=== USUARIOS APOS RESET ===')
  users.forEach(u => console.log(`${u.email} | ${u.name} | ${u.role}`))
}

main().finally(() => p.$disconnect())
