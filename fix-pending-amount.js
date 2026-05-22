const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
p.sales.updateMany({
  where: { paymentStatus: 'PENDENTE', amountReceived: { not: null } },
  data: { amountReceived: null }
}).then(r => console.log(`Corrigidas: ${r.count} vendas`)).finally(() => p.$disconnect())
