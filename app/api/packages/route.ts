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

// GET /api/packages - List packages for a dog
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dogId = searchParams.get('dogId')

    if (!dogId) {
      return NextResponse.json({ error: 'dogId is required' }, { status: 400 })
    }

    const packages = await prisma.package.findMany({
      where: {
        dogId,
        isActive: true,
        expiryDate: {
          gte: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(packages)
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
  }
}
