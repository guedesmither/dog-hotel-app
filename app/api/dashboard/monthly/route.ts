import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  startOfDay,
  addMonths,
  subMonths,
  subDays,
  eachDayOfInterval,
  getDay,
  getDate,
  setDate,
  parseISO,
  format,
} from 'date-fns'

const DAY_NAME_TO_DOW: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  'segunda-feira': 1,
  terça: 2,
  terca: 2,
  'terça-feira': 2,
  quarta: 3,
  'quarta-feira': 3,
  quinta: 4,
  'quinta-feira': 4,
  sexta: 5,
  'sexta-feira': 5,
  sábado: 6,
  sabado: 6,
}

function parseScheduledDays(scheduledDays: string | null): number[] {
  if (!scheduledDays) return []
  return scheduledDays
    .split(/[,;/]+/)
    .map((d) => DAY_NAME_TO_DOW[d.trim().toLowerCase()])
    .filter((d) => d !== undefined) as number[]
}

function getCycleRange(monthlyStartDay: number, today: Date): { start: Date; end: Date } {
  const todayDay = getDate(today)
  let cycleStart: Date
  if (todayDay >= monthlyStartDay) {
    cycleStart = setDate(new Date(today.getFullYear(), today.getMonth(), 1), monthlyStartDay)
  } else {
    const prev = subMonths(today, 1)
    cycleStart = setDate(new Date(prev.getFullYear(), prev.getMonth(), 1), monthlyStartDay)
  }
  return { start: startOfDay(cycleStart), end: startOfDay(addMonths(cycleStart, 1)) }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const today = startOfDay(new Date())
  const todayDOW = getDay(today)
  const todayStr = format(today, 'yyyy-MM-dd')

  // Fetch all active dogs
  const dogs = await prisma.dog.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, breed: true, ownerName: true, photoUrl: true,
      scheduledDays: true, monthlyStartDay: true, serviceType: true,
      medications: true, allergies: true, enrollmentDate: true,
      stays: {
        where: { isScheduled: false, active: true },
        select: { id: true, checkIn: true, active: true, dogId: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Fetch all DailyRoster entries in the past 60 days (covers any billing cycle)
  const rosterLookback = format(subDays(today, 60), 'yyyy-MM-dd')
  const allRoster = await prisma.dailyRoster.findMany({
    where: { date: { gte: rosterLookback, lte: todayStr } },
    select: { dogId: true, date: true, present: true },
  })

  // Also fetch today's roster for real-time presence
  const todayRoster = await prisma.dailyRoster.findMany({
    where: { date: todayStr },
    select: { dogId: true, present: true },
  })

  type DogRow = (typeof dogs)[number]
  type RosterEntry = { dogId: string | null; date: string; present: boolean | null }
  type TodayRosterEntry = { dogId: string | null; present: boolean | null }
  type StayEntry = { id: string; checkIn: Date; active: boolean; dogId: string }

  // Filter dogs with actual activity (scheduled days, active stay, or roster entries)
  const activeDogs = dogs.filter((dog: DogRow) => {
    const scheduledDOWs = parseScheduledDays(dog.scheduledDays)
    const hasScheduledDays = scheduledDOWs.length > 0
    const hasActiveStay = dog.stays.some((s: StayEntry) => s.active)
    const hasRosterEntries = allRoster.some((e: RosterEntry) => e.dogId === dog.id)
    return hasScheduledDays || hasActiveStay || hasRosterEntries
  })

  const results = activeDogs.map((dog: DogRow) => {
    const scheduledDOWs = parseScheduledDays(dog.scheduledDays)
    const hasSchedule = scheduledDOWs.length > 0

    // Today status via roster
    const todayEntry = todayRoster.find((e: TodayRosterEntry) => e.dogId === dog.id)
    const hasActiveStay = dog.stays.some((s: StayEntry) => format(new Date(s.checkIn), 'yyyy-MM-dd') === todayStr && s.active)
    const hasAttendedToday = todayEntry?.present === true || hasActiveStay
    const isExpectedToday = scheduledDOWs.includes(todayDOW)

    let todayStatus: 'PRESENT' | 'ABSENT' | 'MAKEUP' | 'NOT_EXPECTED' = 'NOT_EXPECTED'
    if (isExpectedToday && hasAttendedToday) todayStatus = 'PRESENT'
    else if (isExpectedToday && !hasAttendedToday) todayStatus = 'ABSENT'
    else if (!isExpectedToday && hasAttendedToday) todayStatus = 'MAKEUP'

    // Cycle range
    const startDay = dog.monthlyStartDay ?? 1
    const { start: cycleStart, end: cycleEnd } = getCycleRange(startDay, today)

    // Respect enrollmentDate: don't count days before enrollment
    const enrollmentDate = dog.enrollmentDate ? parseISO(dog.enrollmentDate) : null
    const effectiveStart = enrollmentDate && enrollmentDate > cycleStart ? enrollmentDate : cycleStart

    const cycleStartStr = format(cycleStart, 'yyyy-MM-dd')
    const cycleEndStr = format(new Date(cycleEnd.getTime() - 1), 'yyyy-MM-dd')

    // Expected days up to today (from effective start)
    const pastDaysInCycle = eachDayOfInterval({ start: effectiveStart, end: today })
    const expectedSoFar = hasSchedule
      ? pastDaysInCycle.filter((d) => scheduledDOWs.includes(getDay(d))).length
      : 0

    // Total expected in full cycle
    const fullCycleDays = eachDayOfInterval({ start: effectiveStart, end: new Date(cycleEnd.getTime() - 1) })
    const totalExpectedInCycle = hasSchedule
      ? fullCycleDays.filter((d) => scheduledDOWs.includes(getDay(d))).length
      : 0

    // Attended days from DailyRoster (present=true) within cycle
    const dogRoster = allRoster.filter((e: RosterEntry) => e.dogId === dog.id && e.date >= cycleStartStr && e.date <= todayStr)
    const scheduledAttended = dogRoster.filter((e: RosterEntry) => {
      if (e.present !== true) return false
      const dow = getDay(parseISO(e.date))
      return scheduledDOWs.includes(dow)
    }).length
    const makeupsUsed = dogRoster.filter((e: RosterEntry) => {
      if (e.present !== true) return false
      const dow = getDay(parseISO(e.date))
      return !scheduledDOWs.includes(dow)
    }).length

    const absencesSoFar = Math.max(0, expectedSoFar - scheduledAttended)
    const makeupCreditsAvailable = Math.max(0, absencesSoFar - makeupsUsed)
    const remainingExpectedDays = totalExpectedInCycle - expectedSoFar
    const totalAttended = dogRoster.filter((e: RosterEntry) => e.present === true).length

    return {
      dog: {
        id: dog.id,
        name: dog.name,
        breed: dog.breed,
        ownerName: dog.ownerName,
        photoUrl: dog.photoUrl,
        scheduledDays: dog.scheduledDays,
        monthlyStartDay: dog.monthlyStartDay,
        serviceType: dog.serviceType,
        medications: dog.medications,
        allergies: dog.allergies,
      },
      today: {
        isExpectedToday,
        isActiveToday: hasAttendedToday,
        hasAttendedToday,
        status: todayStatus,
      },
      cycle: {
        startDate: cycleStartStr,
        endDate: cycleEndStr,
        scheduledDOWs,
        expectedSoFar,
        totalExpectedInCycle,
        scheduledAttended,
        makeupsUsed,
        absencesSoFar,
        makeupCreditsAvailable,
        remainingExpectedDays,
        totalAttended,
      },
    }
  })

  return NextResponse.json(results)
}
