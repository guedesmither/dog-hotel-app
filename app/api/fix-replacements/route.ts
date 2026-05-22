import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/fix-replacements — remove replacements created from REPOSICAO entries
export async function GET() {
  // Find all REPOSICAO roster entries
  const reposicaoEntries = await prisma.dailyRoster.findMany({
    where: { type: 'REPOSICAO' }
  })

  const deleted: any[] = []

  for (const entry of reposicaoEntries) {
    // Delete any replacement created for this dog on this date
    const result = await prisma.replacement.deleteMany({
      where: {
        dogId: entry.dogId,
        absentDate: entry.date,
        status: 'PENDING'
      }
    })
    if (result.count > 0) {
      deleted.push({ dogId: entry.dogId, date: entry.date, deleted: result.count })
    }
  }

  return NextResponse.json({
    success: true,
    message: `Removidas ${deleted.length} reposições indevidas`,
    details: deleted
  })
}
