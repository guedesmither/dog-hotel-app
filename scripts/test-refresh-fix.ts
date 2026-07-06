import { PrismaClient } from '@prisma/client'
import { refreshDay } from '../lib/roster-seed'

async function main() {
  const p = new PrismaClient()

  const testDogName = 'TEST_DOG_REFRESH_FIX'
  const testOwnerName = 'TEST_OWNER'

  async function cleanup() {
    const dog = await p.dog.findFirst({ where: { name: testDogName } })
    if (dog) {
      await p.dailyRoster.deleteMany({ where: { dogId: dog.id } })
      await p.saleItem.deleteMany({ where: { sale: { dogId: dog.id } } })
      await p.sales.deleteMany({ where: { dogId: dog.id } })
      await p.dog.delete({ where: { id: dog.id } })
    }
    const product = await p.product.findFirst({ where: { name: 'TEST_MENSAL_2X' } })
    if (product) {
      await p.saleItem.deleteMany({ where: { productId: product.id } })
      await p.product.delete({ where: { id: product.id } })
    }
  }

  await cleanup()

  const product = await p.product.create({
    data: {
      name: 'TEST_MENSAL_2X',
      category: 'CRECHE',
      price: 100,
    },
  })

  const dog = await p.dog.create({
    data: {
      name: testDogName,
      breed: 'Test',
      ownerName: testOwnerName,
      ownerPhone: '0000000000',
      serviceType: 'CRECHE',
      scheduledDays: 'segunda, quarta',
      isActive: true,
    },
  })

  const sale = await p.sales.create({
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

  console.log('Created dog:', dog.id)
  console.log('Created sale:', sale.id)

  await p.dailyRoster.create({
    data: {
      dogId: dog.id,
      date: '2026-07-06',
      type: 'CRECHE',
      source: 'AUTO',
    },
  })

  for (const date of ['2026-06-01', '2026-06-03', '2026-06-08', '2026-06-10', '2026-06-15', '2026-06-17', '2026-06-22', '2026-06-24']) {
    await p.dailyRoster.create({
      data: {
        dogId: dog.id,
        date,
        type: 'CRECHE',
        source: 'AUTO',
      },
    })
  }

  console.log('Added test entries for July 6 and June')

  const result = await refreshDay('2026-07-13')
  console.log('refreshDay result:', JSON.stringify(result, null, 2))

  const july13 = await p.dailyRoster.findMany({
    where: { date: '2026-07-13' },
    include: { dog: true },
  })

  const found = july13.find((e) => e.dogId === dog.id)
  if (found) {
    console.log('✅ SUCCESS: Test dog was replicated to July 13')
  } else {
    console.log('❌ FAILURE: Test dog was NOT replicated to July 13')
    console.log('July 13 entries:', JSON.stringify(july13.map((e) => e.dog?.name), null, 2))
  }

  await cleanup()
  console.log('Cleanup done')

  await p.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
