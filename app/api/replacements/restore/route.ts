import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/replacements/restore
// Body: { dogName: string } - restores all DONE/EXPIRED replacements for this dog to PENDING
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Somente ADMIN' }, { status: 403 })
  }

  const { dogName } = await req.json()
  if (!dogName) {
    return NextResponse.json({ error: 'Nome do cão obrigatório' }, { status: 400 })
  }

  // Find dog by name
  const dog = await prisma.dog.findFirst({
    where: { name: { contains: dogName } },
    select: { id: true, name: true }
  })

  if (!dog) {
    return NextResponse.json({ error: `Cão "${dogName}" não encontrado` }, { status: 404 })
  }

  // Find all DONE or EXPIRED replacements for this dog
  const replacements = await prisma.replacement.findMany({
    where: {
      dogId: dog.id,
      status: { in: ['DONE', 'EXPIRED'] }
    }
  })

  if (replacements.length === 0) {
    return NextResponse.json({ 
      message: `Nenhuma reposição DONE/EXPIRED encontrada para ${dog.name}`,
      dog: dog.name,
      restored: 0 
    })
  }

  // Restore all to PENDING and clear scheduledDate
  const updated = await prisma.replacement.updateMany({
    where: {
      dogId: dog.id,
      status: { in: ['DONE', 'EXPIRED'] }
    },
    data: {
      status: 'PENDING',
      scheduledDate: null
    }
  })

  return NextResponse.json({
    message: `${updated.count} reposição(ões) de ${dog.name} restaurada(s) para PENDENTE`,
    dog: dog.name,
    restored: updated.count,
    ids: replacements.map(r => r.id)
  })
}
