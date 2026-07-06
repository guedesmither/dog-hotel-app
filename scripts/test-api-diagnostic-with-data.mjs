import { PrismaClient } from '@prisma/client'
import http from 'http'

const p = new PrismaClient()
const cookieJar = []

function request(options, body) {
  return new Promise((resolve, reject) => {
    if (cookieJar.length) {
      options.headers = options.headers || {}
      options.headers.Cookie = cookieJar.join('; ')
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        if (res.headers['set-cookie']) {
          for (const c of res.headers['set-cookie']) {
            cookieJar.push(c.split(';')[0])
          }
        }
        resolve({ status: res.statusCode, headers: res.headers, body: data })
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function login() {
  const csrfRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/csrf',
    method: 'GET',
  })
  const csrfData = JSON.parse(csrfRes.body)
  const csrfToken = csrfData.csrfToken

  const form = new URLSearchParams({
    email: 'admin@petday.com',
    password: 'admin123',
    csrfToken,
    callbackUrl: '/',
    redirect: 'false',
  })

  await request(
    {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/callback/credentials',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
    form.toString()
  )
}

const testDogName = 'TEST_API_DIAGNOSTIC'
const testOwnerName = 'TEST_OWNER'

async function cleanup() {
  const dog = await p.dog.findFirst({ where: { name: testDogName } })
  if (dog) {
    await p.dailyRoster.deleteMany({ where: { dogId: dog.id } })
    await p.saleItem.deleteMany({ where: { sale: { dogId: dog.id } } })
    await p.sales.deleteMany({ where: { dogId: dog.id } })
    await p.dog.delete({ where: { id: dog.id } })
  }
  const product = await p.product.findFirst({ where: { name: 'TEST_API_MENSAL_2X' } })
  if (product) {
    await p.saleItem.deleteMany({ where: { productId: product.id } })
    await p.product.delete({ where: { id: product.id } })
  }
}

async function main() {
  await cleanup()

  const product = await p.product.create({
    data: {
      name: 'TEST_API_MENSAL_2X',
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

  // Add many June entries to simulate accumulation
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

  await login()
  console.log('Logged in')

  const diagRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/roster?reset=diagnostic&date=2026-07-13',
    method: 'DELETE',
  })

  console.log('Diagnostic status:', diagRes.status)
  const diagBody = JSON.parse(diagRes.body)
  console.log('Diagnostic body:', JSON.stringify(diagBody, null, 2))

  const addResult = diagBody.diagnostics?.find((d) => d.result === 'ADD')
  if (addResult) {
    console.log('✅ SUCCESS: Diagnostic API says dog should be ADDED to July 13')
  } else {
    console.log('❌ FAILURE: Diagnostic API says dog should be SKIPPED')
  }

  await cleanup()
  console.log('Cleanup done')
  await p.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
