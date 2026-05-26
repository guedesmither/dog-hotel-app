const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const p = new PrismaClient()

async function main() {
  const users = await p.user.findMany({ select: { name: true, email: true, password: true, role: true } })
  console.log('=== USUARIOS ===')
  for (const u of users) {
    const ok = await bcrypt.compare('Samboaue2026', u.password || '')
    console.log(`${u.email} | ${u.name} | role:${u.role} | senha_ok:${ok}`)
  }
}

main().finally(() => p.$disconnect())
