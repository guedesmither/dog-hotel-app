import http from 'http'
import https from 'https'

const BASE_URL = 'https://guedesmither-dog-hotel-app.vercel.app'
const cookieJar = []

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {},
    }
    if (cookieJar.length) {
      options.headers.Cookie = cookieJar.join('; ')
    }
    if (body) {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }

    const client = url.protocol === 'https:' ? https : http
    const req = client.request(options, (res) => {
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
  const csrfRes = await request('/api/auth/csrf')
  const csrfData = JSON.parse(csrfRes.body)
  const csrfToken = csrfData.csrfToken

  const form = new URLSearchParams({
    email: 'admin@petday.com',
    password: 'admin123',
    csrfToken,
    callbackUrl: '/',
    redirect: 'false',
  })

  await request('/api/auth/callback/credentials', 'POST', form.toString())
}

async function getDog(dogId) {
  const res = await request(`/api/dogs/${dogId}`)
  if (res.status !== 200) return null
  return JSON.parse(res.body)
}

async function getDogSales(dogId) {
  const res = await request(`/api/sales?dogId=${dogId}`)
  if (res.status !== 200) return null
  return JSON.parse(res.body)
}

async function main() {
  await login()

  const dogIds = [
    'ce2cdfaf33ce12de1125297', // Auê
    'ceae59216897b93a37ebe6e', // Cacau
    'c6ec19b8994e9f5495b3b3d', // Sambô
    'c13def422ee136780937e32', // Teobaldo
  ]

  for (const dogId of dogIds) {
    const dog = await getDog(dogId)
    if (!dog) continue
    console.log(`\n=== ${dog.name} (${dogId}) ===`)
    console.log('serviceType:', dog.serviceType)
    console.log('scheduledDays:', dog.scheduledDays)
    console.log('isActive:', dog.isActive)

    const sales = await getDogSales(dogId)
    const crecheSales = (sales || []).filter((s) =>
      s.saleType === 'MENSAL' || s.items?.some((i) => i.product?.category === 'CRECHE')
    )

    console.log('Total sales:', sales?.length || 0)
    console.log('CRECHE/MENSAL sales:', crecheSales.length)

    for (const s of crecheSales) {
      console.log(`  Sale ${s.id.slice(-6)}: type=${s.saleType}, status=${s.paymentStatus}, startDate=${s.startDate}, endDate=${s.endDate}, saleDate=${s.saleDate}, manualBaixa=${s.manualBaixa}`)
      console.log(`    Items:`, s.items?.map((i) => `${i.product?.category}:${i.product?.name}`).join(', '))
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
