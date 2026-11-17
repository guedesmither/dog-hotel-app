import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureContractTable } from '@/lib/contracts-db'
import { contractMetadataSelect, isContractManager } from '@/lib/contracts-api'

type RouteContext = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role || ''
  if (!isContractManager(role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  await ensureContractTable()

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    select: contractMetadataSelect,
  })
  if (!contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
  return NextResponse.json(contract)
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role || ''
  if (!isContractManager(role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  await ensureContractTable()

  const body = await req.json().catch(() => null)
  const status = body?.status
  if (!['GERADO', 'ENVIADO', 'ASSINADO'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const existing = await prisma.contract.findUnique({
    where: { id: params.id },
    select: { id: true, sentAt: true },
  })
  if (!existing) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

  const now = new Date()
  const data = status === 'GERADO'
    ? { status, sentAt: null, signedAt: null }
    : status === 'ENVIADO'
      ? { status, sentAt: existing.sentAt || now }
      : { status, sentAt: existing.sentAt || now, signedAt: now }
  const contract = await prisma.contract.update({
    where: { id: params.id },
    data,
    select: contractMetadataSelect,
  })

  return NextResponse.json(contract)
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role || ''
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Apenas ADMIN pode excluir contratos' }, { status: 403 })

  await ensureContractTable()

  const existing = await prisma.contract.findUnique({
    where: { id: params.id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

  await prisma.contract.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
