const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearAll() {
  console.log('Iniciando limpeza do banco de dados...')

  // 1. Clear tutorDogId from users (FK reference to Dog)
  const u1 = await prisma.user.updateMany({ data: { tutorDogId: null } })
  console.log(`Users com tutorDogId zerado: ${u1.count}`)

  // 2. Delete all child records in dependency order
  const r1 = await prisma.dailyRosterSeed.deleteMany()
  console.log(`DailyRosterSeed deletados: ${r1.count}`)

  const r2 = await prisma.dailyRoster.deleteMany()
  console.log(`DailyRoster deletados: ${r2.count}`)

  const r3 = await prisma.stayPhoto.deleteMany()
  console.log(`StayPhotos deletadas: ${r3.count}`)

  const r4 = await prisma.stay.deleteMany()
  console.log(`Stays deletados: ${r4.count}`)

  const r5 = await prisma.saleItem.deleteMany()
  console.log(`SaleItems deletados: ${r5.count}`)

  const r6 = await prisma.sales.deleteMany()
  console.log(`Vendas deletadas: ${r6.count}`)

  const r7 = await prisma.package.deleteMany()
  console.log(`Pacotes deletados: ${r7.count}`)

  const r8 = await prisma.replacement.deleteMany()
  console.log(`Replacements deletados: ${r8.count}`)

  const r9 = await prisma.dogPriceHistory.deleteMany()
  console.log(`DogPriceHistory deletados: ${r9.count}`)

  const r10 = await prisma.dailyReport.deleteMany()
  console.log(`DailyReports deletados: ${r10.count}`)

  const r11 = await prisma.activity.deleteMany()
  console.log(`Activities deletadas: ${r11.count}`)

  const r12 = await prisma.pendingDogChange.deleteMany()
  console.log(`PendingDogChanges deletados: ${r12.count}`)

  const r13 = await prisma.reportPhoto.deleteMany()
  console.log(`ReportPhotos deletadas: ${r13.count}`)

  // 3. Finally delete dogs
  const r14 = await prisma.dog.deleteMany()
  console.log(`Cães deletados: ${r14.count}`)

  console.log('\n✅ Banco de dados limpo com sucesso!')
  console.log('Usuários, produtos e tabelas de preço foram mantidos.')
}

clearAll()
  .catch(e => { console.error('❌ Erro:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
