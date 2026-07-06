import { PrismaClient } from '@prisma/client'

// Import diagnoseRefreshDay from the route file using a dynamic import
// Since the route file is TypeScript and imports Next.js, we can't run it directly.
// Instead, we replicate the diagnosis logic inline.

import { calcMensalPeriod, calcMensalAllowed, isCrecheSale, isDayScheduled } from '../lib/roster-seed'

const p = new PrismaClient()

const DAYS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const testDogName = 'TEST_DIAGNOSE_REFRESH_FIX'
const testOwnerName = 'TEST_OWNER'

async function cleanup() {
  const dog = await p.dog.findFirst({ where: { name: testDogName } })
  if (dog) {
    await p.dailyRoster.deleteMany({ where: { dogId: dog.id } })
    await p.saleItem.deleteMany({ where: { sale: { dogId: dog.id } } })
    await p.sales.deleteMany({ where: { dogId: dog.id } })
    await p.dog.delete({ where: { id: dog.id } })
  }
  const product = await p.product.findFirst({ where: { name: 'TEST_DIAGNOSE_MENSAL_2X' } })
  if (product) {
    await p.saleItem.deleteMany({ where: { productId: product.id } })
    await p.product.delete({ where: { id: product.id } })
  }
}

async function diagnoseRefreshDay(date: string) {
  const previousDate = new Date(date + 'T12:00:00Z')
  previousDate.setDate(previousDate.getDate() - 7)
  const previousDateStr = previousDate.toISOString().split('T')[0]
  const targetDateObj = new Date(date + 'T12:00:00Z')

  const previousEntries = await p.dailyRoster.findMany({
    where: { date: previousDateStr },
    include: { dog: true },
    orderBy: { dog: { name: 'asc' } },
  })

  const diagnostics: any[] = []

  for (const entry of previousEntries) {
    const dog = entry.dog
    if (!dog || !dog.isActive) {
      diagnostics.push({
        dogId: entry.dogId,
        name: dog?.name || '?',
        type: entry.type,
        result: 'SKIP',
        reason: !dog ? 'cão não encontrado' : 'cão inativo',
      })
      continue
    }

    const existing = await p.dailyRoster.findFirst({
      where: { dogId: entry.dogId, date },
    })
    if (existing) {
      diagnostics.push({
        dogId: entry.dogId,
        name: dog.name,
        type: entry.type,
        result: 'SKIP',
        reason: 'já existe no dia alvo',
      })
      continue
    }

    if (entry.type === 'CRECHE') {
      if (dog.serviceType !== 'CRECHE') {
        diagnostics.push({
          dogId: entry.dogId,
          name: dog.name,
          type: entry.type,
          result: 'SKIP',
          reason: `serviceType é ${dog.serviceType || 'vazio'}, não CRECHE`,
        })
        continue
      }
      if (!isDayScheduled(dog.scheduledDays, targetDateObj.getDay())) {
        diagnostics.push({
          dogId: entry.dogId,
          name: dog.name,
          type: entry.type,
          result: 'SKIP',
          reason: `não é dia programado. scheduledDays="${dog.scheduledDays || ''}" dia=${DAYS_PT[targetDateObj.getDay()]}`,
        })
        continue
      }

      const activeSales = await p.sales.findMany({
        where: {
          dogId: entry.dogId,
          OR: [{ saleType: 'MENSAL' }, { items: { some: { product: { category: 'CRECHE' } } } }],
          paymentStatus: { in: ['PAGO', 'PENDENTE', 'AGENDADO', 'PROGRAMADA'] },
          manualBaixa: false,
        },
        include: { items: { include: { product: true } } },
      })

      if (activeSales.length === 0) {
        diagnostics.push({
          dogId: entry.dogId,
          name: dog.name,
          type: entry.type,
          result: 'SKIP',
          reason: 'nenhuma venda CRECHE/MENSAL ativa',
        })
        continue
      }

      const saleDetails: any[] = []
      let added = false
      for (const sale of activeSales) {
        if (!isCrecheSale(sale)) {
          saleDetails.push({ saleId: sale.id.slice(-6), reason: 'não é venda creche' })
          continue
        }
        const period = calcMensalPeriod(sale)
        if (!period) {
          saleDetails.push({ saleId: sale.id.slice(-6), reason: 'sem período válido' })
          continue
        }
        if (targetDateObj < period.start || targetDateObj > period.end) {
          saleDetails.push({
            saleId: sale.id.slice(-6),
            reason: `fora do período: ${period.start.toISOString().split('T')[0]} a ${period.end.toISOString().split('T')[0]}`,
          })
          continue
        }

        const cap = await calcMensalAllowed(sale, dog, date)
        if (cap.allowed !== Infinity && cap.used >= cap.allowed) {
          saleDetails.push({
            saleId: sale.id.slice(-6),
            reason: `limite atingido: ${cap.used}/${cap.allowed} dias usados`,
          })
          continue
        }

        diagnostics.push({
          dogId: entry.dogId,
          name: dog.name,
          type: entry.type,
          result: 'ADD',
          reason: `venda ${sale.id.slice(-6)} válida (${cap.used}/${cap.allowed} dias usados)`,
          saleDetails,
        })
        added = true
        break
      }

      if (!added) {
        diagnostics.push({
          dogId: entry.dogId,
          name: dog.name,
          type: entry.type,
          result: 'SKIP',
          reason: 'nenhuma venda creche válida para o dia',
          saleDetails,
        })
      }
    }
  }

  return { date, previousDate: previousDateStr, totalPrevious: previousEntries.length, diagnostics }
}

async function main() {
  await cleanup()

  const product = await p.product.create({
    data: {
      name: 'TEST_DIAGNOSE_MENSAL_2X',
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

  await p.dailyRoster.create({
    data: {
      dogId: dog.id,
      date: '2026-07-06',
      type: 'CRECHE',
      source: 'AUTO',
    },
  })

  // Add many June entries to simulate accumulation that would break old logic
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

  console.log('Created test data')

  const diag = await diagnoseRefreshDay('2026-07-13')
  console.log('Diagnosis:', JSON.stringify(diag, null, 2))

  const addResult = diag.diagnostics.find((d) => d.result === 'ADD')
  if (addResult) {
    console.log('✅ SUCCESS: Diagnosis says dog should be ADDED to July 13')
  } else {
    console.log('❌ FAILURE: Diagnosis says dog should be SKIPPED')
  }

  await cleanup()
  console.log('Cleanup done')
  await p.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
