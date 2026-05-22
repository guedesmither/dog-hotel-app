const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const dogs = await p.dog.findMany({
    where: { name: { contains: 'Betina' } },
    select: { name: true, monthlyStartDay: true, scheduledDays: true }
  })
  console.log(dogs)

  // Simulate getBillingMonthEnd for startDay=6, absentDate=2026-05-12
  function getBillingMonthEnd(monthlyStartDay, absentDate) {
    const date = new Date(absentDate + 'T12:00:00')
    const startDay = monthlyStartDay || 1
    const day = date.getDate()
    let endDate
    if (startDay === 1) {
      endDate = day >= 1
        ? new Date(date.getFullYear(), date.getMonth() + 1, 0)
        : new Date(date.getFullYear(), date.getMonth(), 0)
    } else {
      endDate = day >= startDay
        ? new Date(date.getFullYear(), date.getMonth() + 1, startDay - 1)
        : new Date(date.getFullYear(), date.getMonth(), startDay - 1)
    }
    return endDate.toISOString().split('T')[0]
  }

  console.log('startDay=6, absent=2026-05-12:', getBillingMonthEnd(6, '2026-05-12'))
  console.log('startDay=6, absent=2026-05-05:', getBillingMonthEnd(6, '2026-05-05'))
  console.log('startDay=1, absent=2026-05-12:', getBillingMonthEnd(1, '2026-05-12'))

  await p.$disconnect()
}
main()
