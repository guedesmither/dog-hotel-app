import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/reports/cleanup-photos
// Removes ReportPhoto records older than 7 days to save bandwidth/storage
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role?: string }).role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Calculate date 7 days ago (YYYY-MM-DD string format matches DailyReport.date)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  // Find photos linked to reports older than 7 days
  const oldReports = await prisma.dailyReport.findMany({
    where: { date: { lt: cutoffStr } },
    select: { id: true },
  })

  const reportIds = oldReports.map(r => r.id)

  if (reportIds.length === 0) {
    return NextResponse.json({ deleted: 0, message: 'No old photos to clean' })
  }

  const result = await prisma.reportPhoto.deleteMany({
    where: { reportId: { in: reportIds } },
  })

  return NextResponse.json({
    deleted: result.count,
    cutoffDate: cutoffStr,
    reportsScanned: reportIds.length,
  })
}
