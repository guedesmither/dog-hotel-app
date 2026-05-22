import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const report = await prisma.dailyReport.findUnique({
    where: { id: params.id },
    include: {
      dog: true,
      activities: { orderBy: { createdAt: 'asc' } },
      photos: { orderBy: { createdAt: 'asc' } },
      author: { select: { name: true } },
    },
  })

  if (!report) return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 })

  return NextResponse.json(report)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const data = await req.json()
  const userId = (session.user as { id: string }).id

  const report = await prisma.dailyReport.update({
    where: { id: params.id },
    data: {
      breakfastStatus: data.breakfastStatus,
      breakfastQty: data.breakfastQty || null,
      breakfastNotes: data.breakfastNotes || null,
      lunchStatus: data.lunchStatus,
      lunchQty: data.lunchQty || null,
      lunchNotes: data.lunchNotes || null,
      dinnerStatus: data.dinnerStatus,
      dinnerQty: data.dinnerQty || null,
      dinnerNotes: data.dinnerNotes || null,
      hasMedication: data.hasMedication,
      medicationGiven: data.medicationGiven !== undefined ? data.medicationGiven : null,
      medicationNotes: data.medicationNotes || null,
      mood: data.mood || null,
      generalNotes: data.generalNotes || null,
      sentToWhatsApp: data.sentToWhatsApp !== undefined ? data.sentToWhatsApp : undefined,
      lastEditedById: userId,
    } as any,
    include: {
      activities: true,
      photos: true,
      author: { select: { name: true } },
    },
  })

  // Fetch last editor name
  let lastEditedByName: string | null = null
  if ((report as any).lastEditedById) {
    const editor = await prisma.user.findUnique({
      where: { id: (report as any).lastEditedById },
      select: { name: true },
    })
    lastEditedByName = editor?.name || null
  }

  return NextResponse.json({ ...report, lastEditedByName })
}
