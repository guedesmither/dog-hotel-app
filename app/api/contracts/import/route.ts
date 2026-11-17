import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureContractTable } from '@/lib/contracts-db'
import { normalizeOwner } from '@/lib/contracts'
import {
  contractDocxMimeType,
  contractPdfMimeType,
  isContractManager,
  maxContractFileSize,
} from '@/lib/contracts-api'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0].toLocaleUpperCase('pt-BR') + word.slice(1).toLocaleLowerCase('pt-BR'))
    .join(' ')
}

function splitFileName(fileName: string): { petPart: string; tutorPart: string } {
  const base = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/^CONTRATO - /i, '')
  const separator = base.lastIndexOf(' - ')
  if (separator < 0) return { petPart: base.trim(), tutorPart: '' }
  return {
    petPart: base.slice(0, separator).trim(),
    tutorPart: base.slice(separator + 3).trim(),
  }
}

function dogNameMatches(dogName: string, petPart: string): boolean {
  const normalizedDogName = normalizeOwner(dogName)
  const normalizedPetPart = normalizeOwner(petPart)
  if (!normalizedDogName) return false
  const wholeName = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(normalizedDogName)}(?=$|[^\\p{L}\\p{N}])`,
    'u',
  )
  return wholeName.test(normalizedPetPart)
}

function chooseMatchedDogs(
  dogs: Array<{ id: string; name: string; ownerName: string }>,
  petPart: string,
  tutorPart: string,
) {
  const matches = dogs.filter(dog => dogNameMatches(dog.name, petPart))
  const tutorFirstName = normalizeOwner(tutorPart).split(' ')[0]
  const preferred = tutorFirstName
    ? matches.filter(dog => normalizeOwner(dog.ownerName).split(' ')[0] === tutorFirstName)
    : []
  const candidates = preferred.length > 0 ? preferred : matches
  const byOwner = new Map<string, typeof candidates>()

  for (const dog of candidates) {
    const ownerKey = normalizeOwner(dog.ownerName)
    const group = byOwner.get(ownerKey) || []
    group.push(dog)
    byOwner.set(ownerKey, group)
  }

  return Array.from(byOwner.values()).sort((a, b) => b.length - a.length)[0] || []
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const sessionUser = session.user as { role?: string; name?: string | null; email?: string | null }
  if (!isContractManager(sessionUser.role || '')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  await ensureContractTable()

  const formData = await req.formData()
  const files = formData.getAll('files').filter((value): value is File => value instanceof File)
  if (files.length === 0) return NextResponse.json({ error: 'Selecione ao menos um arquivo' }, { status: 400 })
  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['docx', 'pdf'].includes(extension || '')) {
      return NextResponse.json({ error: `Formato não permitido: ${file.name}` }, { status: 400 })
    }
    if (file.size === 0 || file.size > maxContractFileSize) {
      return NextResponse.json({ error: `Arquivo vazio ou maior que 10MB: ${file.name}` }, { status: 400 })
    }
  }

  let modifiedDates: number[] = []
  const rawLastModified = formData.get('lastModified')
  if (typeof rawLastModified === 'string') {
    try {
      const parsed = JSON.parse(rawLastModified)
      if (Array.isArray(parsed)) modifiedDates = parsed.map(Number)
    } catch {
      modifiedDates = []
    }
  }

  const dogs = await prisma.dog.findMany({
    select: { id: true, name: true, ownerName: true },
  })
  const results = []

  for (let index = 0; index < files.length; index++) {
    const file = files[index]
    const { petPart, tutorPart } = splitFileName(file.name)
    const matchedDogs = chooseMatchedDogs(dogs, petPart, tutorPart)
    const dogNames = matchedDogs.length
      ? matchedDogs.map(dog => dog.name).join(', ')
      : petPart
    const ownerName = matchedDogs[0]?.ownerName.trim() || titleCase(tutorPart || petPart)
    const ownerKey = normalizeOwner(ownerName)
    const fileName = file.name.replace(/[\\/]/g, '_')
    const existing = await prisma.contract.findFirst({
      where: { fileName, source: 'IMPORTADO' },
      select: { id: true },
    })

    if (existing) {
      results.push({ fileName, ownerName, dogNames, matched: matchedDogs.length > 0, skipped: true })
      continue
    }

    const lastModified = modifiedDates[index]
    const sentAt = Number.isFinite(lastModified) ? new Date(lastModified) : new Date()
    const extension = fileName.split('.').pop()?.toLowerCase()
    await prisma.contract.create({
      data: {
        ownerKey,
        ownerName,
        dogIds: matchedDogs.map(dog => dog.id).join(','),
        dogNames,
        status: 'ENVIADO',
        source: 'IMPORTADO',
        fileName,
        mimeType: extension === 'pdf' ? contractPdfMimeType : contractDocxMimeType,
        fileData: Buffer.from(await file.arrayBuffer()),
        version: 1,
        sentAt,
        createdBy: sessionUser.name || sessionUser.email || null,
      },
    })
    results.push({ fileName, ownerName, dogNames, matched: matchedDogs.length > 0, skipped: false })
  }

  return NextResponse.json({ results }, { status: 201 })
}
