// Script de importação do extrato InfinityPay para o sistema financeiro
// Execução: node scripts/import-infinitypay.mjs

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
  const res = await request('/api/auth/callback/credentials', 'POST', form.toString())
  console.log('Login status:', res.status)
}

// Transações interpretadas do extrato (excluindo: investimento CDB saída, reembolsos ML duplicados)
const ENTRIES = [
  // JUL 2026
  { date: '2026-07-06', type: 'S', amount: 7.39,     account: 'AUÊ', supplier: 'RAIA DROGASIL',          description: 'Cartão',                  category: 'MATERIAL LIMPEZA' },
  { date: '2026-07-06', type: 'S', amount: 1500.00,  account: 'AUÊ', supplier: 'SEBASTIAO GUEDES',        description: 'Pró-labore Sebá',          category: 'PROLABORE' },
  { date: '2026-07-06', type: 'E', amount: 450.00,   account: 'AUÊ', supplier: 'ALEXANDRA PEIXOTO',       description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-07-06', type: 'E', amount: 576.01,   account: 'AUÊ', supplier: 'INFINITEPAY',             description: 'Depósito de vendas',       category: 'APORTE SÓCIOS' },
  { date: '2026-07-06', type: 'E', amount: 2019.25,  account: 'AUÊ', supplier: 'INFINITEPAY',             description: 'Vencimento CDB',           category: 'OUTROS' },
  { date: '2026-07-04', type: 'E', amount: 365.00,   account: 'AUÊ', supplier: 'BARBARA GOMES MOREIRA',   description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-07-04', type: 'S', amount: 167.34,   account: 'AUÊ', supplier: 'FACEBOOK ADS',            description: 'Impulsionamento',          category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-07-04', type: 'E', amount: 240.00,   account: 'AUÊ', supplier: 'VITORIA PERES KOYAMA',    description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-07-03', type: 'E', amount: 219.00,   account: 'AUÊ', supplier: 'RAFAELLA R ZENEZI',       description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-07-02', type: 'E', amount: 790.00,   account: 'AUÊ', supplier: 'GABRIELA C BITTENCOURT',  description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-07-02', type: 'S', amount: 55.00,    account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Compra ML x4 (220 total)', category: 'INFRAESTRUTURA' },
  { date: '2026-07-02', type: 'S', amount: 55.00,    account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Compra ML x4 (220 total)', category: 'INFRAESTRUTURA' },
  { date: '2026-07-02', type: 'S', amount: 55.00,    account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Compra ML x4 (220 total)', category: 'INFRAESTRUTURA' },
  { date: '2026-07-02', type: 'S', amount: 55.00,    account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Compra ML x4 (220 total)', category: 'INFRAESTRUTURA' },

  // JUN 2026
  { date: '2026-06-30', type: 'E', amount: 16.46,    account: 'AUÊ', supplier: 'INFINITEPAY',             description: 'Cashback cartão',          category: 'OUTROS' },
  { date: '2026-06-30', type: 'S', amount: 2901.01,  account: 'AUÊ', supplier: 'SARAH V B ANDRADE',       description: 'Folha salarial',           category: 'FOLHA SALARIAL' },
  { date: '2026-06-30', type: 'E', amount: 615.00,   account: 'AUÊ', supplier: 'MAÍSA BARROS DONATO',     description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-30', type: 'E', amount: 300.00,   account: 'AUÊ', supplier: 'NEUSA TOMOE YAMAJI',      description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-30', type: 'S', amount: 167.34,   account: 'AUÊ', supplier: 'FACEBOOK ADS',            description: 'Impulsionamento',          category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-06-30', type: 'S', amount: 39.06,    account: 'AUÊ', supplier: 'MINI EXTRA',              description: 'Compra mercado',           category: 'OUTROS' },
  { date: '2026-06-30', type: 'E', amount: 115.00,   account: 'AUÊ', supplier: 'GUSTAVO K C MORI',        description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-29', type: 'S', amount: 120.00,   account: 'AUÊ', supplier: 'GUSTAVO MARIANO SOARES',  description: 'Pagamento funcionário',    category: 'FOLHA SALARIAL' },
  { date: '2026-06-29', type: 'E', amount: 691.01,   account: 'AUÊ', supplier: 'INFINITEPAY',             description: 'Depósito de vendas',       category: 'APORTE SÓCIOS' },
  { date: '2026-06-29', type: 'E', amount: 500.01,   account: 'AUÊ', supplier: 'INFINITEPAY',             description: 'Depósito de vendas',       category: 'APORTE SÓCIOS' },
  { date: '2026-06-28', type: 'S', amount: 150.00,   account: 'AUÊ', supplier: 'VICTOR HUGO A SILVA',     description: 'Pagamento funcionário',    category: 'FOLHA SALARIAL' },
  { date: '2026-06-27', type: 'E', amount: 80.00,    account: 'AUÊ', supplier: 'BARBARA GOMES MOREIRA',   description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-27', type: 'S', amount: 167.43,   account: 'AUÊ', supplier: 'FACEBOOK ADS',            description: 'Impulsionamento',          category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-06-26', type: 'S', amount: 99.90,    account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Compra ML',               category: 'INFRAESTRUTURA' },
  { date: '2026-06-26', type: 'E', amount: 365.00,   account: 'AUÊ', supplier: 'BARBARA GOMES MOREIRA',   description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-25', type: 'S', amount: 60.63,    account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Compra ML',               category: 'INFRAESTRUTURA' },
  { date: '2026-06-25', type: 'S', amount: 167.38,   account: 'AUÊ', supplier: 'FACEBOOK ADS',            description: 'Impulsionamento',          category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-06-24', type: 'E', amount: 115.00,   account: 'AUÊ', supplier: 'GUSTAVO K C MORI',        description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-22', type: 'S', amount: 64.00,    account: 'AUÊ', supplier: 'TELEFONICA',              description: 'Vivo linha 1',             category: 'INTERNET' },
  { date: '2026-06-22', type: 'S', amount: 65.95,    account: 'AUÊ', supplier: 'TELEFONICA',              description: 'Vivo linha 2',             category: 'INTERNET' },
  { date: '2026-06-22', type: 'S', amount: 60.53,    account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Compra ML',               category: 'INFRAESTRUTURA' },
  { date: '2026-06-22', type: 'E', amount: 945.00,   account: 'AUÊ', supplier: 'CARLA AKEMI SATO',        description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-21', type: 'E', amount: 250.00,   account: 'AUÊ', supplier: 'BARBARA GOMES MOREIRA',   description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-21', type: 'S', amount: 167.34,   account: 'AUÊ', supplier: 'FACEBOOK ADS',            description: 'Impulsionamento',          category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-06-21', type: 'E', amount: 200.00,   account: 'AUÊ', supplier: 'RAFAELLA R ZENEZI',       description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-20', type: 'E', amount: 50.00,    account: 'AUÊ', supplier: 'DÉBORA C D SOUSA',        description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-19', type: 'S', amount: 598.86,   account: 'AUÊ', supplier: 'PREFEITURA OSASCO',       description: 'IPTU',                     category: 'IMPOSTO IPTU' },
  { date: '2026-06-19', type: 'S', amount: 239.39,   account: 'AUÊ', supplier: 'SABESP',                  description: 'Água',                     category: 'ÁGUA' },
  { date: '2026-06-19', type: 'S', amount: 357.16,   account: 'AUÊ', supplier: 'ENEL',                    description: 'Energia elétrica',         category: 'ENERGIA ELÉTRICA' },
  { date: '2026-06-19', type: 'S', amount: 141.91,   account: 'AUÊ', supplier: 'CONTAAGIL',               description: 'Sistema cartão/maquininha',category: 'SISTEMA CARTÃO' },
  { date: '2026-06-17', type: 'E', amount: 425.00,   account: 'AUÊ', supplier: 'LEONARDO C GATTERMAYER',  description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-17', type: 'S', amount: 167.36,   account: 'AUÊ', supplier: 'FACEBOOK ADS',            description: 'Impulsionamento',          category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-06-17', type: 'E', amount: 180.00,   account: 'AUÊ', supplier: 'GUSTAVO K C MORI',        description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-17', type: 'E', amount: 215.00,   account: 'AUÊ', supplier: 'GABRIEL MONTANHER',       description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-17', type: 'E', amount: 11.13,    account: 'AUÊ', supplier: 'INFINITEPAY',             description: 'Cashback cartão',          category: 'OUTROS' },
  { date: '2026-06-16', type: 'S', amount: 460.16,   account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Pix Marketplace',          category: 'INFRAESTRUTURA' },
  { date: '2026-06-15', type: 'S', amount: 6000.00,  account: 'AUÊ', supplier: 'ELAINE DUMAS NETO',       description: 'Aluguel',                  category: 'ALUGUEL' },
  { date: '2026-06-15', type: 'S', amount: 54.00,    account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Compra ML',               category: 'INFRAESTRUTURA' },
  { date: '2026-06-14', type: 'E', amount: 455.00,   account: 'AUÊ', supplier: 'BARBARA G MOREIRA',       description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-14', type: 'S', amount: 150.00,   account: 'AUÊ', supplier: 'SARAH V B ANDRADE',       description: 'Pagamento funcionária',    category: 'FOLHA SALARIAL' },
  { date: '2026-06-13', type: 'S', amount: 79.16,    account: 'AUÊ', supplier: 'FACEBOOK ADS',            description: 'Impulsionamento',          category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-06-12', type: 'E', amount: 600.00,   account: 'AUÊ', supplier: 'NEUSA TOMOE YAMAJI',      description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-11', type: 'E', amount: 640.00,   account: 'AUÊ', supplier: 'MARIA LUISA F PEREIRA',   description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-11', type: 'S', amount: 167.51,   account: 'AUÊ', supplier: 'FACEBOOK ADS',            description: 'Impulsionamento',          category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-06-11', type: 'E', amount: 110.00,   account: 'AUÊ', supplier: 'CRISTIANE P MANCANO',     description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-11', type: 'E', amount: 380.00,   account: 'AUÊ', supplier: 'VALERIA BELLATO',         description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-10', type: 'S', amount: 54.00,    account: 'AUÊ', supplier: 'MARQUES DO VALE',         description: 'Material construção',      category: 'OBRA' },
  { date: '2026-06-10', type: 'S', amount: 212.64,   account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Pix Marketplace',          category: 'INFRAESTRUTURA' },
  { date: '2026-06-10', type: 'S', amount: 25.55,    account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Compra ML',               category: 'INFRAESTRUTURA' },
  { date: '2026-06-10', type: 'S', amount: 26.90,    account: 'AUÊ', supplier: 'SHOPEE',                  description: 'Compra Shopee',            category: 'INFRAESTRUTURA' },
  { date: '2026-06-09', type: 'S', amount: 167.34,   account: 'AUÊ', supplier: 'FACEBOOK ADS',            description: 'Impulsionamento',          category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-06-08', type: 'E', amount: 150.00,   account: 'AUÊ', supplier: 'JENIFFER A LEMES',        description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-08', type: 'E', amount: 877.50,   account: 'AUÊ', supplier: 'RAFAELLA R ZENEZI',       description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-06', type: 'S', amount: 167.34,   account: 'AUÊ', supplier: 'FACEBOOK ADS',            description: 'Impulsionamento',          category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-06-06', type: 'E', amount: 5.00,     account: 'AUÊ', supplier: 'BARBARA G MOREIRA',       description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-06', type: 'E', amount: 640.00,   account: 'AUÊ', supplier: 'GABRIELA C BITTENCOURT',  description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-05', type: 'E', amount: 450.00,   account: 'AUÊ', supplier: 'ALEXANDRA PEIXOTO',       description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-05', type: 'S', amount: 2242.84,  account: 'AUÊ', supplier: 'SARAH V B ANDRADE',       description: 'Folha salarial',           category: 'FOLHA SALARIAL' },
  { date: '2026-06-05', type: 'E', amount: 576.00,   account: 'AUÊ', supplier: 'LEANDRO D MANCANO',       description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-03', type: 'S', amount: 17.99,    account: 'AUÊ', supplier: 'SEKAY',                   description: 'Compra cartão',            category: 'INFRAESTRUTURA' },
  { date: '2026-06-03', type: 'E', amount: 450.00,   account: 'AUÊ', supplier: 'BARBARA G MOREIRA',       description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-03', type: 'S', amount: 36.82,    account: 'AUÊ', supplier: 'FACEBOOK ADS',            description: 'Impulsionamento',          category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-06-03', type: 'E', amount: 0.37,     account: 'AUÊ', supplier: 'INFINITEPAY',             description: 'Cashback cartão',          category: 'OUTROS' },
  { date: '2026-06-03', type: 'E', amount: 1355.00,  account: 'AUÊ', supplier: 'SEBASTIAO GUEDES',        description: 'Aporte sócio',             category: 'APORTE SÓCIOS' },
  { date: '2026-06-03', type: 'E', amount: 485.00,   account: 'AUÊ', supplier: 'LEONARDO C GATTERMAYER',  description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-03', type: 'E', amount: 150.01,   account: 'AUÊ', supplier: 'INFINITEPAY',             description: 'Depósito de vendas',       category: 'APORTE SÓCIOS' },
  { date: '2026-06-02', type: 'E', amount: 225.00,   account: 'AUÊ', supplier: 'CAIO S SOUZA',            description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-06-02', type: 'S', amount: 24.98,    account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Compra ML',               category: 'INFRAESTRUTURA' },
  { date: '2026-06-02', type: 'S', amount: 163.96,   account: 'AUÊ', supplier: 'SABESP',                  description: 'Água',                     category: 'ÁGUA' },
  { date: '2026-06-02', type: 'E', amount: 665.39,   account: 'AUÊ', supplier: 'INFINITEPAY',             description: 'Depósito de vendas',       category: 'APORTE SÓCIOS' },

  // MAI 2026
  { date: '2026-05-31', type: 'E', amount: 5.00,     account: 'AUÊ', supplier: 'BARBARA G MOREIRA',       description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-05-30', type: 'S', amount: 105.38,   account: 'AUÊ', supplier: 'CONSTRUDECOR',            description: 'Material construção',      category: 'OBRA' },
  { date: '2026-05-30', type: 'S', amount: 35.00,    account: 'AUÊ', supplier: 'MARQUES DO VALE',         description: 'Material construção',      category: 'OBRA' },
  { date: '2026-05-30', type: 'S', amount: 80.00,    account: 'AUÊ', supplier: 'OZ DISTRIBUIDORA',        description: 'Material construção',      category: 'OBRA' },
  { date: '2026-05-30', type: 'S', amount: 80.00,    account: 'AUÊ', supplier: 'LUIZ MANOEL OLIVEIRA',    description: 'Mão de obra',              category: 'OBRA' },
  { date: '2026-05-29', type: 'E', amount: 240.00,   account: 'AUÊ', supplier: 'BARBARA G MOREIRA',       description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-05-29', type: 'S', amount: 37.42,    account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Pix Marketplace',          category: 'INFRAESTRUTURA' },
  { date: '2026-05-29', type: 'S', amount: 80.79,    account: 'AUÊ', supplier: 'MERCADO LIVRE',           description: 'Pix Marketplace',          category: 'INFRAESTRUTURA' },
  { date: '2026-05-28', type: 'E', amount: 180.00,   account: 'AUÊ', supplier: 'ALBERTO S BRANDAO',       description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-05-28', type: 'E', amount: 1000.00,  account: 'AUÊ', supplier: 'BRUNA O SOUSA',           description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-05-28', type: 'E', amount: 150.00,   account: 'AUÊ', supplier: 'NEUSA TOMOE YAMAJI',      description: 'Pix recebido cliente',     category: 'APORTE SÓCIOS' },
  { date: '2026-05-26', type: 'E', amount: 8754.62,  account: 'AUÊ', supplier: 'SEBASTIAO GUEDES',        description: 'Aporte sócio',             category: 'APORTE SÓCIOS' },
]

async function main() {
  console.log(`Importando ${ENTRIES.length} lançamentos para produção...`)
  await login()

  // Verifica se está autenticado
  const testRes = await request('/api/financeiro')
  if (testRes.status === 401) {
    console.error('Falha na autenticação. Abortando.')
    process.exit(1)
  }
  console.log(`Autenticado. Iniciando importação...`)

  let ok = 0
  let err = 0

  for (const entry of ENTRIES) {
    try {
      const res = await request('/api/financeiro', 'POST', entry, 'application/json')
      if (res.status === 201 || res.status === 200) {
        ok++
        process.stdout.write('.')
      } else {
        console.error(`\nERRO ${res.status} em ${entry.date} ${entry.supplier}: ${res.body}`)
        err++
      }
    } catch (e) {
      console.error(`\nEXCEPTION em ${entry.date} ${entry.supplier}:`, e.message)
      err++
    }
  }

  console.log(`\n\nConcluído: ${ok} importados, ${err} erros.`)
}

main().catch(console.error)
