const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const INAUG = new Date('2026-02-07T12:00:00Z')

function calcPeriod(d) {
  return d < INAUG ? 'PRE_INAUGURACAO' : d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0')
}

async function main() {
  const entries = await p.financialEntry.findMany({ select: { id: true, date: true, period: true } })
  let fixed = 0
  for (const e of entries) {
    const np = calcPeriod(e.date)
    if (np !== e.period) {
      console.log(e.date.toISOString().split('T')[0], e.period, '->', np)
      await p.financialEntry.update({ where: { id: e.id }, data: { period: np } })
      fixed++
    }
  }
  console.log('Fixed:', fixed, 'of', entries.length)
}

main().finally(() => p.$disconnect())
