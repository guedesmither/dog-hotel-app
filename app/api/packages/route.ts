import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/packages - Create a new package
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { dogId, packageType } = data

    if (!dogId || !packageType) {
      return NextResponse.json({ error: 'dogId and packageType are required' }, { status: 400 })
    }

    // Validate package type
    if (packageType !== 'AVULSO_5' && packageType !== 'AVULSO_10') {
      return NextResponse.json({ error: 'Invalid package type' }, { status: 400 })
    }

    // Get package details from price table
    const yearMonth = new Date().toISOString().slice(0, 7)
    const priceEntry = await prisma.priceTable.findFirst({
      where: {
        yearMonth,
        priceType: 'PACKAGE',
        packageType,
      },
    })

    if (!priceEntry) {
      return NextResponse.json({ error: 'Package price not found' }, { status: 404 })
    }

    const totalDays = packageType === 'AVULSO_5' ? 5 : 10
    const pricePaid = priceEntry.packagePrice || 0

    // Calculate expiry date (6 months from now)
    const purchaseDate = new Date()
    const expiryDate = new Date()
    expiryDate.setMonth(expiryDate.getMonth() + 6)

    // Create package
    const pkg = await prisma.package.create({
      data: {
        dogId,
        packageType,
        totalDays,
        remainingDays: totalDays,
        purchaseDate,
        expiryDate,
        pricePaid,
      },
    })

    return NextResponse.json(pkg)
  } catch (error) {
    console.error('Error creating package:', error)
    return NextResponse.json({ error: 'Failed to create package' }, { status: 500 })
  }
}

// GET /api/packages - List packages for a dog (and siblings under same owner)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dogId = searchParams.get('dogId')

    if (!dogId) {
      return NextResponse.json({ error: 'dogId is required' }, { status: 400 })
    }

    const dog = await prisma.dog.findUnique({
      where: { id: dogId },
      select: { ownerCpf: true }
    })

    if (!dog) {
      return NextResponse.json({ error: 'Dog not found' }, { status: 404 })
    }

    // Fetch packages linked to this dog OR to any sibling dog with the same owner (same CPF)
    const packages = await prisma.package.findMany({
      where: {
        isActive: true,
        remainingDays: { gt: 0 },
        expiryDate: { gte: new Date() },
        OR: [
          { dogId },
          ...(dog.ownerCpf ? [{ dog: { ownerCpf: dog.ownerCpf } }] : [])
        ]
      },
      include: {
        sale: { select: { manualBaixa: true } },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const legacyPackages = packages
      .filter(pkg => !pkg.saleId)
      .sort((a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime())
    const packageDogIds = Array.from(new Set(legacyPackages.map(pkg => pkg.dogId)))
    const linkedSaleIds = packages.flatMap(pkg => pkg.saleId ? [pkg.saleId] : [])
    const packageSales = packageDogIds.length > 0
      ? await prisma.sales.findMany({
          where: {
            dogId: { in: packageDogIds },
            saleType: 'PACOTE',
            ...(linkedSaleIds.length > 0 ? { id: { notIn: linkedSaleIds } } : {}),
          },
          select: {
            id: true,
            dogId: true,
            saleDate: true,
            finalPrice: true,
            manualBaixa: true,
            items: { select: { product: { select: { name: true } } } },
          },
          orderBy: { saleDate: 'asc' },
        })
      : []

    const legacyPackageSales = new Map<string, boolean>()
    const matchedSaleIds = new Set<string>()
    for (const pkg of legacyPackages) {
      const matches = packageSales
        .filter(sale => sale.dogId === pkg.dogId && !matchedSaleIds.has(sale.id))
        .map(sale => {
          const productName = sale.items[0]?.product?.name || ''
          const daysMatch = productName.match(/(\d+)\s*Dia/i)
          const saleDays = daysMatch ? parseInt(daysMatch[1], 10) : null
          const priceDifference = Math.abs(sale.finalPrice - pkg.pricePaid)
          const dateDifference = Math.abs(sale.saleDate.getTime() - pkg.purchaseDate.getTime())
          const compatible = saleDays === pkg.totalDays || priceDifference < 0.01
          return { sale, score: compatible ? dateDifference + priceDifference : Number.POSITIVE_INFINITY }
        })
        .sort((a, b) => a.score - b.score)

      const match = matches[0]
      if (match && Number.isFinite(match.score)) {
        matchedSaleIds.add(match.sale.id)
        legacyPackageSales.set(pkg.id, match.sale.manualBaixa)
      }
    }

    const visiblePackages = packages
      .filter(pkg => pkg.sale ? !pkg.sale.manualBaixa : !legacyPackageSales.get(pkg.id))
      .map(({ sale, ...pkg }) => pkg)

    return NextResponse.json(visiblePackages)
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
  }
}
