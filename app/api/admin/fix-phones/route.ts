import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function fixPhone(raw: string | null): string | null {
  if (!raw) return null

  // Remove everything except digits and leading +
  const digits = raw.replace(/\D/g, '')

  if (!digits) return raw

  // If already starts with 55 and has 12-13 digits → already correct
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits
  }

  // Pattern: "+11(DDD)NNNNN-NNNN" or "+1 1(DDD)..." — American mask applied to Brazilian number
  // e.g. raw "+11(968)988-402" → digits "119689884020" or similar
  // Strip leading country code artifacts: if starts with 1 and length > 11, drop leading 1
  let clean = digits
  if (clean.startsWith('1') && (clean.length === 12 || clean.length === 13)) {
    clean = clean.slice(1)
  }

  // Now should be 11 digits (DDD + 9 digit number) or 10 digits (DDD + 8 digit number)
  if (clean.length === 11 || clean.length === 10) {
    return `55${clean}`
  }

  // Already 55-prefixed with wrong length — return digits as-is
  return digits
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  if (secret !== 'aue-reset-2026') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const dogs = await prisma.dog.findMany({
    select: { id: true, name: true, ownerPhone: true },
  })

  const results: { name: string; before: string | null; after: string | null; changed: boolean }[] = []

  for (const dog of dogs) {
    const fixed = fixPhone(dog.ownerPhone)
    const changed = fixed !== dog.ownerPhone
    if (changed) {
      await prisma.dog.update({
        where: { id: dog.id },
        data: { ownerPhone: fixed ?? '' },
      })
    }
    results.push({ name: dog.name, before: dog.ownerPhone, after: fixed, changed })
  }

  return NextResponse.json({ ok: true, results })
}
