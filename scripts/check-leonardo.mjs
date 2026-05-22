import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const dog = await p.dog.findFirst({
  where: { name: { contains: 'Leonardo' } },
  select: { id: true, name: true, enrollmentDate: true, monthlyStartDay: true }
})
console.log('Dog:', JSON.stringify(dog, null, 2))

// Simulate cycle range
const today = new Date(); today.setHours(12,0,0,0)
const todayStr = today.toISOString().split('T')[0]
const msd = dog.monthlyStartDay
let start, end, label
if (msd) {
  let cs
  if (today.getDate() >= msd) {
    cs = new Date(today.getFullYear(), today.getMonth(), msd)
  } else {
    cs = new Date(today.getFullYear(), today.getMonth()-1, msd)
  }
  const ce = new Date(cs); ce.setMonth(ce.getMonth()+1); ce.setDate(ce.getDate()-1)
  start = cs.toISOString().split('T')[0]
  end = ce.toISOString().split('T')[0]
  label = 'Ciclo de cobrança'
} else if (dog.enrollmentDate) {
  start = dog.enrollmentDate; end = todayStr; label = 'Desde a matrícula'
} else {
  const s = new Date(today); s.setDate(s.getDate()-30)
  start = s.toISOString().split('T')[0]; end = todayStr; label = 'Últimos 30 dias'
}
console.log(`Cycle (${label}): ${start} → ${end}`)

const roster = await p.dailyRoster.findMany({
  where: { dogId: dog?.id, date: { gte: start, lte: end } },
  orderBy: { date: 'asc' },
  select: { date: true, present: true }
})
console.log('Roster in cycle:', JSON.stringify(roster, null, 2))
console.log('presentDays:', roster.filter(e => e.present === true).length)
console.log('absentDays:', roster.filter(e => e.present === false).length)
console.log('totalRosterDays:', roster.length)
await p.$disconnect()
