const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function exportData() {
  const prisma = new PrismaClient();
  try {
    console.log('Exportando dados do SQLite...');

    const users = await prisma.user.findMany();
    const dogs = await prisma.dog.findMany();
    const sales = await prisma.sales.findMany({ include: { items: true } });
    const products = await prisma.product.findMany();
    const dailyRosters = await prisma.dailyRoster.findMany();
    const stays = await prisma.stay.findMany();
    const replacements = await prisma.replacement.findMany();
    const packages = await prisma.package.findMany();

    const data = { users, dogs, products, sales, dailyRosters, stays, replacements, packages };
    fs.writeFileSync('data-export.json', JSON.stringify(data, null, 2));

    console.log('✅ Dados exportados para data-export.json');
    console.log(`   Usuários: ${users.length}`);
    console.log(`   Cães: ${dogs.length}`);
    console.log(`   Vendas: ${sales.length}`);
    console.log(`   Agenda: ${dailyRosters.length}`);
    console.log(`   Estadias: ${stays.length}`);
    console.log(`   Reposições: ${replacements.length}`);
    console.log(`   Produtos: ${products.length}`);
    console.log(`   Pacotes: ${packages.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
