import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const sales = await p.sales.findMany({
  where: {
    saleDate: { gte: new Date('2026-06-01'), lte: new Date('2026-06-30') },
    paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
    dogId: { not: null }
  },
  select: {
    id: true,
    saleType: true,
    saleDate: true,
    startDate: true,
    endDate: true,
    finalPrice: true,
    paymentStatus: true,
    dog: { select: { name: true } }
  },
  orderBy: { saleType: 'asc' }
})

let totalPacote = 0, totalMensal = 0, totalHotel = 0, totalAvulso = 0
for (const s of sales) {
  const label = `[${s.saleType}] ${s.dog?.name} R$${s.finalPrice} | saleDate=${s.saleDate?.toISOString().split('T')[0]} start=${s.startDate?.toISOString().split('T')[0] ?? 'null'} end=${s.endDate?.toISOString().split('T')[0] ?? 'null'} status=${s.paymentStatus}`
  console.log(label)
  if (s.saleType === 'PACOTE') totalPacote += s.finalPrice
  else if (s.saleType === 'MENSAL') totalMensal += s.finalPrice
  else if (s.saleType === 'HOTEL') totalHotel += s.finalPrice
  else totalAvulso += s.finalPrice
}

console.log('\n=== TOTAIS POR TIPO (saleDate junho) ===')
console.log('MENSAL:', totalMensal.toFixed(2))
console.log('PACOTE:', totalPacote.toFixed(2))
console.log('HOTEL:', totalHotel.toFixed(2))
console.log('AVULSO:', totalAvulso.toFixed(2))
console.log('TOTAL:', (totalMensal + totalPacote + totalHotel + totalAvulso).toFixed(2))

await p.$disconnect()
