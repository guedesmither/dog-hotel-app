import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/fix-packages — one-time fix for corrupted package remainingDays
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  // Find all packages where remainingDays > totalDays (corrupted by over-incrementing)
  const allPackages = await prisma.package.findMany({
    include: { dog: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const fixes: any[] = []
  for (const pkg of allPackages) {
    // Count actual roster entries using this package
    const usageCount = await prisma.dailyRoster.count({
      where: { packageId: pkg.id },
    })

    const correctRemaining = Math.max(0, pkg.totalDays - usageCount)

    if (pkg.remainingDays !== correctRemaining) {
      const updated = await prisma.package.update({
        where: { id: pkg.id },
        data: {
          remainingDays: correctRemaining,
          isActive: correctRemaining > 0 ? true : pkg.isActive,
        },
        select: { id: true, remainingDays: true, totalDays: true, isActive: true },
      })
      fixes.push({
        id: pkg.id,
        dogName: pkg.dog.name,
        packageType: pkg.packageType,
        totalDays: pkg.totalDays,
        oldRemaining: pkg.remainingDays,
        newRemaining: updated.remainingDays,
        rosterUsage: usageCount,
        isActive: updated.isActive,
      })
    }
  }

  return NextResponse.json({
    totalPackages: allPackages.length,
    fixedCount: fixes.length,
    fixes,
  })
}
