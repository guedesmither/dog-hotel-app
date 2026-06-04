import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/dogs/fix-matriculas
// Step 1: Apply known correct matriculas
// Step 2: Remove C001 from Napoleão
// Step 3: Auto-assign sequential matriculas to dogs without one
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Somente ADMIN' }, { status: 403 })

  const knownMatriculas: Record<string, string> = {
    'Sol':          'H001',
    'Dory':         'C001',
    'Sirius Black': 'C002',
    'Luna':         'H002',
    'Baruc':        'D001',
    'Theodoro':     'C003', // first Theodoro = CRECHE
    'Romain':       'C004',
    'Theo':         'C005',
    'Ramiro':       'H003',
    'Mel':          'H004',
    'Júpiter':      'C006',
    'Jupiter':      'C006',
    'Thifany':      'D002',
    'Jack Sparrow': 'D003',
    'Annie Bonny':  'D004',
    'Betina':       'D005',
    'Tobias':       'C007',
    'Maya':         'C008',
    'Bucky':        'C009',
    'Leonardo':     'C010',
    'Diana':        'H006',
    'Lolla':        'H007',
    'Pandora':      'C011',
  }

  // Theodoro H005 is the HOTEL one — handle separately below

  const results: Array<{ name: string; id: string; action: string; matricula: string | null }> = []

  try {

  // Load all dogs ordered by createdAt
  const allDogs = await prisma.dog.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, matricula: true, dogStatus: true, isBolsista: true, createdAt: true }
  })

  // Step 1: Clear all matriculas first to avoid unique conflicts
  await prisma.dog.updateMany({ data: { matricula: null } })

  // Track which matriculas are already assigned (to avoid duplicate assignment)
  const assignedMatriculas = new Set<string>()

  // Step 2: Apply known matriculas by name
  // Special case: two "Theodoro" — one CRECHE (C003), one HOTEL (H005)
  let theodoroCrecheDone = false
  let theodoroHotelDone = false

  for (const dog of allDogs) {
    const normalizedName = dog.name.trim()

    if (normalizedName === 'Theodoro') {
      if (!theodoroCrecheDone) {
        await prisma.dog.update({ where: { id: dog.id }, data: { matricula: 'C003' } })
        results.push({ name: dog.name, id: dog.id, action: 'SET_KNOWN', matricula: 'C003' })
        assignedMatriculas.add('C003')
        theodoroCrecheDone = true
        continue
      }
      if (!theodoroHotelDone) {
        await prisma.dog.update({ where: { id: dog.id }, data: { matricula: 'H005' } })
        results.push({ name: dog.name, id: dog.id, action: 'SET_KNOWN', matricula: 'H005' })
        assignedMatriculas.add('H005')
        theodoroHotelDone = true
        continue
      }
    }

    // Normalize accents for lookup (é → e, ú → u, etc.)
    const nameVariants = [normalizedName, normalizedName.normalize('NFD').replace(/[\u0300-\u036f]/g, '')]
    let knownMatricula: string | undefined
    for (const variant of nameVariants) {
      if (knownMatriculas[variant]) { knownMatricula = knownMatriculas[variant]; break }
    }

    if (knownMatricula && !assignedMatriculas.has(knownMatricula)) {
      await prisma.dog.update({ where: { id: dog.id }, data: { matricula: knownMatricula } })
      results.push({ name: dog.name, id: dog.id, action: 'SET_KNOWN', matricula: knownMatricula })
      assignedMatriculas.add(knownMatricula)
    }
  }

  // Step 3: Dogs without matricula — assign sequentially (skip bolsistas)
  const dogsWithout = allDogs.filter(d => {
    if (d.isBolsista) return false
    const assigned = results.find(r => r.id === d.id)
    return !assigned
  })

  // Track counters for each prefix
  const usedNumbers: Record<string, number[]> = { C: [], H: [], D: [] }
  for (const r of results) {
    if (!r.matricula) continue
    const prefix = r.matricula[0]
    const num = parseInt(r.matricula.slice(1), 10)
    if (usedNumbers[prefix]) usedNumbers[prefix].push(num)
  }

  const getNextNum = (prefix: string): string => {
    const used = usedNumbers[prefix] || []
    let n = 1
    while (used.includes(n)) n++
    used.push(n)
    usedNumbers[prefix] = used
    return `${prefix}${String(n).padStart(3, '0')}`
  }

  for (const dog of dogsWithout) {
    let prefix = 'C'
    if (dog.dogStatus === 'HOTEL') prefix = 'H'
    else if (dog.dogStatus === 'BOLSISTA') prefix = 'B'
    const matricula = getNextNum(prefix)
    await prisma.dog.update({ where: { id: dog.id }, data: { matricula } })
    results.push({ name: dog.name, id: dog.id, action: 'AUTO_ASSIGNED', matricula })
  }

  // Summary
  const known = results.filter(r => r.action === 'SET_KNOWN')
  const auto = results.filter(r => r.action === 'AUTO_ASSIGNED')

  return NextResponse.json({
    message: `${known.length} matrículas fixadas + ${auto.length} atribuídas automaticamente`,
    known,
    auto,
    all: results.sort((a, b) => (a.matricula || '').localeCompare(b.matricula || ''))
  })

  } catch (err: any) {
    console.error('fix-matriculas error:', err)
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
