import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const sessionUser = session.user as { id: string; role: string; tutorDogId?: string }
  if (sessionUser.role !== 'TUTOR') {
    return NextResponse.json({ error: 'Apenas tutores podem submeter alterações para aprovação' }, { status: 403 })
  }
  if (sessionUser.tutorDogId !== params.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const changes = await req.json()

  const pending = await prisma.pendingDogChange.create({
    data: {
      dogId: params.id,
      userId: sessionUser.id,
      changes: JSON.stringify(changes),
      status: 'PENDING',
    },
    include: { dog: { select: { name: true } }, user: { select: { name: true } } },
  })

  return NextResponse.json(pending, { status: 201 })
}
