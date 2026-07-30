import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role === 'TUTOR') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const month = new URL(req.url).searchParams.get('month')
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Parâmetro month inválido' }, { status: 400 })
  }

  const scenario = await prisma.forecastScenario.findUnique({ where: { month } })
  if (!scenario) return NextResponse.json({ growthInputs: null, crecheOverrides: null })

  return NextResponse.json({
    growthInputs: JSON.parse(scenario.growthInputs),
    crecheOverrides: JSON.parse(scenario.crecheOverrides),
    updatedAt: scenario.updatedAt,
  })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role === 'TUTOR') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { month, growthInputs, crecheOverrides } = body || {}
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Parâmetro month inválido' }, { status: 400 })
  }

  const scenario = await prisma.forecastScenario.upsert({
    where: { month },
    create: {
      month,
      growthInputs: JSON.stringify(growthInputs ?? {}),
      crecheOverrides: JSON.stringify(crecheOverrides ?? {}),
    },
    update: {
      growthInputs: JSON.stringify(growthInputs ?? {}),
      crecheOverrides: JSON.stringify(crecheOverrides ?? {}),
    },
  })

  return NextResponse.json({ ok: true, updatedAt: scenario.updatedAt })
}
