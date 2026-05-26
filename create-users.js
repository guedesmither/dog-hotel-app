const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUsers() {
  const users = [
    {
      email: 'admaue',
      name: 'Administrador Aue',
      password: 'Samboaue2026',
      role: 'ADMIN',
    },
    {
      email: 'sarahv',
      name: 'Sarah (Monitor)',
      password: 'aue2026',
      role: 'MONITOR',
    },
    {
      email: 'geraue',
      name: 'Gerente Aue',
      password: 'sambo26',
      role: 'MANAGER',
    },
  ];

  for (const userData of users) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existing) {
      console.log(`Usuario ${userData.email} ja existe. Atualizando...`);
      await prisma.user.update({
        where: { email: userData.email },
        data: {
          name: userData.name,
          password: await bcrypt.hash(userData.password, 10),
          role: userData.role,
        },
      });
    } else {
      console.log(`Criando usuario ${userData.email}...`);
      await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          password: await bcrypt.hash(userData.password, 10),
          role: userData.role,
        },
      });
    }
  }

  console.log('\n✅ Usuarios criados/atualizados com sucesso!');
  console.log('\n📋 Resumo:');
  console.log('  - Admin: admaue / Samboaue2026');
  console.log('  - Monitor: sarahv / aue2026');
  console.log('  - Gerencia: geraue / sambo26');
}

createUsers()
  .catch((e) => {
    console.error('Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
