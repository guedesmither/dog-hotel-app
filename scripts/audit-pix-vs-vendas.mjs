import https from 'https'

const BASE_URL = 'https://guedesmither-dog-hotel-app.vercel.app'
const cookieJar = []

function request(path, method = 'GET', body = null, ct = 'application/x-www-form-urlencoded') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null
    const opts = { hostname: url.hostname, port: 443, path: url.pathname + url.search, method, headers: {} }
    if (cookieJar.length) opts.headers.Cookie = cookieJar.join('; ')
    if (bodyStr) { opts.headers['Content-Type'] = ct; opts.headers['Content-Length'] = Buffer.byteLength(bodyStr) }
    const req = https.request(opts, (res) => {
      let data = ''; res.on('data', c => data += c)
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

function fmt(v) { return `R$${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtDate(d) { return new Date(d).toLocaleDateString('pt-BR') }
function normName(n) {
  return (n || '').toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim()
}

// Extrai palavras significativas (>= 3 letras) para matching fuzzy
function keywords(n) {
  return normName(n).split(' ').filter(w => w.length >= 3)
}

function matchNames(a, b) {
  const ka = keywords(a)
  const kb = keywords(b)
  if (!ka.length || !kb.length) return false
  // Pelo menos 2 palavras em comum, ou 1 palavra longa (>=5 chars)
  const common = ka.filter(w => kb.includes(w))
  return common.length >= 2 || common.some(w => w.length >= 5)
}

async function main() {
  await login()

  const [finRes, salesRes] = await Promise.all([
    request('/api/financeiro'),
    request('/api/sales?limit=9999'),
  ])

  const fin = JSON.parse(finRes.body)
  const salesRaw = JSON.parse(salesRes.body)
  const sales = Array.isArray(salesRaw) ? salesRaw : (salesRaw.sales || salesRaw.data || [])

  // Pix de clientes (ENTRADA CAIXA), excluindo rendimentos PicPay, Marketplace etc.
  const IGNORAR_SUPPLIERS = ['PICPAY', 'MERCADO LIVRE', 'INFINITEPAY', 'MARKETPLACE']
  const pixEntradas = fin.filter(e =>
    e.type === 'E' &&
    e.category === 'ENTRADA CAIXA' &&
    e.supplier &&
    !IGNORAR_SUPPLIERS.some(s => e.supplier.toUpperCase().includes(s)) &&
    e.amount >= 50 // ignora rendimentos centavos
  )

  // Índice de vendas por cliente + valor + mês (janela ±7 dias do Pix)
  // Para cada Pix, tentar achar venda com nome parecido e valor próximo
  const MESES = ['2026-02','2026-03','2026-04','2026-05','2026-06','2026-07']
  const MESES_LABEL = { '2026-02':'Fev/26','2026-03':'Mar/26','2026-04':'Abr/26','2026-05':'Mai/26','2026-06':'Jun/26','2026-07':'Jul/26' }

  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('PIX RECEBIDOS × VENDAS NO SISTEMA — CRUZAMENTO')
  console.log('═══════════════════════════════════════════════════════════════════\n')

  const semVenda = []
  const comVenda = []

  for (const pix of pixEntradas) {
    const pixDate = new Date(pix.date)
    const pixMes = pix.period

    // Busca venda com nome parecido no mesmo mês ou mês adjacente (±1)
    const mesIdx = MESES.indexOf(pixMes)
    const mesesBusca = [
      mesIdx > 0 ? MESES[mesIdx - 1] : null,
      pixMes,
      mesIdx < MESES.length - 1 ? MESES[mesIdx + 1] : null,
    ].filter(Boolean)

    const candidatos = sales.filter(s => {
      const clientName = s.client?.name || ''
      const sMes = s.date ? s.date.substring(0, 7) : (s.createdAt ? s.createdAt.substring(0, 7) : '')
      return mesesBusca.includes(sMes) && matchNames(pix.supplier, clientName)
    })

    // Entre candidatos, ver se algum tem valor igual ou próximo (±10%)
    const vendaExata = candidatos.find(s => Math.abs(s.finalPrice - pix.amount) < 0.02)
    const vendaProxima = !vendaExata && candidatos.find(s => {
      const diff = Math.abs(s.finalPrice - pix.amount) / Math.max(s.finalPrice, pix.amount)
      return diff <= 0.15
    })
    const vendaQualquer = !vendaExata && !vendaProxima && candidatos.length > 0 ? candidatos[0] : null

    if (vendaExata) {
      comVenda.push({ pix, venda: vendaExata, tipo: 'EXATA' })
    } else if (vendaProxima) {
      comVenda.push({ pix, venda: vendaProxima, tipo: 'PRÓXIMA' })
    } else if (vendaQualquer) {
      comVenda.push({ pix, venda: vendaQualquer, tipo: 'NOME_APENAS' })
    } else {
      semVenda.push(pix)
    }
  }

  // ── PIX SEM VENDA CORRESPONDENTE
  console.log(`❌ PIX SEM VENDA LANÇADA NO SISTEMA (${semVenda.length} entradas)`)
  console.log('─────────────────────────────────────────────────────────────────')
  let totalSemVenda = 0
  const porMes = {}
  for (const p of semVenda) {
    if (!porMes[p.period]) porMes[p.period] = []
    porMes[p.period].push(p)
    totalSemVenda += p.amount
  }
  for (const mes of MESES) {
    const lista = porMes[mes] || []
    if (!lista.length) continue
    const tot = lista.reduce((s, p) => s + p.amount, 0)
    console.log(`\n  📅 ${MESES_LABEL[mes]} — ${lista.length} Pix = ${fmt(tot)}`)
    for (const p of lista.sort((a,b) => new Date(b.date)-new Date(a.date))) {
      console.log(`     ${fmtDate(p.date)} | ${fmt(p.amount).padStart(10)} | ${p.supplier}`)
    }
  }
  console.log(`\n  TOTAL SEM VENDA: ${fmt(totalSemVenda)}\n`)

  // ── PIX COM VENDA MAS VALOR DIVERGENTE
  const divergentes = comVenda.filter(x => x.tipo === 'PRÓXIMA' || x.tipo === 'NOME_APENAS')
  if (divergentes.length) {
    console.log(`⚠️  PIX COM VENDA LANÇADA MAS VALOR DIVERGENTE (${divergentes.length})`)
    console.log('─────────────────────────────────────────────────────────────────')
    for (const { pix, venda, tipo } of divergentes) {
      const diff = pix.amount - venda.finalPrice
      console.log(`  ${fmtDate(pix.date)} | Pix: ${fmt(pix.amount)} | Venda: ${fmt(venda.finalPrice)} | Δ ${diff >= 0 ? '+' : ''}${fmt(diff)} | ${pix.supplier} [${tipo}]`)
    }
    console.log()
  }

  // ── RESUMO POR MÊS
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log('RESUMO POR MÊS')
  console.log('═══════════════════════════════════════════════════════════════════')
  console.log(`${'Mês'.padEnd(8)} │ ${'Pix total'.padStart(12)} │ ${'Com venda'.padStart(12)} │ ${'Sem venda'.padStart(12)} │ ${'% cobert.'.padStart(10)}`)
  console.log('─────────────────────────────────────────────────────────────────')
  for (const mes of MESES) {
    const pixMes = pixEntradas.filter(p => p.period === mes)
    const comMes = comVenda.filter(x => x.pix.period === mes)
    const semMes = semVenda.filter(p => p.period === mes)
    const totPix = pixMes.reduce((s, p) => s + p.amount, 0)
    const totCom = comMes.reduce((s, x) => s + x.pix.amount, 0)
    const totSem = semMes.reduce((s, p) => s + p.amount, 0)
    const pct = totPix > 0 ? ((totCom / totPix) * 100).toFixed(0) + '%' : '—'
    console.log(`${(MESES_LABEL[mes]||mes).padEnd(8)} │ ${fmt(totPix).padStart(12)} │ ${fmt(totCom).padStart(12)} │ ${fmt(totSem).padStart(12)} │ ${pct.padStart(10)}`)
  }
  console.log('─────────────────────────────────────────────────────────────────')
  const totGeral = pixEntradas.reduce((s,p)=>s+p.amount,0)
  const totCom = comVenda.reduce((s,x)=>s+x.pix.amount,0)
  const totSem = semVenda.reduce((s,p)=>s+p.amount,0)
  console.log(`${'TOTAL'.padEnd(8)} │ ${fmt(totGeral).padStart(12)} │ ${fmt(totCom).padStart(12)} │ ${fmt(totSem).padStart(12)} │ ${((totCom/totGeral)*100).toFixed(0).padStart(9)}%`)
}

main().catch(console.error)
