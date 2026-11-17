import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureContractTable } from '@/lib/contracts-db'
import { buildContractData, contractFileName, normalizeOwner, renderContractDocx } from '@/lib/contracts'
import { contractDocxMimeType, contractMetadataSelect, isContractManager } from '@/lib/contracts-api'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role || ''
  if (!isContractManager(role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  try {
    await ensureContractTable()

    const [dogs, contracts] = await Promise.all([
      prisma.dog.findMany({
        where: { isActive: true },
        orderBy: [{ ownerName: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, ownerName: true, ownerPhone: true },
      }),
      prisma.contract.findMany({
        orderBy: { createdAt: 'desc' },
        select: contractMetadataSelect,
      }),
    ])

    const latestByOwner = new Map<string, typeof contracts[number]>()
    for (const contract of contracts) {
      if (!latestByOwner.has(contract.ownerKey)) latestByOwner.set(contract.ownerKey, contract)
    }

    const tutorMap = new Map<string, {
      ownerKey: string
      ownerName: string
      ownerPhone: string
      dogs: Array<{ id: string; name: string }>
    }>()

    for (const dog of dogs) {
      const ownerKey = normalizeOwner(dog.ownerName)
      const tutor = tutorMap.get(ownerKey)
      if (tutor) {
        tutor.dogs.push({ id: dog.id, name: dog.name })
      } else {
        tutorMap.set(ownerKey, {
          ownerKey,
          ownerName: dog.ownerName.trim(),
          ownerPhone: dog.ownerPhone,
          dogs: [{ id: dog.id, name: dog.name }],
        })
      }
    }

    const tutors = Array.from(tutorMap.values()).map(tutor => ({
      ...tutor,
      latest: latestByOwner.get(tutor.ownerKey) || null,
      count: contracts.filter(contract => contract.ownerKey === tutor.ownerKey).length,
    }))

    return NextResponse.json({ tutors, contracts })
  } catch (err: any) {
    return NextResponse.json({
      error: 'Erro ao carregar contratos',
      details: err.message,
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const sessionUser = session.user as { role?: string; name?: string | null; email?: string | null }
  if (!isContractManager(sessionUser.role || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await ensureContractTable()

  const body = await req.json().catch(() => null)
  if (!body || typeof body.ownerKey !== 'string') {
    return NextResponse.json({ error: 'ownerKey inválido' }, { status: 400 })
  }

  const ownerKey = normalizeOwner(body.ownerKey)
  const dogsForOwner = (await prisma.dog.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })).filter(dog => normalizeOwner(dog.ownerName) === ownerKey)

  const dogIds = Array.isArray(body.dogIds)
    ? body.dogIds.filter((id: unknown): id is string => typeof id === 'string')
    : null
  const dogs = dogIds
    ? dogsForOwner.filter(dog => dogIds.includes(dog.id))
    : dogsForOwner

  if (!ownerKey || dogs.length === 0) {
    return NextResponse.json({ error: 'Nenhum cão ativo selecionado para este tutor' }, { status: 400 })
  }

  const ownerName = dogs[0].ownerName.trim()
  const fileName = contractFileName(dogs)
  const fileData = renderContractDocx(buildContractData(dogs))
  const contract = await prisma.contract.create({
    data: {
      ownerKey,
      ownerName,
      dogIds: dogs.map(dog => dog.id).join(','),
      dogNames: dogs.map(dog => dog.name).join(', '),
      status: 'GERADO',
      source: 'GERADO',
      fileName,
      mimeType: contractDocxMimeType,
      fileData,
      version: 1,
      createdBy: sessionUser.name || sessionUser.email || null,
    },
    select: contractMetadataSelect,
  })

  return NextResponse.json(contract, { status: 201 })
}
