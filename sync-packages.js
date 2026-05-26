const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncPackages() {
  console.log('Sincronizando pacotes com vendas PACOTE...\n');
  
  // Buscar todas as vendas de PACOTE
  const packageSales = await prisma.sales.findMany({
    where: { saleType: 'PACOTE' },
    include: { 
      dog: true,
      items: { include: { product: true } }
    }
  });
  
  console.log(`Encontradas ${packageSales.length} vendas de PACOTE`);
  
  let created = 0;
  let existing = 0;
  
  for (const sale of packageSales) {
    // Verificar se já existe Package para este cão
    const existingPackage = await prisma.package.findFirst({
      where: { dogId: sale.dogId, isActive: true }
    });
    
    if (existingPackage) {
      console.log(`  ✓ ${sale.dog.name}: já tem pacote (${existingPackage.remainingDays}/${existingPackage.totalDays} dias)`);
      existing++;
      continue;
    }
    
    // Determinar tipo de pacote baseado no preço
    const is5Days = sale.finalPrice <= 550;
    const totalDays = is5Days ? 5 : 10;
    const packageType = is5Days ? 'AVULSO_5' : 'AVULSO_10';
    
    // Criar Package
    const expiryDate = new Date(sale.saleDate);
    expiryDate.setMonth(expiryDate.getMonth() + 6);
    
    await prisma.package.create({
      data: {
        dogId: sale.dogId,
        packageType: packageType,
        totalDays: totalDays,
        remainingDays: totalDays, // Começa com todos os dias
        purchaseDate: sale.saleDate,
        expiryDate: expiryDate,
        pricePaid: sale.finalPrice,
        isActive: true,
      }
    });
    
    console.log(`  + ${sale.dog.name}: criado pacote de ${totalDays} dias (R$ ${sale.finalPrice})`);
    created++;
  }
  
  console.log(`\n✅ Sincronização completa:`);
  console.log(`   Criados: ${created}`);
  console.log(`   Já existiam: ${existing}`);
  
  await prisma.$disconnect();
}

syncPackages().catch(console.error);
