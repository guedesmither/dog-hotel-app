import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/packages/recalc
// Recalculate remainingDays for all packages based on actual roster entries
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Somente ADMIN' }, { status: 403 })
  }

  const results: Array<{
    dogName: string
    packageId: string
    oldRemaining: number
    newRemaining: number
    totalDays: number
    daysUsed: number
    corrected: boolean
  }> = []

  // Get all active packages
  const packages = await prisma.package.findMany({
    where: { isActive: true },
    include: {
      dog: { select: { id: true, name: true } },
      rosterEntries: { select: { date: true } }
    }
  })

  for (const pkg of packages) {
    const daysUsed = pkg.rosterEntries?.length || 0
    const newRemaining = pkg.totalDays - daysUsed
    
    // Only update if there's a discrepancy
    if (newRemaining !== pkg.remainingDays) {
      await prisma.package.update({
        where: { id: pkg.id },
        data: { remainingDays: newRemaining }
      })
    }

    results.push({
      dogName: pkg.dog.name,
      packageId: pkg.id,
      oldRemaining: pkg.remainingDays,
      newRemaining: newRemaining,
      totalDays: pkg.totalDays,
      daysUsed: daysUsed,
      corrected: newRemaining !== pkg.remainingDays
    })
  }

  return NextResponse.json({
    message: `${packages.length} pacotes verificados`,
    corrected: results.filter(r => r.corrected).length,
    packages: results.sort((a, b) => a.dogName.localeCompare(b.dogName))
  })
}
