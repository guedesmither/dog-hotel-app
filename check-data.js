const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const packages = await prisma.package.count();
  const replacements = await prisma.replacement.count();
  const sales = await prisma.sales.count();
  
  console.log('DADOS NO BANCO LOCAL:');
  console.log('  Pacotes:', packages);
  console.log('  Reposições:', replacements);
  console.log('  Vendas:', sales);
  
  // Verificar vendas do Jack e Bonnie
  const jackBonnieSales = await prisma.sales.findMany({
    where: {
      saleType: 'PACOTE'
    },
    include: { dog: true }
  });
  
  console.log('\nVENDAS DE PACOTES:');
  jackBonnieSales.forEach(s => {
    console.log(`  - ${s.dog?.name || 'Unknown'}: ${s.saleType}`);
  });
  
  await prisma.$disconnect();
}

check();
