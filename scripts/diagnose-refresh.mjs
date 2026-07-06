import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()
const date = '2026-07-13'
const previousDate = new Date(date + 'T12:00:00Z')
previousDate.setDate(previousDate.getDate() - 7)
const previousDateStr = previousDate.toISOString().split('T')[0]
const targetDateObj = new Date(date + 'T12:00:00Z')

const DAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DAY_NAME_MAP = {
  0: ['domingo', 'dom'],
  1: ['segunda', 'seg'],
  2: ['terça', 'ter', 'terca'],
  3: ['quarta', 'qua'],
  4: ['quinta', 'qui'],
  5: ['sexta', 'sex'],
  6: ['sábado', 'sab', 'sabado'],
}

function parseSaleDate(dateValue) {
  if (!dateValue) return null
  if (typeof dateValue === 'string') {
    if (dateValue.includes('/')) {
      const parts = dateValue.split('/')
      if (parts.length !== 3) return null
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const year = parseInt(parts[2], 10)
      return new Date(year, month, day)
    }
    return new Date(dateValue)
  }
  if (dateValue instanceof Date) return dateValue
  return null
}

function isCrecheSale(sale) {
  if (sale.saleType === 'MENSAL') return true
  return (sale.items || []).some((item) => {
    const category = item.product?.category
    const name = (item.product?.name || '').toLowerCase()
    return category === 'CRECHE' || ((name.includes('creche') || name.includes('mensal')) && !name.includes('pacote'))
  })
}

function calcMensalPeriod(sale) {
  const start = parseSaleDate(sale.startDate) || parseSaleDate(sale.saleDate)
  if (!start) return null
  start.setHours(0, 0, 0, 0)
  let end = parseSaleDate(sale.endDate)
  if (!end) end = new Date('2099-12-31')
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function isDayScheduled(scheduledDays, dayOfWeek) {
  if (!scheduledDays || scheduledDays.trim() === '') return true
  const scheduledLower = scheduledDays.toLowerCase()
  const aliases = DAY_NAME_MAP[dayOfWeek] || []
  return aliases.some((alias) => scheduledLower.includes(alias))
}

function getFrequencyFromProduct(sale) {
  for (const item of sale.items || []) {
    const name = item.product?.name || ''
    const m = name.match(/(\d+)\s*x/i)
    if (m) return parseInt(m[1], 10)
  }
  return 0
}

function countScheduledOccurrences(scheduledDays, start, end) {
  const scheduledLower = scheduledDays.toLowerCase()
  let count = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endNorm = new Date(end)
  endNorm.setHours(23, 59, 59, 999)
  while (cur <= endNorm) {
    const aliases = DAY_NAME_MAP[cur.getDay()] || []
    if (aliases.some((a) => scheduledLower.includes(a))) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

async function calcMensalAllowed(sale, dog, date) {
  const period = calcMensalPeriod(sale)
  if (!period) return { allowed: Infinity, used: 0 }
  const hasExplicitEnd = !!sale.endDate
  const targetDate = new Date(date + 'T12:00:00')
  const windowStart = period.start
  const windowEnd = hasExplicitEnd
    ? period.end
    : (() => {
        const d = new Date(targetDate)
        d.setDate(1)
        d.setMonth(d.getMonth() + 1)
        d.setDate(0)
        d.setHours(23, 59, 59, 999)
        return d
      })()

  let allowed
  if (dog.scheduledDays && dog.scheduledDays.trim() !== '') {
    allowed = countScheduledOccurrences(dog.scheduledDays, windowStart, windowEnd)
  } else {
    const freq = getFrequencyFromProduct(sale)
    if (freq > 0) {
      const weeks = Math.ceil((windowEnd.getTime() - windowStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
      allowed = freq * weeks
    } else {
      allowed = Infinity
    }
  }

  const used = await p.dailyRoster.count({
    where: {
      dogId: dog.id,
      type: 'CRECHE',
      date: { gte: windowStart.toISOString().split('T')[0], lte: windowEnd.toISOString().split('T')[0] },
    },
  })

  return { allowed, used, windowStart, windowEnd }
}

const previousEntries = await p.dailyRoster.findMany({
  where: { date: previousDateStr },
  include: { dog: true },
  orderBy: { dog: { name: 'asc' } },
})

console.log(`\n=== Diagnóstico: ${previousDateStr} -> ${date} ===\n`)
console.log(`Total no dia anterior: ${previousEntries.length}\n`)

for (const entry of previousEntries) {
  const dog = entry.dog
  console.log(`--- ${dog?.name || '?'} (${entry.type}) ---`)
  if (!dog || !dog.isActive) {
    console.log('SKIP: cão inativo ou não encontrado')
    continue
  }

  const existing = await p.dailyRoster.findFirst({ where: { dogId: entry.dogId, date } })
  if (existing) {
    console.log('SKIP: já existe no dia alvo')
    continue
  }

  if (entry.type !== 'CRECHE') {
    console.log(`SKIP: tipo ${entry.type} não tratado neste diagnóstico`)
    continue
  }

  if (dog.serviceType !== 'CRECHE') {
    console.log(`SKIP: serviceType=${dog.serviceType}`)
    continue
  }

  if (!isDayScheduled(dog.scheduledDays, targetDateObj.getDay())) {
    console.log(`SKIP: não é dia programado. scheduledDays="${dog.scheduledDays || ''}" dia=${DAYS_PT[targetDateObj.getDay()]}`)
    continue
  }

  const activeSales = await p.sales.findMany({
    where: {
      dogId: entry.dogId,
      OR: [{ saleType: 'MENSAL' }, { items: { some: { product: { category: 'CRECHE' } } } }],
      paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
      manualBaixa: false,
    },
    include: { items: { include: { product: true } } },
  })

  console.log(`Vendas ativas encontradas: ${activeSales.length}`)

  if (activeSales.length === 0) {
    console.log('SKIP: nenhuma venda CRECHE/MENSAL ativa')
    continue
  }

  let added = false
  for (const sale of activeSales) {
    const saleId = sale.id.slice(-6)
    if (!isCrecheSale(sale)) {
      console.log(`  venda ${saleId}: não é venda creche`)
      continue
    }
    const period = calcMensalPeriod(sale)
    if (!period) {
      console.log(`  venda ${saleId}: sem período válido`)
      continue
    }
    if (targetDateObj < period.start || targetDateObj > period.end) {
      console.log(`  venda ${saleId}: fora do período ${period.start.toISOString().split('T')[0]} a ${period.end.toISOString().split('T')[0]}`)
      console.log(`    startDate=${sale.startDate} endDate=${sale.endDate} saleDate=${sale.saleDate}`)
      continue
    }
    const cap = await calcMensalAllowed(sale, dog, date)
    console.log(`  venda ${saleId}: dentro do período. used=${cap.used} allowed=${cap.allowed} janela=${cap.windowStart.toISOString().split('T')[0]} a ${cap.windowEnd.toISOString().split('T')[0]}`)
    if (cap.allowed !== Infinity && cap.used >= cap.allowed) {
      console.log(`  venda ${saleId}: limite atingido`)
      continue
    }
    console.log(`  -> ADD`)
    added = true
    break
  }

  if (!added) {
    console.log('SKIP: nenhuma venda creche válida para o dia')
  }
}

await p.$disconnect()
