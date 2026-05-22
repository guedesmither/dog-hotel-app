const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const dog = await p.dog.findFirst({
    where: { name: { contains: 'Betina' } },
    select: { id: true, name: true, scheduledDays: true, monthlyStartDay: true, dogStatus: true, serviceType: true,
      sales: { where: { paymentStatus: { in: ['PAGO','PENDENTE','AGENDADO','PROGRAMADA'] }, manualBaixa: false },
        orderBy: { saleDate: 'desc' }, take: 3,
        select: { id: true, saleType: true, startDate: true, endDate: true, paymentStatus: true } }
    }
  })
  console.log('Dog:', JSON.stringify(dog, null, 2))

  const roster12 = await p.dailyRoster.findMany({ where: { date: '2026-05-12' }, include: { dog: { select: { name: true } } } })
  const roster13 = await p.dailyRoster.findMany({ where: { date: '2026-05-13' }, include: { dog: { select: { name: true } } } })
  console.log('\nRoster 12/05:', roster12.map(e => ({ dog: e.dog.name, type: e.type, source: e.source, present: e.present })))
  console.log('Roster 13/05:', roster13.map(e => ({ dog: e.dog.name, type: e.type, source: e.source, present: e.present })))

  await p.$disconnect()
}
main().catch(console.error)
