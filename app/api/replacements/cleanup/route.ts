import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/replacements/cleanup
// Remove invalid replacements for PACOTE dogs (they shouldn't have replacements)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Somente ADMIN' }, { status: 403 })
  }

  // Find all PACOTE dogs
  const pacoteDogs = await prisma.dog.findMany({
    where: { serviceType: 'PACOTE' },
    select: { id: true, name: true }
  })

  const dogIds = pacoteDogs.map(d => d.id)
  const dogNames = pacoteDogs.map(d => d.name)

  if (dogIds.length === 0) {
    return NextResponse.json({ message: 'Nenhum cão de PACOTE encontrado', deleted: 0 })
  }

  // Delete all replacements for PACOTE dogs
  const result = await prisma.replacement.deleteMany({
    where: { dogId: { in: dogIds } }
  })

  return NextResponse.json({
    message: `${result.count} reposição(ões) de cães PACOTE removida(s)`,
    dogs: dogNames,
    deleted: result.count
  })
}
