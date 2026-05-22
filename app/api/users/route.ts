import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, tutorDogId: true, tutorDog: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const data = await req.json()

  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 })
  }

  const hashed = await bcrypt.hash(data.password, 10)

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      role: data.role || 'MONITOR',
      tutorDogId: data.role === 'TUTOR' && data.tutorDogId ? data.tutorDogId : null,
    },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, tutorDogId: true, tutorDog: { select: { id: true, name: true } } },
  })

  return NextResponse.json(user, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const data = await req.json()

  const updateData: Record<string, unknown> = {
    name: data.name,
    email: data.email,
    role: data.role,
    active: data.active,
    tutorDogId: data.role === 'TUTOR' && data.tutorDogId ? data.tutorDogId : null,
  }

  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 10)
  }

  const user = await prisma.user.update({
    where: { id: data.id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, tutorDogId: true, tutorDog: { select: { id: true, name: true } } },
  })

  return NextResponse.json(user)
}
