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

function fmt(v) { return `R$${v.toFixed(2)}` }
function fmtDate(d) { return new Date(d).toLocaleDateString('pt-BR') }
function round2(v) { return Math.round(v * 100) / 100 }

async function main() {
  await login()
  const res = await request('/api/financeiro')
  const entries = JSON.parse(res.body)
  console.log(`Total: ${entries.length} lançamentos\n`)

  // Agrupa por fornecedor + período (mês/ano) + tipo
  const groups = {}
  for (const e of entries) {
    if (!e.supplier) continue
    const sup = e.supplier.toUpperCase().trim()
    const period = e.date.split('T')[0].substring(0, 7) // YYYY-MM
    const key = `${sup}|${period}|${e.type}`
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  }

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('ANÁLISE: lançamento individual = soma (ou múltiplo) de outros')
  console.log('(mesmo fornecedor, mesmo mês, mesmo tipo)')
  console.log('═══════════════════════════════════════════════════════════════\n')

  let found = 0

  for (const [key, list] of Object.entries(groups)) {
    if (list.length < 2) continue

    const [sup, period, type] = key.split('|')
    const sorted = [...list].sort((a, b) => b.amount - a.amount)

    // Para cada lançamento maior, verificar se ele é soma de outros menores
    for (let i = 0; i < sorted.length; i++) {
      const big = sorted[i]
      const others = sorted.filter((_, idx) => idx !== i)

      // Tenta todas as combinações de 2+ lançamentos menores que somam ao grande
      const otherAmounts = others.map(e => round2(e.amount))
      const bigAmt = round2(big.amount)

      // Subconjuntos de tamanho 2 a N
      for (let size = 2; size <= Math.min(others.length, 6); size++) {
        const combos = getCombinations(others, size)
        for (const combo of combos) {
          const sum = round2(combo.reduce((s, e) => s + e.amount, 0))
          if (Math.abs(sum - bigAmt) < 0.02) {
            found++
            console.log(`🔍 SUSPEITO — ${sup} | ${period} | tipo:${type}`)
            console.log(`   GRANDE: id:${big.id} | ${fmtDate(big.date)} | ${fmt(big.amount)} | ${big.category} | ${big.description || '—'}`)
            console.log(`   SOMA DE:`)
            for (const e of combo) {
              console.log(`     id:${e.id} | ${fmtDate(e.date)} | ${fmt(e.amount)} | ${e.category} | ${e.description || '—'}`)
            }
            console.log(`   → ${fmt(bigAmt)} = soma de ${combo.length} lançamentos (${combo.map(e => fmt(e.amount)).join(' + ')})`)
            console.log()
          }
        }
      }
    }
  }

  // Também verificar: mesmo fornecedor, datas ≤7 dias, valor = múltiplo inteiro (2x, 3x)
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('ANÁLISE: valor = múltiplo exato (2x, 3x) de outro no mesmo mês')
  console.log('═══════════════════════════════════════════════════════════════\n')

  for (const [key, list] of Object.entries(groups)) {
    if (list.length < 2) continue
    const [sup, period, type] = key.split('|')
    const sorted = [...list].sort((a, b) => b.amount - a.amount)

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const big = sorted[i]
        const small = sorted[j]
        const ratio = round2(big.amount / small.amount)
        if (Number.isInteger(ratio) && ratio >= 2 && ratio <= 5) {
          found++
          console.log(`🔍 MÚLTIPLO ${ratio}x — ${sup} | ${period} | tipo:${type}`)
          console.log(`   GRANDE: id:${big.id} | ${fmtDate(big.date)} | ${fmt(big.amount)} | ${big.description || '—'}`)
          console.log(`   UNIT:   id:${small.id} | ${fmtDate(small.date)} | ${fmt(small.amount)} | ${small.description || '—'}`)
          console.log()
        }
      }
    }
  }

  if (found === 0) console.log('✅ Nenhuma sobreposição encontrada.\n')
  else console.log(`\nTotal de suspeitos encontrados: ${found}`)
}

function getCombinations(arr, size) {
  if (size === 1) return arr.map(e => [e])
  const result = []
  for (let i = 0; i <= arr.length - size; i++) {
    const rest = getCombinations(arr.slice(i + 1), size - 1)
    for (const combo of rest) result.push([arr[i], ...combo])
  }
  return result
}

main().catch(console.error)
