// Reclassifica lançamentos importados com categoria errada
// Regras:
//   APORTE SÓCIOS + type=E + supplier=SEBASTIAO GUEDES → APORTE NICE
//   APORTE SÓCIOS + type=E + supplier=INFINITEPAY (depósito/cashback) → ENTRADA CAIXA
//   APORTE SÓCIOS + type=E (clientes) → ENTRADA CAIXA

import http from 'http'
import https from 'https'

const BASE_URL = 'https://guedesmither-dog-hotel-app.vercel.app'
const EMAIL = 'admin@petday.com'
const PASSWORD = 'admin123'

const cookieJar = []

function request(path, method = 'GET', body = null, contentType = 'application/x-www-form-urlencoded') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {},
    }
    if (cookieJar.length) options.headers.Cookie = cookieJar.join('; ')
    if (bodyStr) {
      options.headers['Content-Type'] = contentType
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr)
    }
    const client = url.protocol === 'https:' ? https : http
    const req = client.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        if (res.headers['set-cookie']) {
          for (const c of res.headers['set-cookie']) {
            const pair = c.split(';')[0]
            const name = pair.split('=')[0]
            const idx = cookieJar.findIndex(x => x.startsWith(name + '='))
            if (idx >= 0) cookieJar[idx] = pair
            else cookieJar.push(pair)
          }
        }
        resolve({ status: res.statusCode, headers: res.headers, body: data })
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

async function login() {
  const csrfRes = await request('/api/auth/csrf')
  const { csrfToken } = JSON.parse(csrfRes.body)
  const form = new URLSearchParams({ email: EMAIL, password: PASSWORD, csrfToken, callbackUrl: '/', redirect: 'false' })
  await request('/api/auth/callback/credentials', 'POST', form.toString())
}

function newCategory(entry) {
  if (entry.category !== 'APORTE SÓCIOS') return null // já está certo

  if (entry.type === 'E') {
    // Aportes reais de capital: Sebastião (grandes transferências)
    if (entry.supplier === 'SEBASTIAO GUEDES') return 'APORTE NICE'
    // Depósitos InfinityPay, cashback, rendimento CDB = entrada de caixa
    if (entry.supplier === 'INFINITEPAY') return 'ENTRADA CAIXA'
    // Todos os outros Pix de clientes = entrada de caixa (conferência com extrato)
    return 'ENTRADA CAIXA'
  }

  return null
}

async function main() {
  await login()

  const res = await request('/api/financeiro')
  if (res.status === 401) { console.error('Não autenticado'); process.exit(1) }

  const entries = JSON.parse(res.body)
  console.log(`Total de lançamentos: ${entries.length}`)

  const toFix = entries.filter(e => newCategory(e) !== null)
  console.log(`Lançamentos para reclassificar: ${toFix.length}`)

  let ok = 0, err = 0
  for (const e of toFix) {
    const cat = newCategory(e)
    const payload = {
      type: e.type,
      date: e.date.split('T')[0],
      amount: e.amount,
      account: e.account,
      supplier: e.supplier,
      description: e.description,
      category: cat,
      notes: e.notes,
    }
    const r = await request(`/api/financeiro/${e.id}`, 'PUT', payload, 'application/json')
    if (r.status === 200) {
      ok++
      process.stdout.write('.')
    } else {
      console.error(`\nERRO ${r.status} em ${e.id}: ${r.body}`)
      err++
    }
  }

  console.log(`\nConcluído: ${ok} atualizados, ${err} erros.`)
}

main().catch(console.error)
