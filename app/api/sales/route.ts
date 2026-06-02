import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/sales - List all sales
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const yearMonth = searchParams.get('yearMonth') // Format: YYYY-MM
    const startDate = searchParams.get('startDate') // Format: YYYY-MM-DD
    const endDate = searchParams.get('endDate') // Format: YYYY-MM-DD
    const statusFilter = searchParams.get('status') // PAGO, PENDENTE, AGENDADO, PROGRAMADA
    const serviceStatusFilter = searchParams.get('serviceStatus') // AGENDADO, ANDAMENTO, OK
    const saleTypeFilter = searchParams.get('saleType') // MENSAL, AVULSO, HOTEL, PACOTE
    const searchQuery = searchParams.get('search') // Search by dog name or owner
    const dogIdFilter = searchParams.get('dogId') // Filter by exact dog ID

    const where: any = {}
    
    if (yearMonth) {
      const monthStart = new Date(`${yearMonth}-01T00:00:00.000Z`)
      const monthEnd = new Date(`${yearMonth}-31T23:59:59.999Z`)
      where.saleDate = {
        gte: monthStart,
        lte: monthEnd,
      }
    }
    
    if (startDate && endDate) {
      where.saleDate = {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      }
    }

    if (statusFilter) {
      // AGENDADO filter includes both AGENDADO and PROGRAMADA (same concept)
      // Exclude items already manually completed (manualBaixa = true)
      if (statusFilter === 'AGENDADO') {
        where.paymentStatus = { in: ['AGENDADO', 'PROGRAMADA'] }
        where.manualBaixa = false
      } else if (statusFilter === 'PENDENTE') {
        // Include AGENDADO/PROGRAMADA too — they auto-transition to PENDENTE
        // when service is delivered. Post-filter applied after calculation.
        where.paymentStatus = { in: ['PENDENTE', 'AGENDADO', 'PROGRAMADA'] }
      } else {
        where.paymentStatus = statusFilter
      }
    }

    if (saleTypeFilter) {
      where.saleType = saleTypeFilter
    }

    if (dogIdFilter) {
      where.dogId = dogIdFilter
    } else if (searchQuery) {
      where.OR = [
        { dog: { name: { contains: searchQuery } } },
        { dog: { ownerName: { contains: searchQuery } } },
      ]
    }

    const sales = await prisma.sales.findMany({
      where,
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            ownerName: true,
            ownerCpf: true,
            matricula: true,
            photoUrl: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { saleDate: 'desc' },
    })

    // Compute serviceStatus for each sale
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const salesWithPackages = await Promise.all(sales.map(async (sale) => {
      // States:
      // OK        = serviço já realizado (entrega concluída, sem pendência nossa)
      // AGENDADO  = comprado/previsto, ainda não iniciado ou não utilizado
      // ANDAMENTO = em fase de utilização ativa
      // X/Y       = pacote de diárias (X utilizados / Y comprados)
      let serviceStatus = 'AGENDADO'
      let effectivePaymentStatus = sale.paymentStatus

      try {
        if (sale.manualBaixa) {
          serviceStatus = 'OK'
        } else if (sale.saleType === 'PACOTE' && sale.dogId) {
          const startD = sale.startDate ? new Date(sale.startDate) : null
          if (startD) startD.setHours(0, 0, 0, 0)
          if (startD && startD > today) {
            // Package purchased but not yet started
            serviceStatus = 'AGENDADO'
            return { ...sale, serviceStatus }
          }
          const packages = await prisma.package.findMany({
            where: { dogId: sale.dogId, isActive: true, expiryDate: { gte: new Date() } },
            orderBy: { createdAt: 'desc' },
          })
          const pkg = packages[0]
          if (pkg) {
            // Fix negative remainingDays calculation
            const effectiveRemaining = Math.max(0, pkg.remainingDays)
            const daysUsed = pkg.totalDays - effectiveRemaining
            serviceStatus = `${daysUsed}/${pkg.totalDays}`
          } else {
            // No Package record — count AVULSO roster entries in the sale window as usage
            const windowStart = sale.startDate
              ? sale.startDate.toISOString().split('T')[0]
              : sale.saleDate.toISOString().split('T')[0]
            const windowEnd = sale.endDate ? sale.endDate.toISOString().split('T')[0] : undefined
            const usedDays = await prisma.dailyRoster.count({
              where: {
                dogId: sale.dogId!,
                date: { gte: windowStart, ...(windowEnd ? { lte: windowEnd } : {}) },
              },
            })
            // Derive totalDays from product name e.g. "Pacote 10 Dias" → 10
            const productName: string = (sale as any).items?.[0]?.product?.name || ''
            const daysMatch = productName.match(/(\d+)\s*Dia/i)
            const totalDays = daysMatch ? parseInt(daysMatch[1], 10) : 10
            serviceStatus = usedDays > 0 ? `${usedDays}/${totalDays}` : 'AGENDADO'
          }
          return { ...sale, packages, serviceStatus }
        } else {
          const startD = sale.startDate ? new Date(sale.startDate) : null
          const endD   = sale.endDate   ? new Date(sale.endDate)   : null
          if (startD) startD.setHours(0, 0, 0, 0)
          if (endD)   endD.setHours(23, 59, 59, 999)

          if (endD && endD < today) {
            // Period ended — service delivered
            serviceStatus = 'OK'
          } else if (startD && startD > today) {
            // Not started yet — forecast
            serviceStatus = 'AGENDADO'
          } else if (sale.saleType === 'HOTEL') {
            // HOTEL: check if dog is present in roster today
            if (sale.dogId) {
              const rosterEntry = await prisma.dailyRoster.findFirst({
                where: { dogId: sale.dogId, date: today.toISOString().split('T')[0], present: true }
              })
              serviceStatus = rosterEntry ? 'ANDAMENTO' : 'AGENDADO'
            } else {
              serviceStatus = 'AGENDADO'
            }
          } else if (sale.saleType === 'MENSAL') {
            // MENSAL: Active window — in use (based on dates)
            serviceStatus = 'ANDAMENTO'
          } else {
            // AVULSO / SERVICO without dates or current date → still to be used
            serviceStatus = 'AGENDADO'
          }
        }

        // Auto-transition: PROGRAMADA/AGENDADO → PENDENTE when service is delivered (OK or ANDAMENTO)
        if (
          (serviceStatus === 'ANDAMENTO' || serviceStatus === 'OK') &&
          (sale.paymentStatus === 'PROGRAMADA' || sale.paymentStatus === 'AGENDADO') &&
          !sale.isExempt
        ) {
          await prisma.sales.update({
            where: { id: sale.id },
            data: { paymentStatus: 'PENDENTE' },
          })
          effectivePaymentStatus = 'PENDENTE'
        }
      } catch (error) {
        console.error('Erro ao calcular serviceStatus:', error)
      }

      return { ...sale, paymentStatus: effectivePaymentStatus ?? sale.paymentStatus, serviceStatus }
    }))

    // Post-filter by paymentStatus when PENDENTE (since we broadened the DB query)
    const postPaymentFiltered = (statusFilter === 'PENDENTE')
      ? salesWithPackages.filter((s: any) => s.paymentStatus === 'PENDENTE')
      : salesWithPackages

    // Apply serviceStatus filter post-calculation (since it's computed, not stored)
    const filtered = serviceStatusFilter
      ? postPaymentFiltered.filter((s: any) => {
          const st: string = s.serviceStatus ?? ''
          if (serviceStatusFilter === 'ANDAMENTO') {
            // X/Y pattern (e.g. "3/10") also counts as ANDAMENTO
            return st === 'ANDAMENTO' || /^\d+\/\d+$/.test(st)
          }
          return st === serviceStatusFilter
        })
      : postPaymentFiltered

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Erro ao buscar vendas:', error)
    return NextResponse.json({ error: 'Erro ao buscar vendas' }, { status: 500 })
  }
}

// POST /api/sales - Create a new sale with items
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const role = (session.user as { role: string }).role
  if (role === 'TUTOR' || role === 'MONITOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await req.json()
    console.log('=== Criando nova venda ===')
    console.log('Body:', body)
    
    const {
      saleDate,
      finalPrice,
      discount,
      isExempt,
      amountReceived,
      paymentStatus,
      paymentDate,
      paymentMethod,
      paymentFee,
      notes,
      dogId,
      items,
      saleStartDate,
      saleEndDate,
    } = body

    console.log('Dados da venda:', {
      saleDate,
      finalPrice,
      discount,
      amountReceived,
      paymentStatus,
      paymentDate,
      paymentMethod,
      paymentFee,
      notes,
      dogId,
      items,
    })

    // Determine saleType based on items - fetch product categories from DB
    let saleType = 'AVULSO'
    if (items && items.length > 0) {
      // Fetch products to determine category
      const productIds = items.map((item: any) => item.productId).filter(Boolean)
      if (productIds.length > 0) {
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, category: true },
        })
        const productMap = new Map(products.map(p => [p.id, p.category]))
        
        // Check first item's product category
        const firstItemCategory = productMap.get(items[0].productId) || 'AVULSO'
        if (firstItemCategory === 'HOTEL') {
          saleType = 'HOTEL'
        } else if (firstItemCategory === 'CRECHE') {
          saleType = 'MENSAL'
        } else if (firstItemCategory === 'PACOTE') {
          saleType = 'PACOTE'
        }
      }
    }

    const sale = await prisma.sales.create({
      data: {
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        finalPrice: finalPrice || 0,
        basePrice: finalPrice || 0, // basePrice equals finalPrice initially
        discount: discount || 0,
        isExempt: isExempt || false,
        amountReceived: (paymentStatus === 'PENDENTE' || paymentStatus === 'PROGRAMADA') ? null : (amountReceived ?? finalPrice ?? 0),
        paymentStatus: paymentStatus || 'PAGO',
        paymentDate: paymentDate ? (typeof paymentDate === 'string' ? paymentDate : new Date(paymentDate).toISOString()) : null,
        paymentMethod: paymentMethod || null,
        paymentFee: paymentFee || 0,
        notes: notes || null,
        dogId: dogId || null,
        saleType: saleType,
        startDate: saleStartDate ? new Date(saleStartDate) : null,
        endDate: saleEndDate ? new Date(saleEndDate) : null,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            ownerName: true,
            ownerCpf: true,
            matricula: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    console.log('Venda criada com sucesso:', sale.id)

    // Auto-create Package record for PACOTE sales
    if (saleType === 'PACOTE' && dogId) {
      try {
        const productName: string = (sale as any).items?.[0]?.product?.name || ''
        const daysMatch = productName.match(/(\d+)\s*Dia/i)
        const totalDays = daysMatch ? parseInt(daysMatch[1]) : 10
        const expiryDate = saleEndDate ? new Date(saleEndDate) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d })()
        await prisma.package.create({
          data: {
            dogId,
            packageType: `AVULSO_${totalDays}`,
            totalDays,
            remainingDays: totalDays,
            purchaseDate: saleDate ? new Date(saleDate) : new Date(),
            expiryDate,
            pricePaid: finalPrice || 0,
            isActive: true,
          },
        })
        console.log('Package criado automaticamente para venda PACOTE:', sale.id)
      } catch (pkgErr) {
        console.error('Erro ao criar package automático (venda registrada normalmente):', pkgErr)
      }
    }

    // Auto-create Stay (agendamento) for HOTEL sales with dates defined
    if (saleType === 'HOTEL' && dogId && saleStartDate) {
      try {
        // Close any active stay for this dog
        await prisma.stay.updateMany({
          where: { dogId, active: true },
          data: { active: false, checkOut: new Date() },
        })
        await prisma.stay.create({
          data: {
            dogId,
            active: false,
            isScheduled: true,
            scheduledCheckIn: new Date(saleStartDate),
            scheduledCheckOut: saleEndDate ? new Date(saleEndDate) : new Date(saleStartDate),
            notes: `Agendamento criado automaticamente a partir da venda #${sale.id.slice(-6)}`,
          },
        })
        console.log('Stay criado automaticamente para venda HOTEL:', sale.id)
      } catch (stayErr) {
        console.error('Erro ao criar stay automático (venda registrada normalmente):', stayErr)
      }
    }

    return NextResponse.json(sale)
  } catch (error: any) {
    console.error('Erro ao criar venda:', error)
    console.error('Detalhes do erro:', error.message)
    console.error('Stack:', error.stack)
    return NextResponse.json({ error: 'Erro ao criar venda', details: error.message }, { status: 500 })
  }
}
