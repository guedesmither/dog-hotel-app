import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE /api/roster/cleanup
// Remove all roster entries for non-CRECHE dogs (HOTEL, etc.)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'TUTOR' || role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  // Find all dogs that are NOT CRECHE
  const nonCrecheDogs = await prisma.dog.findMany({
    where: {
      isActive: true,
      OR: [
        { serviceType: { not: 'CRECHE' } },
        { serviceType: null },
      ],
    },
    select: { id: true, name: true, serviceType: true },
  })

  const nonCrecheIds = nonCrecheDogs.map(d => d.id)

  if (nonCrecheIds.length === 0) {
    return NextResponse.json({ deleted: 0, message: 'Nenhum cão não-creche encontrado' })
  }

  // Delete all roster entries for these dogs
  const result = await prisma.dailyRoster.deleteMany({
    where: {
      dogId: { in: nonCrecheIds },
    },
  })

  return NextResponse.json({
    deleted: result.count,
    dogs: nonCrecheDogs.map(d => ({ id: d.id, name: d.name, serviceType: d.serviceType })),
  })
}

// GET - preview what would be deleted
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const nonCrecheDogs = await prisma.dog.findMany({
    where: {
      isActive: true,
      OR: [
        { serviceType: { not: 'CRECHE' } },
        { serviceType: null },
      ],
    },
    select: { id: true, name: true, serviceType: true },
  })

  const nonCrecheIds = nonCrecheDogs.map(d => d.id)

  const entries = await prisma.dailyRoster.findMany({
    where: { dogId: { in: nonCrecheIds } },
    select: { id: true, date: true, dogId: true, dog: { select: { name: true, serviceType: true } } },
    orderBy: { date: 'asc' },
  })

  return NextResponse.json({
    count: entries.length,
    dogs: nonCrecheDogs,
    entries: entries.slice(0, 50), // limit preview
  })
}
