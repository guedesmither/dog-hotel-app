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

  const toFix = entries.filter(e => e.category === 'ADIANTAMENTO SÓCIO')
  console.log(`Atualizando ${toFix.length} lançamentos para PROLABORE...`)

  let ok = 0
  for (const e of toFix) {
    const payload = {
      type: e.type, date: e.date.split('T')[0], amount: e.amount,
      account: e.account, supplier: e.supplier, description: e.description,
      category: 'PROLABORE', notes: e.notes,
    }
    const r = await request(`/api/financeiro/${e.id}`, 'PUT', payload, 'application/json')
    if (r.status === 200) { ok++; process.stdout.write('.') }
    else console.error(`\nERRO ${r.status}: ${r.body}`)
  }
  console.log(`\nConcluído: ${ok} atualizados.`)
}
main().catch(console.error)
