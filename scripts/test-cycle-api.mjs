// Direct DB test - bypasses HTTP/auth to verify cycle-stats logic
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

const dog = await p.dog.findFirst({
  where: { name: { contains: 'Leonardo' } },
  select: { id: true, name: true, enrollmentDate: true, monthlyStartDay: true }
})

const today = new Date(); today.setHours(12,0,0,0)
const msd = dog.monthlyStartDay
let start, end
if (msd) {
  let cs = today.getDate() >= msd
    ? new Date(today.getFullYear(), today.getMonth(), msd)
    : new Date(today.getFullYear(), today.getMonth()-1, msd)
  const ce = new Date(cs); ce.setMonth(ce.getMonth()+1); ce.setDate(ce.getDate()-1)
  start = cs.toISOString().split('T')[0]
  end = ce.toISOString().split('T')[0]
}

console.log(`\n=== Ciclo: ${start} → ${end} ===`)

const entries = await p.dailyRoster.findMany({
  where: { dogId: dog.id, date: { gte: start, lte: end } },
  orderBy: { date: 'asc' },
  select: { date: true, present: true }
})

const todayStr = today.toISOString().split('T')[0]
console.log('presentDays :', entries.filter(e => e.present === true).length)
console.log('absentDays  :', entries.filter(e => e.present === false).length)
console.log('upcomingDays:', entries.filter(e => e.present === null && e.date > todayStr).length)
console.log('totalExpected:', entries.filter(e => e.date <= todayStr).length)
console.log('totalRosterDays:', entries.length)
console.log('\nAll entries:')
entries.forEach(e => console.log(` ${e.date}  present=${e.present}`))

await p.$disconnect()
