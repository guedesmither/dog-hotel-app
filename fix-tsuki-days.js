const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
// Set remainingDays to 8 (10 total - 2 already used: 08/05 PACOTE + 13/05 AVULSO)
p.package.update({
  where: { id: 'cmpe8wmfw0001i316xut8t2ko' },
  data: { remainingDays: 8 }
}).then(r => console.log('Atualizado:', r.remainingDays, 'dias restantes'))
  .finally(() => p.$disconnect())
