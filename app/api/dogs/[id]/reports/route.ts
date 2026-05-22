import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayString } from '@/lib/utils'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || getTodayString()

  let report = await prisma.dailyReport.findUnique({
    where: {
      dogId_date: {
        dogId: params.id,
        date,
      },
    },
    include: {
      activities: { orderBy: { createdAt: 'asc' } },
      photos: { orderBy: { createdAt: 'asc' } },
      author: { select: { name: true, id: true } },
    },
  })

  if (!report && date === getTodayString()) {
    const userId = (session.user as { id: string }).id
    report = await prisma.dailyReport.create({
      data: {
        dogId: params.id,
        date,
        authorId: userId,
      },
      include: {
        activities: true,
        photos: true,
        author: { select: { name: true, id: true } },
      },
    })
  }

  // Resolve lastEditedBy name
  if (report && (report as any).lastEditedById) {
    const editor = await prisma.user.findUnique({
      where: { id: (report as any).lastEditedById },
      select: { name: true },
    })
    return NextResponse.json({ ...report, lastEditedByName: editor?.name || null })
  }

  return NextResponse.json(report ? { ...report, lastEditedByName: null } : report)
}
