import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'PENDING'

  const changes = await prisma.pendingDogChange.findMany({
    where: { status },
    include: {
      dog: { select: { id: true, name: true, breed: true, photoUrl: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(changes)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const sessionUser = session.user as { id: string; role: string }
  if (sessionUser.role !== 'ADMIN' && sessionUser.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { id, action, reviewNote } = await req.json()
  if (!id || !action) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const pending = await prisma.pendingDogChange.findUnique({ where: { id } })
  if (!pending) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  if (pending.status !== 'PENDING') {
    return NextResponse.json({ error: 'Alteração já foi processada' }, { status: 400 })
  }

  if (action === 'APPROVE') {
    const changes = JSON.parse(pending.changes)
    await prisma.dog.update({
      where: { id: pending.dogId },
      data: {
        name: changes.name,
        breed: changes.breed,
        birthDate: changes.birthDate || null,
        color: changes.color || null,
        weight: changes.weight ? parseFloat(changes.weight) : null,
        ownerName: changes.ownerName,
        ownerPhone: changes.ownerPhone,
        ownerEmail: changes.ownerEmail || null,
        ownerCpf: changes.ownerCpf || null,
        sex: changes.sex || null,
        castrated: changes.castrated !== undefined && changes.castrated !== ''
          ? changes.castrated === true || changes.castrated === 'true' || changes.castrated === 'sim'
          : null,
        size: changes.size || null,
        temperament: changes.temperament || null,
      },
    })
  }

  const updated = await prisma.pendingDogChange.update({
    where: { id },
    data: {
      status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      reviewedBy: sessionUser.id,
      reviewNote: reviewNote || null,
    },
    include: {
      dog: { select: { id: true, name: true } },
      user: { select: { name: true } },
    },
  })

  return NextResponse.json(updated)
}
