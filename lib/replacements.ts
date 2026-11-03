import { prisma } from '@/lib/prisma'

// Keeps Replacement records in sync with REPOSICAO entries in the agenda (DailyRoster).

export async function findReplacementForReposicao(dogId: string, date: string) {
  const scheduledHere = await prisma.replacement.findFirst({
    where: { dogId, scheduledDate: date, status: { in: ['SCHEDULED', 'DONE'] } },
  })
  if (scheduledHere) return scheduledHere
  return prisma.replacement.findFirst({
    where: { dogId, status: 'PENDING' },
    orderBy: { absentDate: 'asc' },
  })
}

export async function linkReposicaoToReplacement(dogId: string, date: string) {
  const replacement = await findReplacementForReposicao(dogId, date)
  if (!replacement || replacement.status !== 'PENDING') return
  await prisma.replacement.update({
    where: { id: replacement.id },
    data: { status: 'SCHEDULED', scheduledDate: date },
  })
}

export async function releaseReposicaoReplacement(dogId: string, date: string) {
  await prisma.replacement.updateMany({
    where: { dogId, scheduledDate: date, status: { in: ['SCHEDULED', 'DONE'] } },
    data: { status: 'PENDING', scheduledDate: null },
  })
}

export async function syncReposicaoPresence(dogId: string, date: string, present: boolean | null) {
  if (present === true) {
    await prisma.replacement.updateMany({
      where: { dogId, scheduledDate: date, status: 'SCHEDULED' },
      data: { status: 'DONE' },
    })
  } else {
    await prisma.replacement.updateMany({
      where: { dogId, scheduledDate: date, status: 'DONE' },
      data: { status: 'SCHEDULED' },
    })
  }
}

export async function removeReposicaoRosterEntry(dogId: string, date: string) {
  await prisma.dailyRoster.deleteMany({ where: { dogId, date, type: 'REPOSICAO' } })
  await prisma.dailyRosterSeed.upsert({ where: { date }, update: {}, create: { date } })
}
