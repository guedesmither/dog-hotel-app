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

async function main() {
  await login()
  const res = await request('/api/financeiro')
  const entries = JSON.parse(res.body)
  console.log(`Total de lançamentos: ${entries.length}\n`)

  // ── 1. DUPLICATAS EXATAS: mesmo date + amount + type + account
  console.log('═══════════════════════════════════════════════════════')
  console.log('1. DUPLICATAS EXATAS (mesma data + valor + tipo + conta)')
  console.log('═══════════════════════════════════════════════════════')
  const exactKey = e => `${e.date.split('T')[0]}|${e.type}|${e.amount}|${e.account}`
  const exactMap = {}
  for (const e of entries) {
    const k = exactKey(e)
    if (!exactMap[k]) exactMap[k] = []
    exactMap[k].push(e)
  }
  let foundExact = 0
  for (const [k, list] of Object.entries(exactMap)) {
    if (list.length > 1) {
      foundExact++
      console.log(`\n⚠️  ${list.length}x — ${k}`)
      for (const e of list) console.log(`   id:${e.id} | cat:${e.category} | sup:${e.supplier || '—'} | desc:${e.description || '—'}`)
    }
  }
  if (!foundExact) console.log('✅ Nenhuma duplicata exata encontrada.\n')

  // ── 2. SUSPEITOS: mesmo fornecedor + valor semelhante (±5%) no mesmo dia
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('2. SUSPEITOS: mesmo fornecedor + valor parecido (±5%) no mesmo dia')
  console.log('═══════════════════════════════════════════════════════')
  const byDate = {}
  for (const e of entries) {
    const d = e.date.split('T')[0]
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(e)
  }
  let foundSuspect = 0
  for (const [date, list] of Object.entries(byDate)) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j]
        if (a.type !== b.type) continue
        if (!a.supplier || !b.supplier) continue
        const supA = a.supplier.toUpperCase().trim()
        const supB = b.supplier.toUpperCase().trim()
        if (supA !== supB) continue
        const diff = Math.abs(a.amount - b.amount) / Math.max(a.amount, b.amount)
        if (diff <= 0.05 && a.amount !== b.amount) {
          foundSuspect++
          console.log(`\n🔍 ${date} — fornecedor: "${a.supplier}"`)
          console.log(`   id:${a.id} | ${fmt(a.amount)} | ${a.category} | ${a.account}`)
          console.log(`   id:${b.id} | ${fmt(b.amount)} | ${b.category} | ${b.account}`)
        }
      }
    }
  }
  if (!foundSuspect) console.log('✅ Nenhum suspeito encontrado.\n')

  // ── 3. MESMO FORNECEDOR + VALOR EXATO em dias diferentes (±3 dias)
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('3. MESMO FORNECEDOR + VALOR EXATO em datas próximas (≤3 dias)')
  console.log('═══════════════════════════════════════════════════════')
  let foundClose = 0
  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date))
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i], b = sorted[j]
      const daysDiff = (new Date(b.date) - new Date(a.date)) / 86400000
      if (daysDiff > 3) break
      if (daysDiff === 0) continue // já coberto no check 1
      if (a.type !== b.type) continue
      if (a.amount !== b.amount) continue
      if (!a.supplier || !b.supplier) continue
      if (a.supplier.toUpperCase().trim() !== b.supplier.toUpperCase().trim()) continue
      // Ignorar fornecedores genéricos que legitimamente repetem
      const genericSuppliers = ['NICE', 'PICPAY', 'MERCADO LIVRE', 'SHOPEE', 'FACEBOOK', 'ENEL', 'SABESP']
      if (genericSuppliers.some(g => a.supplier.toUpperCase().includes(g))) continue
      foundClose++
      console.log(`\n🔍 Mesmo valor em dias seguidos — "${a.supplier}" | ${fmt(a.amount)}`)
      console.log(`   id:${a.id} | ${fmtDate(a.date)} | ${a.category} | ${a.account} | ${a.description || '—'}`)
      console.log(`   id:${b.id} | ${fmtDate(b.date)} | ${b.category} | ${b.account} | ${b.description || '—'}`)
    }
  }
  if (!foundClose) console.log('✅ Nenhum suspeito encontrado.\n')

  // ── 4. RESUMO POR CATEGORIA — valores totais para revisão
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('4. RESUMO GERAL POR CATEGORIA (despesas)')
  console.log('═══════════════════════════════════════════════════════')
  const catTotals = {}
  for (const e of entries) {
    if (e.type !== 'S') continue
    if (!catTotals[e.category]) catTotals[e.category] = { total: 0, count: 0 }
    catTotals[e.category].total += e.amount
    catTotals[e.category].count++
  }
  for (const [cat, { total, count }] of Object.entries(catTotals).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`  ${cat.padEnd(28)} ${count.toString().padStart(4)} lançamentos   ${fmt(total).padStart(12)}`)
  }

  // ── 5. TOP 10 maiores lançamentos
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('5. TOP 15 MAIORES LANÇAMENTOS')
  console.log('═══════════════════════════════════════════════════════')
  const top = [...entries].filter(e => e.type === 'S').sort((a, b) => b.amount - a.amount).slice(0, 15)
  for (const e of top) {
    console.log(`  ${fmtDate(e.date)} | ${fmt(e.amount).padStart(12)} | ${e.category.padEnd(24)} | ${(e.supplier || '—').padEnd(20)} | ${e.account} | ${e.description || '—'}`)
  }
}

main().catch(console.error)
