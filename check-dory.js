const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const dog = await prisma.dog.findFirst({
    where: { name: 'Dory' },
    include: { sales: { orderBy: { saleDate: 'desc' }, take: 3 } }
  });
  console.log('Dory status:', dog?.dogStatus);
  console.log('Sales:', dog?.sales.map(s => ({ 
    id: s.id, 
    type: s.saleType, 
    date: s.saleDate, 
    start: s.startDate, 
    end: s.endDate, 
    status: s.paymentStatus 
  })));
  await prisma.$disconnect();
}
check();
