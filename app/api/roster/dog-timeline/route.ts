import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DAY_NAME_MAP: Record<number, string[]> = {
  0: ['domingo', 'dom'],
  1: ['segunda', 'seg'],
  2: ['terça', 'ter', 'terca'],
  3: ['quarta', 'qua'],
  4: ['quinta', 'qui'],
  5: ['sexta', 'sex'],
  6: ['sábado', 'sab', 'sabado'],
}

function parseSaleDate(v: any): Date | null {
  if (!v) return null
  if (typeof v === 'string') {
    if (v.includes('/')) {
      const [d, m, y] = v.split('/').map(Number)
      return new Date(y, m - 1, d)
    }
    return new Date(v)
  }
  if (v instanceof Date) return v
  return null
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const dogId = req.nextUrl.searchParams.get('dogId')
  if (!dogId) return NextResponse.json({ error: 'dogId obrigatório' }, { status: 400 })

  // Fetch dog + active sales
  const dog = await prisma.dog.findUnique({
    where: { id: dogId },
    select: {
      scheduledDays: true,
      dogStatus: true,
      sales: {
        where: {
          paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
          saleType: 'MENSAL',
          manualBaixa: false,
        },
        select: { startDate: true, saleDate: true, endDate: true },
      },
    },
  })

  // Fetch all existing roster entries
  const existing = await prisma.dailyRoster.findMany({
    where: { dogId },
    orderBy: { date: 'asc' },
    select: { id: true, date: true, source: true, type: true, present: true, isPernoite: true, packageId: true },
  })

  const existingDates = new Set(existing.map(e => e.date))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // Project future dates from scheduledDays + MENSAL sales
  const projected: any[] = []

  if (dog?.scheduledDays && dog.scheduledDays.trim() !== '' && dog?.sales?.length) {
    const scheduledLower = dog.scheduledDays.toLowerCase()

    for (const sale of dog.sales) {
      const saleStart = parseSaleDate(sale.startDate) || parseSaleDate(sale.saleDate)
      if (!saleStart) continue
      saleStart.setHours(0, 0, 0, 0)

      let saleEnd = parseSaleDate(sale.endDate)
      if (!saleEnd) {
        // Default: 31 days
        saleEnd = new Date(saleStart)
        saleEnd.setDate(saleEnd.getDate() + 31)
      }
      saleEnd.setHours(23, 59, 59, 999)

      // Walk each day in the sale period from tomorrow onwards
      const cur = new Date(Math.max(saleStart.getTime(), today.getTime() + 86400000))
      cur.setHours(0, 0, 0, 0)

      while (cur <= saleEnd) {
        const dateStr = cur.toISOString().split('T')[0]
        if (!existingDates.has(dateStr)) {
          const aliases = DAY_NAME_MAP[cur.getDay()] || []
          if (aliases.some(a => scheduledLower.includes(a))) {
            projected.push({
              id: `projected_${dateStr}`,
              date: dateStr,
              source: 'PROJECTED',
              type: 'CRECHE',
              present: null,
              isPernoite: false,
              packageId: null,
            })
            existingDates.add(dateStr) // avoid duplicates across sales
          }
        }
        cur.setDate(cur.getDate() + 1)
      }
    }
  }

  // Merge: actual entries + projected, sorted by date
  const all = [...existing, ...projected].sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json(all)
}
