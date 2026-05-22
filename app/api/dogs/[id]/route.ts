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

  const sessionUser = session.user as { role: string; tutorDogId?: string }
  if (sessionUser.role === 'TUTOR' && sessionUser.tutorDogId !== params.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const dog = await prisma.dog.findUnique({
    where: { id: params.id },
    include: {
      stays: {
        orderBy: { checkIn: 'desc' },
      },
      reports: {
        orderBy: { date: 'desc' },
        take: 10,
        include: {
          author: { select: { name: true } },
          activities: true,
          photos: true,
        },
      },
    },
  })

  if (!dog) return NextResponse.json({ error: 'Cão não encontrado' }, { status: 404 })

  return NextResponse.json(dog)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const sessionUser = session.user as { role: string; tutorDogId?: string }
  const role = sessionUser.role
  if (role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  if (role === 'TUTOR' && sessionUser.tutorDogId !== params.id) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const data = await req.json()

  // Fetch current scheduledDays before update to detect changes
  const oldDog = await prisma.dog.findUnique({ where: { id: params.id }, select: { scheduledDays: true } })

  // TUTOR can only edit basic registration fields
  if (role === 'TUTOR') {
    const dog = await prisma.dog.update({
      where: { id: params.id },
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
      },
    })
    return NextResponse.json(dog)
  }

  const dog = await prisma.dog.update({
    where: { id: params.id },
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
      enrollmentDate: data.enrollmentDate || null,
      serviceType: data.serviceType || null,
      scheduledDays: data.scheduledDays || null,
      monthlyStartDay: data.monthlyStartDay ? parseInt(data.monthlyStartDay) : null,
      notes: data.notes || null,
      feedingInstructions: data.feedingInstructions || null,
      feedingType: data.feedingType || null,
      feedingTimesPerDay: data.feedingTimesPerDay || null,
      feedingGramsPerMeal: data.feedingGramsPerMeal || null,
      medications: data.medications || null,
      allergies: data.allergies || null,
      vetName: data.vetName || null,
      vetPhone: data.vetPhone || null,
      vaccineV10Date: data.vaccineV10Date || null,
      vaccineV10Next: data.vaccineV10Next || null,
      vaccineRabiesDate: data.vaccineRabiesDate || null,
      vaccineRabiesNext: data.vaccineRabiesNext || null,
      vaccineFluDate: data.vaccineFluDate || null,
      vaccineFluNext: data.vaccineFluNext || null,
      vaccineGiardiaDate: data.vaccineGiardiaDate || null,
      vaccineGiardiaNext: data.vaccineGiardiaNext || null,
      giardiaExamNotes: data.giardiaExamNotes || null,
      isActive: data.isActive !== undefined ? data.isActive : data.dogStatus ? data.dogStatus !== 'INATIVO' : undefined,
      dogStatus: data.dogStatus || undefined,
      isBolsista: data.isBolsista !== undefined ? (data.isBolsista === true || data.isBolsista === 'true') : undefined,
      // Financial fields
      agreedPrice: data.agreedPrice !== undefined ? (data.agreedPrice ? parseFloat(data.agreedPrice) : null) : undefined,
      frequencyDays: data.frequencyDays !== undefined ? (data.frequencyDays ? parseInt(data.frequencyDays) : null) : undefined,
      isHalfDay: data.isHalfDay !== undefined ? (data.isHalfDay === true || data.isHalfDay === 'true') : undefined,
      // Discount will be auto-calculated below
    },
  })

  // Recalculate discount if financial fields changed
  const hasFinancialChanges = data.agreedPrice !== undefined || data.frequencyDays !== undefined || data.isHalfDay !== undefined
  if (hasFinancialChanges && dog.frequencyDays && dog.agreedPrice) {
    const yearMonth = new Date().toISOString().slice(0, 7)
    const priceTable = await prisma.priceTable.findFirst({
      where: {
        yearMonth,
        frequencyDays: dog.frequencyDays,
        isHalfDay: dog.isHalfDay,
        priceType: 'MONTHLY',
      },
    })
    
    if (priceTable) {
      const tablePrice = priceTable.monthlyPrice ?? 0
      const agreedPrice = dog.agreedPrice ?? 0
      
      let discountPercent = 0
      if (tablePrice > 0 && agreedPrice < tablePrice) {
        discountPercent = ((tablePrice - agreedPrice) / tablePrice) * 100
      }
      
      await prisma.dog.update({
        where: { id: dog.id },
        data: { discountPercent: Math.round(discountPercent * 100) / 100 },
      })
    }
  }

  // Remove future roster entries when deactivating via PUT (full edit)
  if (data.dogStatus === 'INATIVO') {
    const today = new Date().toISOString().split('T')[0]
    await prisma.dailyRoster.deleteMany({
      where: { dogId: params.id, date: { gte: today } },
    })
  }

  // If scheduledDays changed: delete future AUTO entries for this dog
  // and clear DailyRosterSeed for those dates so they get re-seeded
  const scheduledDaysChanged = data.scheduledDays !== undefined && oldDog?.scheduledDays !== data.scheduledDays
  if (scheduledDaysChanged) {
    const today = new Date().toISOString().split('T')[0]
    // Find future AUTO entries for this dog
    const futureAutoEntries = await prisma.dailyRoster.findMany({
      where: { dogId: params.id, source: 'AUTO', date: { gt: today } },
      select: { date: true },
    })
    const affectedDates = futureAutoEntries.map(e => e.date)

    // Delete this dog's future AUTO roster entries
    await prisma.dailyRoster.deleteMany({
      where: { dogId: params.id, source: 'AUTO', date: { gt: today } },
    })

    // Clear DailyRosterSeed for affected dates so they get re-seeded with new schedule
    if (affectedDates.length > 0) {
      await prisma.dailyRosterSeed.deleteMany({
        where: { date: { in: affectedDates } },
      })
    }
  }

  return NextResponse.json(dog)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'MONITOR' || role === 'TUTOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { dogStatus } = await req.json()
  const isActive = dogStatus !== 'INATIVO'

  const dog = await prisma.dog.update({
    where: { id: params.id },
    data: { dogStatus, isActive },
  })

  // Remove future roster entries when deactivating
  if (!isActive) {
    const today = new Date().toISOString().split('T')[0]
    await prisma.dailyRoster.deleteMany({
      where: { dogId: params.id, date: { gte: today } },
    })
  }

  return NextResponse.json(dog)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const role = (session.user as { role: string }).role
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Delete related records first (in order of dependencies)
    await prisma.dailyRoster.deleteMany({ where: { dogId: params.id } })
    await prisma.dailyReport.deleteMany({ where: { dogId: params.id } })
    await prisma.replacement.deleteMany({ where: { dogId: params.id } })
    await prisma.pendingDogChange.deleteMany({ where: { dogId: params.id } })

    // Delete stays (will cascade delete StayPhotos)
    await prisma.stay.deleteMany({ where: { dogId: params.id } })

    // Remove dog from being a tutor dog for users
    await prisma.user.updateMany({
      where: { tutorDogId: params.id },
      data: { tutorDogId: null },
    })

    // Actually delete the dog
    await prisma.dog.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE dog error:', error)
    return NextResponse.json({ error: error.message || 'Erro ao excluir' }, { status: 500 })
  }
}
