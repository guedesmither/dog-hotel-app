const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Fetch all PENDING replacements
  const replacements = await p.replacement.findMany({
    where: { status: 'PENDING' },
    include: {
      dog: {
        select: {
          id: true,
          name: true,
          monthlyStartDay: true,
          sales: {
            where: {
              paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
              saleType: 'MENSAL',
            },
            orderBy: { saleDate: 'desc' },
            take: 1,
          },
        },
      },
    },
  })

  console.log(`Found ${replacements.length} pending replacements to check`)

  let updated = 0
  for (const r of replacements) {
    const dog = r.dog
    const activeSale = dog.sales?.[0]
    let newBillingMonthEnd = null

    if (activeSale?.endDate) {
      newBillingMonthEnd = new Date(activeSale.endDate).toISOString().split('T')[0]
    } else {
      // Fallback: use monthlyStartDay
      const absentDate = r.absentDate
      const date = new Date(absentDate + 'T12:00:00')
      const startDay = dog.monthlyStartDay || 1
      const day = date.getDate()
      let endDate
      if (startDay === 1) {
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      } else if (day >= startDay) {
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, startDay - 1)
      } else {
        endDate = new Date(date.getFullYear(), date.getMonth(), startDay - 1)
      }
      newBillingMonthEnd = endDate.toISOString().split('T')[0]
    }

    const currentEnd = r.billingMonthEnd
    if (currentEnd !== newBillingMonthEnd) {
      console.log(`  ${dog.name} | ausência: ${r.absentDate} | atual: ${currentEnd} → novo: ${newBillingMonthEnd}`)
      await p.replacement.update({
        where: { id: r.id },
        data: { billingMonthEnd: newBillingMonthEnd },
      })
      updated++
    } else {
      console.log(`  ${dog.name} | ausência: ${r.absentDate} | prazo OK: ${currentEnd}`)
    }
  }

  console.log(`\nAtualizado: ${updated} de ${replacements.length} reposições`)
  await p.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
