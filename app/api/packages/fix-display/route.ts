import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/packages/fix-display
// Fix negative remainingDays and recalc based on actual roster history
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
    before: { remaining: number; total: number; display: string }
    after: { remaining: number; used: number; display: string }
    rosterDays: string[]
  }> = []

  // Get all packages (including inactive to fix history)
  const packages = await prisma.package.findMany({
    include: {
      dog: { select: { id: true, name: true } }
    }
  })

  for (const pkg of packages) {
    // Conta apenas entradas vinculadas especificamente a este pacote (evita misturar com outros pacotes do mesmo cão)
    const rosterEntries = await prisma.dailyRoster.findMany({
      where: { packageId: pkg.id },
      select: { date: true },
      orderBy: { date: 'asc' }
    })

    const daysUsed = rosterEntries.length
    const correctRemaining = Math.max(0, pkg.totalDays - daysUsed)
    const correctIsActive = correctRemaining > 0
    
    const beforeDisplay = `${pkg.totalDays - pkg.remainingDays}/${pkg.totalDays}`
    const afterDisplay = `${daysUsed}/${pkg.totalDays}`

    // Update if wrong
    if (pkg.remainingDays !== correctRemaining || pkg.remainingDays < 0 || pkg.isActive !== correctIsActive) {
      await prisma.package.update({
        where: { id: pkg.id },
        data: { remainingDays: correctRemaining, isActive: correctIsActive }
      })
    }

    results.push({
      dogName: pkg.dog.name,
      packageId: pkg.id,
      before: { remaining: pkg.remainingDays, total: pkg.totalDays, display: beforeDisplay },
      after: { remaining: correctRemaining, used: daysUsed, display: afterDisplay },
      rosterDays: rosterEntries.map(r => r.date)
    })
  }

  // Return only the ones that had issues (negative or wrong remaining)
  const problematic = results.filter(r => r.before.remaining !== r.after.remaining || r.before.remaining < 0)

  return NextResponse.json({
    message: `${packages.length} pacotes verificados, ${problematic.length} corrigidos`,
    fixed: problematic.length,
    all: results.sort((a, b) => a.dogName.localeCompare(b.dogName)),
    problematic: problematic
  })
}
