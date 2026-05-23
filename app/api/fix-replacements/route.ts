import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/fix-replacements — fix billingMonthEnd and remove invalid replacements
export async function GET() {
  const results: any = { deletedFromReposicao: [], fixedBillingMonthEnd: [] }

  // 1. Delete replacements created from REPOSICAO roster entries
  const reposicaoEntries = await prisma.dailyRoster.findMany({
    where: { type: 'REPOSICAO' }
  })
  for (const entry of reposicaoEntries) {
    const result = await prisma.replacement.deleteMany({
      where: { dogId: entry.dogId, absentDate: entry.date, status: 'PENDING' }
    })
    if (result.count > 0) {
      results.deletedFromReposicao.push({ dogId: entry.dogId, date: entry.date })
    }
  }

  // 2. Fix billingMonthEnd — find the sale that covers the absent date
  const allReplacements = await prisma.replacement.findMany({
    where: { status: { in: ['PENDING', 'SCHEDULED'] } },
    include: {
      dog: {
        include: {
          sales: { where: { saleType: 'MENSAL' }, orderBy: { startDate: 'asc' } }
        }
      }
    }
  })

  for (const rep of allReplacements) {
    const absentDate = new Date(rep.absentDate + 'T12:00:00')
    const sales = (rep.dog as any).sales || []

    // Find covering sale
    const coveringSale = sales.find((s: any) => {
      if (!s.startDate || !s.endDate) return false
      return absentDate >= new Date(s.startDate) && absentDate <= new Date(s.endDate)
    })
    // Fallback: most recent sale before absent date
    const fallbackSale = sales
      .filter((s: any) => s.startDate && new Date(s.startDate) <= absentDate)
      .sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]

    const activeSale = coveringSale || fallbackSale
    if (!activeSale?.endDate) continue

    const correctEnd = new Date(activeSale.endDate).toISOString().split('T')[0]
    if (correctEnd !== rep.billingMonthEnd) {
      await prisma.replacement.update({
        where: { id: rep.id },
        data: { billingMonthEnd: correctEnd }
      })
      results.fixedBillingMonthEnd.push({
        dog: rep.dog.name,
        absentDate: rep.absentDate,
        old: rep.billingMonthEnd,
        new: correctEnd
      })
    }
  }

  return NextResponse.json({ success: true, results })
}
