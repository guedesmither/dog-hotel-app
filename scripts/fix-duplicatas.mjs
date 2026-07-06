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

  // IDs a deletar (1 de cada par duplicado):
  // 2 — MARQUES 07/03 R$122 SEBÁ — manter 1, deletar o outro
  // 3 — ML 03/03 R$344.41 SEBÁ — manter 1, deletar o outro
  const toDelete = [
    { id: 'cmr9nr664004snhiginsp1ha2', desc: 'MARQUES 07/03 R$122 SEBÁ (duplicata)' },
    { id: 'cmr9nr4v8004mnhigndcyoyew', desc: 'MERCADO LIVRE 03/03 R$344.41 SEBÁ (duplicata)' },
  ]

  for (const { id, desc } of toDelete) {
    const r = await request(`/api/financeiro/${id}`, 'DELETE')
    if (r.status === 200 || r.status === 204) {
      console.log(`✅ Deletado: ${desc}`)
    } else {
      console.error(`❌ Erro ${r.status} ao deletar ${id}: ${r.body}`)
    }
  }

  console.log('\nVerificando total após limpeza...')
  const res = await request('/api/financeiro')
  const entries = JSON.parse(res.body)
  console.log(`Total de lançamentos: ${entries.length}`)
}

main().catch(console.error)
