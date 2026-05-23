import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  if (secret !== 'aue-reset-2026') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const hash = await bcrypt.hash('Samboaue2026', 10)

  await prisma.user.updateMany({
    where: { email: 'guedesmither@gmail.com' },
    data: { password: hash, role: 'ADMIN' },
  })

  const users = await prisma.user.findMany({ select: { email: true, name: true, role: true } })
  return NextResponse.json({ ok: true, users })
}
