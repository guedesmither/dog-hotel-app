import { PrismaClient } from '@prisma/client'
import { refreshDay } from '../lib/roster-seed'

const p = new PrismaClient()

const testNames = Array.from({ length: 10 }, (_, i) => `TEST_REPLIC_0${i + 1}`)
const PRODUCT_NAME = 'TEST_REPLIC_MENSAL_2X'
const OWNER = 'TEST_OWNER'

async function cleanup() {
  for (const name of testNames) {
    const dog = await p.dog.findFirst({ where: { name } })
    if (dog) {
      await p.dailyRoster.deleteMany({ where: { dogId: dog.id } })
      await p.saleItem.deleteMany({ where: { sale: { dogId: dog.id } } })
      await p.sales.deleteMany({ where: { dogId: dog.id } })
      await p.dog.delete({ where: { id: dog.id } })
    }
  }
  const product = await p.product.findFirst({ where: { name: PRODUCT_NAME } })
  if (product) {
    await p.saleItem.deleteMany({ where: { productId: product.id } })
    await p.product.delete({ where: { id: product.id } })
  }
  await p.dailyRoster.deleteMany({ where: { date: { in: ['2026-07-06', '2026-07-13'] } } })
}

async function main() {
  await cleanup()

  const product = await p.product.create({
    data: {
      name: PRODUCT_NAME,
      category: 'CRECHE',
      price: 100,
    },
  })

  const dogs: string[] = []
  for (const name of testNames) {
    const dog = await p.dog.create({
      data: {
        name,
        breed: 'Test',
        ownerName: OWNER,
        ownerPhone: '0000000000',
        serviceType: 'CRECHE',
        scheduledDays: 'segunda, quarta',
        isActive: true,
      },
    })
    dogs.push(dog.id)

    await p.sales.create({
      data: {
        dogId: dog.id,
        saleType: 'MENSAL',
        saleDate: new Date('2026-04-22'),
        startDate: new Date('2026-04-22'),
        basePrice: 100,
        finalPrice: 100,
        paymentStatus: 'PAGO',
        manualBaixa: false,
        items: {
          create: {
            productId: product.id,
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100,
          },
        },
      },
    })
  }

  // Add all 10 dogs to July 6 manually
  for (const dogId of dogs) {
    await p.dailyRoster.create({
      data: {
        dogId,
        date: '2026-07-06',
        type: 'CRECHE',
        source: 'AUTO',
      },
    })
  }

  // Simulate heavy usage in previous months (would break old logic)
  for (const dogId of dogs) {
    for (const date of ['2026-06-01', '2026-06-03', '2026-06-08', '2026-06-10', '2026-06-15', '2026-06-17', '2026-06-22', '2026-06-24']) {
      await p.dailyRoster.create({
        data: {
          dogId,
          date,
          type: 'CRECHE',
          source: 'AUTO',
        },
      })
    }
  }

  console.log('Created 10 dogs with sales and July 6 entries + June usage')

  // Run refreshDay for July 13
  const result = await refreshDay('2026-07-13')
  console.log('refreshDay result:', JSON.stringify(result, null, 2))

  const july13 = await p.dailyRoster.findMany({
    where: { date: '2026-07-13' },
    include: { dog: { select: { name: true } } },
  })

  const foundNames = july13.map((e) => e.dog?.name).filter(Boolean)
  const missing = testNames.filter((n) => !foundNames.includes(n))

  console.log('July 13 entries:', foundNames.length)
  console.log('Missing dogs:', missing)

  if (missing.length === 0) {
    console.log('✅ SUCCESS: All 10 dogs replicated to July 13')
  } else {
    console.log('❌ FAILURE: Only', foundNames.length, 'of 10 dogs replicated')
  }

  await cleanup()
  console.log('Cleanup done')
  await p.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
