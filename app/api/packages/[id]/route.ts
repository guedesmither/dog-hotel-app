import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  let action: unknown
  try {
    const body = await req.json()
    action = body && typeof body === 'object'
      ? (body as { action?: unknown }).action
      : undefined
  } catch {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  if (action !== 'close' && action !== 'reopen') {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  const result = await prisma.$transaction(async tx => {
    const pkg = await tx.package.findUnique({ where: { id: params.id } })
    if (!pkg) return null

    if (action === 'close') {
      const today = new Date().toISOString().split('T')[0]
      const removed = await tx.dailyRoster.deleteMany({
        where: { packageId: pkg.id, date: { gt: today }, present: null },
      })

      await tx.package.update({
        where: { id: pkg.id },
        data: {
          isActive: false,
          remainingDays: Math.min(pkg.remainingDays + removed.count, pkg.totalDays),
        },
      })

      if (pkg.saleId) {
        await tx.sales.update({
          where: { id: pkg.saleId },
          data: { manualBaixa: true, manualBaixaDate: new Date() },
        })
      }

      return { success: true, removedFutureDays: removed.count }
    }

    if (pkg.saleId) {
      await tx.sales.update({
        where: { id: pkg.saleId },
        data: { manualBaixa: false, manualBaixaDate: null },
      })
    }

    await tx.package.update({
      where: { id: pkg.id },
      data: { isActive: pkg.remainingDays > 0 },
    })

    return { success: true }
  })

  if (!result) return NextResponse.json({ error: 'Pacote não encontrado' }, { status: 404 })
  return NextResponse.json(result)
}
