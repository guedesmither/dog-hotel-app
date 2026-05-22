import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function getPrefix(serviceType: string): string {
  if (serviceType === 'Creche') return 'C'
  if (serviceType === 'Hotel') return 'H'
  if (serviceType === 'Daycare') return 'D'
  return ''
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const serviceType = searchParams.get('serviceType') || ''
  const prefix = getPrefix(serviceType)

  if (!prefix) return NextResponse.json({ matricula: null })

  const dogs = await prisma.dog.findMany({
    where: { matricula: { startsWith: prefix } },
    select: { matricula: true },
  })

  const numbers = dogs
    .map((d: { matricula: string | null }) => parseInt((d.matricula ?? '').slice(1)))
    .filter((n: number) => !isNaN(n) && n > 0)

  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
  const matricula = `${prefix}${String(next).padStart(3, '0')}`

  return NextResponse.json({ matricula })
}
