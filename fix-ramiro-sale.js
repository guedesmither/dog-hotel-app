const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const updated = await p.sales.update({
    where: { id: 'cmox8r6430081on3alr05vpmm' },
    data: { paymentStatus: 'PAGO', manualBaixa: true, manualBaixaDate: new Date() }
  })
  console.log('Updated paymentStatus:', updated.paymentStatus)
  await p.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
