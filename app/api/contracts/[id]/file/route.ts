import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureContractTable } from '@/lib/contracts-db'
import {
  contractContentDisposition,
  contractDocxMimeType,
  contractMetadataSelect,
  contractPdfMimeType,
  isContractManager,
  maxContractFileSize,
} from '@/lib/contracts-api'

type RouteContext = { params: { id: string } }

export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role || ''
  if (!isContractManager(role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  await ensureContractTable()

  const contract = await prisma.contract.findUnique({
    where: { id: params.id },
    select: { fileName: true, mimeType: true, fileData: true },
  })
  if (!contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

  const inline = new URL(req.url).searchParams.get('inline') === '1'
  const fileData = Buffer.from(contract.fileData)
  return new NextResponse(fileData, {
    headers: {
      'Content-Type': contract.mimeType,
      'Content-Length': String(fileData.length),
      'Content-Disposition': contractContentDisposition(contract.fileName, inline),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role || ''
  if (!isContractManager(role)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  await ensureContractTable()

  const existing = await prisma.contract.findUnique({
    where: { id: params.id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Arquivo necessário' }, { status: 400 })
  if (file.size === 0 || file.size > maxContractFileSize) {
    return NextResponse.json({ error: 'O arquivo deve ter até 10MB' }, { status: 400 })
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  const mimeType = extension === 'docx'
    ? contractDocxMimeType
    : extension === 'pdf'
      ? contractPdfMimeType
      : null
  if (!mimeType) return NextResponse.json({ error: 'Envie um arquivo .docx ou .pdf' }, { status: 400 })

  const fileName = file.name.replace(/[\\/]/g, '_')
  const contract = await prisma.contract.update({
    where: { id: params.id },
    data: {
      fileName,
      mimeType,
      fileData: Buffer.from(await file.arrayBuffer()),
      version: { increment: 1 },
    },
    select: contractMetadataSelect,
  })

  return NextResponse.json(contract)
}
