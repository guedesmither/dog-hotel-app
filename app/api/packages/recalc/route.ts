import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/packages/recalc
// Recalculate remainingDays for all packages based on ALL roster entries since purchase
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
    rosterDays: string[]
    corrected: boolean
  }> = []

  // Get all active packages
  const packages = await prisma.package.findMany({
    where: { isActive: true },
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
    const newRemaining = Math.max(0, pkg.totalDays - daysUsed)
    // Baixa automática: desativa o pacote quando atinge o número máximo de utilizações
    const newIsActive = newRemaining > 0

    // Only update if there's a discrepancy
    if (newRemaining !== pkg.remainingDays || newIsActive !== pkg.isActive) {
      await prisma.package.update({
        where: { id: pkg.id },
        data: { remainingDays: newRemaining, isActive: newIsActive }
      })
    }

    results.push({
      dogName: pkg.dog.name,
      packageId: pkg.id,
      oldRemaining: pkg.remainingDays,
      newRemaining: newRemaining,
      totalDays: pkg.totalDays,
      daysUsed: daysUsed,
      rosterDays: rosterEntries.map(r => r.date),
      corrected: newRemaining !== pkg.remainingDays
    })
  }

  return NextResponse.json({
    message: `${packages.length} pacotes verificados`,
    corrected: results.filter(r => r.corrected).length,
    packages: results.sort((a, b) => a.dogName.localeCompare(b.dogName))
  })
}
