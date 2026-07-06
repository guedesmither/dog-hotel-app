import http from 'http'
import https from 'https'

const BASE_URL = 'https://guedesmither-dog-hotel-app.vercel.app'
const cookieJar = []

function request(path, method = 'GET', body = null, contentType = 'application/x-www-form-urlencoded') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null
    const options = { hostname: url.hostname, port: 443, path: url.pathname + url.search, method, headers: {} }
    if (cookieJar.length) options.headers.Cookie = cookieJar.join('; ')
    if (bodyStr) { options.headers['Content-Type'] = contentType; options.headers['Content-Length'] = Buffer.byteLength(bodyStr) }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        if (res.headers['set-cookie']) for (const c of res.headers['set-cookie']) {
          const pair = c.split(';')[0]; const name = pair.split('=')[0]
          const idx = cookieJar.findIndex(x => x.startsWith(name + '=')); idx >= 0 ? cookieJar[idx] = pair : cookieJar.push(pair)
        }
        resolve({ status: res.statusCode, body: data })
      })
    })
    req.on('error', reject); if (bodyStr) req.write(bodyStr); req.end()
  })
}

async function login() {
  const { body } = await request('/api/auth/csrf')
  const { csrfToken } = JSON.parse(body)
  const form = new URLSearchParams({ email: 'admin@petday.com', password: 'admin123', csrfToken, callbackUrl: '/', redirect: 'false' })
  await request('/api/auth/callback/credentials', 'POST', form.toString())
}

async function main() {
  await login()
  const res = await request('/api/financeiro')
  const entries = JSON.parse(res.body)

  // Agrupar por período
  const byPeriod = {}
  for (const e of entries) {
    if (!byPeriod[e.period]) byPeriod[e.period] = []
    byPeriod[e.period].push(e)
  }

  console.log(`\nTotal: ${entries.length} lançamentos\n`)
  for (const [period, list] of Object.entries(byPeriod).sort()) {
    const saidas = list.filter(e => e.type === 'S').reduce((s, e) => s + e.amount, 0)
    const entradas = list.filter(e => e.type === 'E').reduce((s, e) => s + e.amount, 0)
    console.log(`${period}: ${list.length} lançamentos | E: R$${entradas.toFixed(2)} | S: R$${saidas.toFixed(2)}`)
  }

  console.log('\nCategorias presentes:')
  const cats = {}
  for (const e of entries) cats[e.category] = (cats[e.category] || 0) + 1
  for (const [c, n] of Object.entries(cats).sort()) console.log(`  ${c}: ${n}`)
}
main().catch(console.error)
