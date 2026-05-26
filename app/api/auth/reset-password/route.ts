import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

// POST /api/auth/reset-password
// Two modes:
// 1. { userId } — admin generates a reset token → returns the reset URL
// 2. { token, newPassword } — user submits new password with their token

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Mode 1: admin generates token
  if (body.userId) {
    const session = await getServerSession(authOptions)
    const role = (session?.user as { role?: string })?.role
    if (!session || (role !== 'ADMIN' && role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const token = randomBytes(32).toString('hex')
    const exp = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    await prisma.user.update({
      where: { id: body.userId },
      data: { resetToken: token, resetTokenExp: exp },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'https://guedesmither-dog-hotel-app.vercel.app'
    return NextResponse.json({ url: `${baseUrl}/reset-password?token=${token}` })
  }

  // Mode 2: user resets password
  if (body.token && body.newPassword) {
    if (body.newPassword.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: body.token,
        resetTokenExp: { gt: new Date() },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(body.newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExp: null },
    })

    return NextResponse.json({ ok: true, name: user.name })
  }

  return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
}

// GET /api/auth/reset-password?token=xxx — validate token
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token ausente' }, { status: 400 })

  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExp: { gt: new Date() } },
    select: { id: true, name: true, email: true },
  })

  if (!user) return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 400 })
  return NextResponse.json({ valid: true, name: user.name, email: user.email })
}
