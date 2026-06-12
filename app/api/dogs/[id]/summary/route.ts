import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  const dogId = params.id
  
  // MONITOR não deve ver dados financeiros/sensíveis
  const isMonitor = role === 'MONITOR'

  // Se for monitor, busca apenas dados básicos do cão sem informações financeiras
  if (isMonitor) {
    const dog = await prisma.dog.findUnique({
      where: { id: dogId },
      select: {
        id: true,
        name: true,
        breed: true,
        photoUrl: true,
        isActive: true,
        matricula: true,
        serviceType: true,
        scheduledDays: true,
      },
    })
    
    if (!dog) return NextResponse.json({ error: 'Cão não encontrado' }, { status: 404 })
    
    // Retorna apenas dados básicos, sem vendas, pacotes, valores, etc.
    return NextResponse.json({
      dog,
      sales: [],
      replacements: [],
      packages: [],
      rosterRecent: [],
      stats: null,
      _restricted: true,
    })
  }

  const [dog, sales, replacements, packages, rosterRecent] = await Promise.all([
    prisma.dog.findUnique({
      where: { id: dogId },
      select: {
        id: true,
        name: true,
        ownerName: true,
        ownerPhone: true,
        ownerCpf: true,
        matricula: true,
        breed: true,
        photoUrl: true,
        isActive: true,
      },
    }),
    prisma.sales.findMany({
      where: { dogId },
      orderBy: { saleDate: 'desc' },
      include: {
        items: {
          include: { product: { select: { name: true, category: true } } },
        },
      },
    }),
    prisma.replacement.findMany({
      where: { dogId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.package.findMany({
      where: { dogId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.dailyRoster.findMany({
      where: { dogId },
      orderBy: { date: 'desc' },
      take: 30,
    }),
  ])

  if (!dog) return NextResponse.json({ error: 'Cão não encontrado' }, { status: 404 })

  const totalSpent = sales.reduce((sum: number, s: any) => sum + s.finalPrice, 0)
  const totalPaid = sales.filter((s: any) => s.paymentStatus === 'PAGO').reduce((sum: number, s: any) => sum + (s.amountReceived ?? 0), 0)
  const totalPending = sales.filter((s: any) => s.paymentStatus !== 'PAGO').reduce((sum: number, s: any) => sum + s.finalPrice, 0)
  const pendingReplacements = replacements.filter((r: any) => r.status === 'PENDING').length

  return NextResponse.json({
    dog,
    sales,
    replacements,
    packages,
    rosterRecent,
    stats: { totalSpent, totalPaid, totalPending, salesCount: sales.length, pendingReplacements },
  })
}
