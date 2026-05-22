import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const sessionUser = session.user as { role: string; tutorDogId?: string }
  // MONITOR can only access via monitoria screens
  if (sessionUser.role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const active = searchParams.get('active')
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const where: Record<string, unknown> = {}
  if (status === 'CRECHE') { where.isActive = true; where.dogStatus = 'CRECHE' }
  else if (status === 'HOTEL') {
    where.isActive = true
    where.OR = [
      { dogStatus: 'HOTEL' },
      { serviceType: { contains: 'Hotel' } },
    ]
  }
  else if (status === 'AVULSO') { where.isActive = true; where.dogStatus = 'AVULSO' }
  else if (status === 'INATIVO' || active === 'false') {
    where.OR = [{ isActive: false }, { dogStatus: 'INATIVO' }]
  }
  else if (active === 'true') { where.isActive = true }
  // TUTOR can only see their own dog
  if (sessionUser.role === 'TUTOR') {
    if (!sessionUser.tutorDogId) return NextResponse.json([])
    where.id = sessionUser.tutorDogId
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { breed: { contains: search } },
      { ownerName: { contains: search } },
    ]
  }

  const today = new Date().toISOString().split('T')[0]

  const dogs = await prisma.dog.findMany({
    where,
    include: {
      stays: {
        where: { active: true },
        take: 1,
      },
      reports: active === 'true'
        ? {
            where: { date: today },
            take: 1,
            include: {
              activities: true,
              author: { select: { name: true } },
            },
          }
        : false,
    },
    orderBy: { name: 'asc' },
  })

  // Resolve lastEditedByName for each report
  if (active === 'true') {
    const editorIds = new Set<string>()
    for (const dog of dogs as any[]) {
      for (const r of dog.reports || []) {
        if (r.lastEditedById) editorIds.add(r.lastEditedById)
      }
    }
    const editors = editorIds.size > 0
      ? await prisma.user.findMany({ where: { id: { in: Array.from(editorIds) } }, select: { id: true, name: true } })
      : []
    const editorMap = Object.fromEntries(editors.map(e => [e.id, e.name]))
    for (const dog of dogs as any[]) {
      for (const r of dog.reports || []) {
        r.lastEditedByName = r.lastEditedById ? editorMap[r.lastEditedById] || null : null
      }
    }
  }

  return NextResponse.json(dogs)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'MONITOR' || role === 'TUTOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const data = await req.json()

  if (data.matricula) {
    const existing = await prisma.dog.findUnique({ where: { matricula: data.matricula } })
    if (existing) {
      return NextResponse.json({ error: `Matrícula ${data.matricula} já está em uso por ${existing.name}` }, { status: 409 })
    }
  }

  const dog = await prisma.dog.create({
    data: {
      name: data.name,
      breed: data.breed,
      birthDate: data.birthDate || null,
      color: data.color || null,
      weight: data.weight ? parseFloat(data.weight) : null,
      ownerName: data.ownerName,
      ownerPhone: data.ownerPhone,
      ownerEmail: data.ownerEmail || null,
      ownerCpf: data.ownerCpf || null,
      sex: data.sex || null,
      castrated: data.castrated !== undefined && data.castrated !== '' ? data.castrated === true || data.castrated === 'true' || data.castrated === 'sim' : null,
      size: data.size || null,
      temperament: data.temperament || null,
      preferredActivities: data.preferredActivities || null,
      allowPool: data.allowPool !== undefined && data.allowPool !== '' ? data.allowPool === true || data.allowPool === 'true' || data.allowPool === 'SIM' : null,
      allowPhotos: data.allowPhotos !== undefined && data.allowPhotos !== '' ? data.allowPhotos === true || data.allowPhotos === 'true' || data.allowPhotos === 'SIM' : null,
      matricula: data.matricula || null,
      enrollmentDate: data.enrollmentDate || null,
      serviceType: data.serviceType || null,
      scheduledDays: data.scheduledDays || null,
      monthlyStartDay: data.monthlyStartDay ? parseInt(data.monthlyStartDay) : null,
      dogStatus: data.dogStatus || 'CRECHE',
      isActive: data.dogStatus ? data.dogStatus !== 'INATIVO' : true,
      isBolsista: data.isBolsista === true || data.isBolsista === 'true',
      notes: data.notes || null,
      feedingInstructions: data.feedingInstructions || null,
      feedingType: data.feedingType || null,
      feedingTimesPerDay: data.feedingTimesPerDay || null,
      feedingGramsPerMeal: data.feedingGramsPerMeal || null,
      medications: data.medications || null,
      allergies: data.allergies || null,
      vetName: data.vetName || null,
      vetPhone: data.vetPhone || null,
      // Financial fields
      agreedPrice: data.agreedPrice ? parseFloat(data.agreedPrice) : null,
      frequencyDays: data.frequencyDays ? parseInt(data.frequencyDays) : null,
      isHalfDay: data.isHalfDay === true || data.isHalfDay === 'true',
      // Calculate discount automatically based on price table
      discountPercent: 0, // Auto-calculated below
      discountValue: 0,   // Auto-calculated below
    },
  })

  // Calculate automatic discount based on price table
  if (dog.frequencyDays && dog.agreedPrice) {
    const yearMonth = new Date().toISOString().slice(0, 7)
    const priceTable = await prisma.priceTable.findFirst({
      where: {
        yearMonth,
        frequencyDays: dog.frequencyDays,
        isHalfDay: dog.isHalfDay,
      },
    })
    
    if (priceTable && priceTable.monthlyPrice != null) {
      const tablePrice = priceTable.monthlyPrice
      const agreedPrice = dog.agreedPrice
      
      if (agreedPrice != null && agreedPrice < tablePrice) {
        // Calculate discount percentage
        const discountPercent = ((tablePrice - agreedPrice) / tablePrice) * 100
        await prisma.dog.update({
          where: { id: dog.id },
          data: { discountPercent: Math.round(discountPercent * 100) / 100 },
        })
      } else if (agreedPrice != null && agreedPrice > tablePrice) {
        // Store the agreed price as is (no discount, might be premium)
        // discountPercent remains 0
      }
    }
  }

  if (data.checkIn) {
    await prisma.stay.create({
      data: {
        dogId: dog.id,
        room: data.room || null,
        notes: data.stayNotes || null,
        active: true,
      },
    })
  }

  return NextResponse.json(dog, { status: 201 })
}
