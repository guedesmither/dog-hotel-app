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

function fmt(v) { return `R$${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

async function main() {
  await login()

  const [finRes, salesRes] = await Promise.all([
    request('/api/financeiro'),
    request('/api/sales/analytics'),
  ])
  const entries = JSON.parse(finRes.body)
  const salesData = JSON.parse(salesRes.body)
  const salesByMonth = salesData.byMonth || []

  const MESES = ['2026-02','2026-03','2026-04','2026-05','2026-06','2026-07']
  const MESES_LABEL = { '2026-02':'Fev/26','2026-03':'Mar/26','2026-04':'Abr/26','2026-05':'Mai/26','2026-06':'Jun/26','2026-07':'Jul/26' }

  console.log('╔══════════════════════════════════════════════════════════════════════════════════╗')
  console.log('║          RECONCILIAÇÃO CAIXA vs DRE — MÊS A MÊS                                ║')
  console.log('╠══════════════════════════════════════════════════════════════════════════════════╣')
  console.log(`║ ${'Mês'.padEnd(8)} │ ${'Vendas(DRE)'.padStart(13)} │ ${'Pix Clientes'.padStart(13)} │ ${'TOTAL RECEITA'.padStart(13)} │ ${'Despesas'.padStart(12)} │ ${'Resultado'.padStart(12)} ║`)
  console.log('╠══════════════════════════════════════════════════════════════════════════════════╣')

  let totalVendas = 0, totalPix = 0, totalDesp = 0, totalResult = 0

  for (const mes of MESES) {
    const sm = salesByMonth.find(m => m.month === mes)
    const vendas = sm ? sm.net : 0

    const mesEntries = entries.filter(e => e.period === mes)

    // Pix de clientes = ENTRADA CAIXA que NÃO estão nas vendas do módulo
    const pixClientes = mesEntries
      .filter(e => e.type === 'E' && e.category === 'ENTRADA CAIXA')
      .reduce((s, e) => s + e.amount, 0)

    // Despesas operacionais (excluindo aportes)
    const despesas = mesEntries
      .filter(e => e.type === 'S' && e.category !== 'APORTE NICE' && e.category !== 'ADIANTAMENTO SÓCIO')
      .reduce((s, e) => s + e.amount, 0)

    const receitaTotal = vendas + pixClientes
    const resultado = receitaTotal - despesas

    totalVendas += vendas
    totalPix += pixClientes
    totalDesp += despesas
    totalResult += resultado

    const resultStr = fmt(resultado)
    const sinal = resultado >= 0 ? '+' : ''
    console.log(`║ ${MESES_LABEL[mes].padEnd(8)} │ ${fmt(vendas).padStart(13)} │ ${fmt(pixClientes).padStart(13)} │ ${fmt(receitaTotal).padStart(13)} │ ${fmt(despesas).padStart(12)} │ ${(sinal+resultStr).padStart(12)} ║`)
  }

  console.log('╠══════════════════════════════════════════════════════════════════════════════════╣')
  const totalReceita = totalVendas + totalPix
  const sinalTotal = totalResult >= 0 ? '+' : ''
  console.log(`║ ${'TOTAL'.padEnd(8)} │ ${fmt(totalVendas).padStart(13)} │ ${fmt(totalPix).padStart(13)} │ ${fmt(totalReceita).padStart(13)} │ ${fmt(totalDesp).padStart(12)} │ ${(sinalTotal+fmt(totalResult)).padStart(12)} ║`)
  console.log('╚══════════════════════════════════════════════════════════════════════════════════╝')

  console.log('\n--- DETALHE: Pix Clientes por mês ---')
  for (const mes of MESES) {
    const pixList = entries.filter(e => e.period === mes && e.type === 'E' && e.category === 'ENTRADA CAIXA')
    if (!pixList.length) continue
    console.log(`\n${MESES_LABEL[mes]} — ${pixList.length} entradas = ${fmt(pixList.reduce((s,e)=>s+e.amount,0))}`)
    for (const e of pixList) {
      console.log(`  ${new Date(e.date).toLocaleDateString('pt-BR')} | ${fmt(e.amount).padStart(10)} | ${e.supplier || '—'}`)
    }
  }

  console.log('\n--- DETALHE: Aportes NICE por mês (não entram no resultado) ---')
  for (const mes of MESES) {
    const aportes = entries.filter(e => e.period === mes && e.type === 'E' && e.category === 'APORTE NICE')
    if (!aportes.length) continue
    const total = aportes.reduce((s,e)=>s+e.amount,0)
    console.log(`  ${MESES_LABEL[mes]}: ${fmt(total)} (${aportes.length} lançamentos)`)
  }
}

main().catch(console.error)
