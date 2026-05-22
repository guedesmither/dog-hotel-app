const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const dog = await prisma.dog.findFirst({
    where: { name: { contains: 'charlotte' } },
    select: { id: true, name: true, scheduledDays: true, dogStatus: true, isActive: true, enrollmentDate: true }
  });
  console.log('Charlotte:', JSON.stringify(dog, null, 2));

  const seeds = await prisma.dailyRosterSeed.findMany({
    where: { date: { gte: '2026-05-04' } },
    select: { date: true },
    orderBy: { date: 'asc' }
  });
  console.log('\nDatas já semeadas:', seeds.map(s => s.date));

  await prisma.$disconnect();
}

check();
