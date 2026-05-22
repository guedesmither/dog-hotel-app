import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const active = searchParams.get('active')
  const scheduled = searchParams.get('scheduled')

  const where =
    scheduled === 'true'
      ? { isScheduled: true }
      : active === 'true'
      ? { active: true, isScheduled: false }
      : { isScheduled: false }

  const stays = await prisma.stay.findMany({
    where,
    include: { dog: true, photos: true },
    orderBy: scheduled === 'true' ? { scheduledCheckIn: 'asc' } : { checkIn: 'desc' },
  })

  return NextResponse.json(stays)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const data = await req.json()

  await prisma.stay.updateMany({
    where: { dogId: data.dogId, active: true },
    data: { active: false, checkOut: new Date() },
  })

  if (data.isScheduled) {
    const stay = await prisma.stay.create({
      data: {
        dogId: data.dogId,
        room: data.room || null,
        notes: data.notes || null,
        active: false,
        isScheduled: true,
        scheduledCheckIn: data.scheduledCheckIn ? new Date(data.scheduledCheckIn) : null,
        scheduledCheckOut: data.scheduledCheckOut ? new Date(data.scheduledCheckOut) : null,
      },
      include: { dog: true },
    })
    return NextResponse.json(stay, { status: 201 })
  }

  const stay = await prisma.stay.create({
    data: {
      dogId: data.dogId,
      room: data.room || null,
      notes: data.notes || null,
      checkInHealthNotes: data.checkInHealthNotes || null,
      checkInBelongings: data.checkInBelongings || null,
      active: true,
    },
    include: { dog: true, photos: true },
  })

  return NextResponse.json(stay, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const data = await req.json()

  // confirm scheduled → active check-in + auto-add to agenda
  if (data.action === 'confirm') {
    const stay = await prisma.stay.update({
      where: { id: data.id },
      data: {
        active: true,
        isScheduled: false,
        checkIn: new Date(),
        checkInHealthNotes: data.checkInHealthNotes || null,
        checkInBelongings: data.checkInBelongings || null,
      },
      include: { dog: true, photos: true },
    })

    // Auto-add to agenda (roster) for all scheduled dates
    if (stay.scheduledCheckIn) {
      const start = new Date(stay.scheduledCheckIn)
      start.setHours(12, 0, 0, 0)
      const end = stay.scheduledCheckOut ? new Date(stay.scheduledCheckOut) : new Date(start)
      end.setHours(12, 0, 0, 0)

      const dates: string[] = []
      const cur = new Date(start)
      while (cur <= end) {
        dates.push(cur.toISOString().split('T')[0])
        cur.setDate(cur.getDate() + 1)
      }

      // Add each date to roster (HOTEL type)
      for (const date of dates) {
        const exists = await prisma.dailyRoster.findFirst({
          where: { dogId: stay.dogId, date }
        })
        if (!exists) {
          await prisma.dailyRoster.create({
            data: { dogId: stay.dogId, date, source: 'MANUAL', type: 'HOTEL', present: date === new Date().toISOString().split('T')[0] ? true : null }
          })
        }
      }
    }

    return NextResponse.json(stay)
  }

  // cancel scheduled
  if (data.action === 'cancel') {
    await prisma.stay.delete({ where: { id: data.id } })
    return NextResponse.json({ success: true })
  }

  // checkout
  const stay = await prisma.stay.update({
    where: { id: data.id },
    data: {
      active: false,
      checkOut: new Date(),
      checkOutHealthNotes: data.checkOutHealthNotes || null,
      checkOutBelongings: data.checkOutBelongings || null,
    },
    include: { dog: true, photos: true },
  })

  return NextResponse.json(stay)
}
