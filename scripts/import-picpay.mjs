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

// Regras finais:
// - Transferência de R$8754.62 para AUÊ = entre contas próprias → IGNORAR
// - Teste Pix R$0.01 → IGNORAR
// - TODOS os Pix recebidos (clientes, Sebá, Vê) = ENTRADA CAIXA (reconciliação caixa)
// - Despesas (enviados) = categorias operacionais
// - Já existem no banco (24 itens) → não reimportar

// JÁ NO BANCO (não duplicar):
const JA_NO_BANCO = new Set([
  '2026-05-01|S|237.15', '2026-04-28|S|100', '2026-04-10|S|50', '2026-04-08|S|2197.34',
  '2026-04-08|S|1700', '2026-04-07|S|101.49', '2026-04-07|S|303.01',
  '2026-04-02|S|199.97', '2026-04-02|S|150', '2026-04-02|S|25.31',
  '2026-04-01|S|125.56', '2026-04-01|S|24.19', '2026-04-01|S|34.21', '2026-04-01|S|161.48',
  '2026-03-30|S|56', '2026-03-30|S|55', '2026-03-30|S|85', '2026-03-30|S|59',
  '2026-03-30|S|49.2', '2026-03-28|S|11.77', '2026-03-28|S|11.51',
  '2026-03-26|S|271.96', '2026-03-25|S|142', '2026-03-24|S|42.25',
])

const ALL_ENTRIES = [
  // === ENTRADAS DE CLIENTES (todos) — ENTRADA CAIXA ===
  { date: '2026-05-26', type: 'E', amount: 310,     account: 'AUÊ', supplier: 'LEANDRO DALECIO MANCANO',   description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-26', type: 'E', amount: 340,     account: 'AUÊ', supplier: 'CARLA AKEMI SATO',          description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-26', type: 'E', amount: 110,     account: 'AUÊ', supplier: 'FERNANDA OLIVEIRA DE SOUZA',description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-22', type: 'E', amount: 580,     account: 'AUÊ', supplier: 'VITÓRIA PERES COBO KOYAMA', description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-21', type: 'E', amount: 1000,    account: 'AUÊ', supplier: 'NEUSA TOMOE KUGA YAMAJI',   description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-21', type: 'E', amount: 2438,    account: 'AUÊ', supplier: 'JOSIVALDO TENORIO GUEDES',  description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-19', type: 'E', amount: 110,     account: 'AUÊ', supplier: 'SEBASTIAO GUEDES',          description: 'Repasse cliente via Sebá', category: 'ENTRADA CAIXA' },
  { date: '2026-05-13', type: 'E', amount: 460,     account: 'AUÊ', supplier: 'ALINE GONZALEZ',            description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-13', type: 'E', amount: 100,     account: 'AUÊ', supplier: 'VALERIA BELLATO',           description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-11', type: 'E', amount: 450,     account: 'AUÊ', supplier: 'ALEXANDRA PEIXOTO DEMORI LIMA', description: 'Pix cliente', category: 'ENTRADA CAIXA' },
  { date: '2026-05-10', type: 'E', amount: 2230,    account: 'AUÊ', supplier: 'SEBASTIAO GUEDES',          description: 'Repasse clientes via Sebá', category: 'ENTRADA CAIXA' },
  { date: '2026-05-08', type: 'E', amount: 240,     account: 'AUÊ', supplier: 'BARBARA G MOREIRA',         description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-08', type: 'E', amount: 380,     account: 'AUÊ', supplier: 'VALERIA BELLATO',           description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-07', type: 'E', amount: 110,     account: 'AUÊ', supplier: 'EDSON PEREIRA DE MORAIS JUNIOR', description: 'Pix cliente', category: 'ENTRADA CAIXA' },
  { date: '2026-05-06', type: 'E', amount: 2400,    account: 'AUÊ', supplier: 'EUNIRA KEIKO UCHIDA',       description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-04', type: 'E', amount: 877.50,  account: 'AUÊ', supplier: 'EDSON PEREIRA DE MORAIS JUNIOR', description: 'Pix cliente', category: 'ENTRADA CAIXA' },
  { date: '2026-05-04', type: 'E', amount: 965.20,  account: 'AUÊ', supplier: 'SEBASTIAO GUEDES',          description: 'Repasse clientes via Sebá', category: 'ENTRADA CAIXA' },
  { date: '2026-05-03', type: 'E', amount: 150,     account: 'AUÊ', supplier: 'BARBARA G MOREIRA',         description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-02', type: 'E', amount: 450,     account: 'AUÊ', supplier: 'RAFAELA RODRIGUES NOBRE',   description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-02', type: 'E', amount: 580,     account: 'AUÊ', supplier: 'SILVANA COBO',              description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-05-01', type: 'E', amount: 450,     account: 'AUÊ', supplier: 'BARBARA G MOREIRA',         description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-04-30', type: 'E', amount: 640,     account: 'AUÊ', supplier: 'GABRIELA CARVALHO BITTENCOURT', description: 'Pix cliente', category: 'ENTRADA CAIXA' },
  { date: '2026-04-28', type: 'E', amount: 225,     account: 'AUÊ', supplier: 'LEONARDO CICOTTI GOUVEIA GATTERMAYER', description: 'Pix cliente', category: 'ENTRADA CAIXA' },
  { date: '2026-04-28', type: 'E', amount: 942.04,  account: 'AUÊ', supplier: 'SEBASTIAO GUEDES',          description: 'Repasse clientes via Sebá', category: 'ENTRADA CAIXA' },
  { date: '2026-04-25', type: 'E', amount: 240,     account: 'AUÊ', supplier: 'BARBARA G MOREIRA',         description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-04-24', type: 'E', amount: 200,     account: 'AUÊ', supplier: 'ROSELAINE DA MOTA FELISBERTO', description: 'Pix cliente', category: 'ENTRADA CAIXA' },
  { date: '2026-04-23', type: 'E', amount: 576,     account: 'AUÊ', supplier: 'CRISTIANE PEREIRA DE MELO MANCANO', description: 'Pix cliente', category: 'ENTRADA CAIXA' },
  { date: '2026-04-23', type: 'E', amount: 386.08,  account: 'AUÊ', supplier: 'SEBASTIAO GUEDES',          description: 'Repasse clientes via Sebá', category: 'ENTRADA CAIXA' },
  { date: '2026-04-23', type: 'E', amount: 120,     account: 'AUÊ', supplier: 'SEBASTIAO GUEDES',          description: 'Repasse clientes via Sebá', category: 'ENTRADA CAIXA' },
  { date: '2026-04-17', type: 'E', amount: 115,     account: 'AUÊ', supplier: 'ROSELAINE DA MOTA FELISBERTO', description: 'Pix cliente', category: 'ENTRADA CAIXA' },
  { date: '2026-04-17', type: 'E', amount: 630,     account: 'AUÊ', supplier: 'BARBARA G MOREIRA',         description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-04-17', type: 'E', amount: 1500,    account: 'AUÊ', supplier: 'KLAUS PETER WARKENTIN',     description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-04-15', type: 'E', amount: 100,     account: 'AUÊ', supplier: 'SEBASTIAO GUEDES',          description: 'Repasse cliente via Sebá', category: 'ENTRADA CAIXA' },
  { date: '2026-04-14', type: 'E', amount: 115,     account: 'AUÊ', supplier: 'ALBERTO DA SILVA BRANDAO',  description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-04-11', type: 'E', amount: 580,     account: 'AUÊ', supplier: 'VITORIA PERES COBO KOYAMA', description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-04-10', type: 'E', amount: 75,      account: 'AUÊ', supplier: 'ALCIDES AMERICO DE MELO NETO', description: 'Pix cliente', category: 'ENTRADA CAIXA' },
  { date: '2026-04-10', type: 'E', amount: 255.78,  account: 'AUÊ', supplier: 'SEBASTIAO GUEDES',          description: 'Repasse clientes via Sebá', category: 'ENTRADA CAIXA' },
  { date: '2026-04-08', type: 'E', amount: 75,      account: 'AUÊ', supplier: 'ALCIDES AMERICO DE MELO NETO', description: 'Pix cliente', category: 'ENTRADA CAIXA' },
  { date: '2026-04-08', type: 'E', amount: 200,     account: 'AUÊ', supplier: 'ROSELAINE DA MOTA FELISBERTO', description: 'Pix cliente', category: 'ENTRADA CAIXA' },
  { date: '2026-04-06', type: 'E', amount: 765,     account: 'AUÊ', supplier: 'TASSIA GOMES JARDIM BRANDAO', description: 'Pix cliente', category: 'ENTRADA CAIXA' },
  { date: '2026-04-01', type: 'E', amount: 1400,    account: 'AUÊ', supplier: 'SEBASTIAO GUEDES',          description: 'Repasse clientes via Sebá', category: 'ENTRADA CAIXA' },
  { date: '2026-03-30', type: 'E', amount: 580,     account: 'AUÊ', supplier: 'SILVANA COBO',              description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-03-28', type: 'E', amount: 1000,    account: 'AUÊ', supplier: 'ANA GABRIELA MONTEIRO SANTOS', description: 'Pix cliente', category: 'ENTRADA CAIXA' },
  { date: '2026-03-28', type: 'E', amount: 115,     account: 'AUÊ', supplier: 'EUNIRA KEIKO UCHIDA',       description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-03-26', type: 'E', amount: 1000,    account: 'AUÊ', supplier: 'BRUNA OLIVEIRA DE SOUSA',   description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-03-25', type: 'E', amount: 650,     account: 'AUÊ', supplier: 'ALBERTO DA SILVA BRANDAO',  description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-03-23', type: 'E', amount: 600,     account: 'AUÊ', supplier: 'VITORIA PERES COBO KOYAMA', description: 'Pix cliente',  category: 'ENTRADA CAIXA' },
  { date: '2026-03-22', type: 'E', amount: 135,     account: 'AUÊ', supplier: 'VERONICA CRISTINA GIRALDI', description: 'Repasse cliente via Vê', category: 'ENTRADA CAIXA' },
  { date: '2026-03-20', type: 'E', amount: 360,     account: 'AUÊ', supplier: 'VERONICA CRISTINA GIRALDI', description: 'Repasse cliente via Vê', category: 'ENTRADA CAIXA' },
  { date: '2026-03-17', type: 'E', amount: 987.32,  account: 'AUÊ', supplier: 'SEBASTIAO GUEDES',          description: 'Repasse clientes via Sebá', category: 'ENTRADA CAIXA' },

  // === RENDIMENTOS ===
  { date: '2026-05-15', type: 'E', amount: 0.85,    account: 'AUÊ', supplier: 'PICPAY',                    description: 'Rendimento conta', category: 'ENTRADA CAIXA' },
  { date: '2026-05-14', type: 'E', amount: 0.12,    account: 'AUÊ', supplier: 'PICPAY',                    description: 'Rendimento conta', category: 'ENTRADA CAIXA' },
  { date: '2026-05-13', type: 'E', amount: 0.50,    account: 'AUÊ', supplier: 'PICPAY',                    description: 'Rendimento conta', category: 'ENTRADA CAIXA' },
  { date: '2026-05-06', type: 'E', amount: 6.58,    account: 'AUÊ', supplier: 'PICPAY',                    description: 'Rendimento conta', category: 'ENTRADA CAIXA' },
  { date: '2026-05-04', type: 'E', amount: 3.99,    account: 'AUÊ', supplier: 'PICPAY',                    description: 'Rendimento conta', category: 'ENTRADA CAIXA' },
  { date: '2026-05-04', type: 'E', amount: 199,     account: 'AUÊ', supplier: 'MERCADO LIVRE',             description: 'Pix devolvido',    category: 'ENTRADA CAIXA' },

  // === DESPESAS NOVAS (não estão no banco) ===
  { date: '2026-05-22', type: 'S', amount: 342.19,  account: 'AUÊ', supplier: 'ENEL',                      description: 'Energia elétrica', category: 'ENERGIA ELÉTRICA' },
  { date: '2026-05-22', type: 'S', amount: 120.22,  account: 'AUÊ', supplier: 'SABESP',                    description: 'Água',             category: 'ÁGUA' },
  { date: '2026-05-21', type: 'S', amount: 29.90,   account: 'AUÊ', supplier: 'PASI',                      description: 'Outros',           category: 'OUTROS' },
  { date: '2026-05-19', type: 'S', amount: 20,      account: 'AUÊ', supplier: 'ESTACIONAMENTO',            description: 'Estacionamento',   category: 'OUTROS' },
  { date: '2026-05-19', type: 'S', amount: 215.66,  account: 'AUÊ', supplier: 'LOJÃO ESPORTES',            description: 'Infraestrutura',   category: 'INFRAESTRUTURA' },
  { date: '2026-05-19', type: 'S', amount: 239.95,  account: 'AUÊ', supplier: 'FEITO FILHO PET',           description: 'Infraestrutura',   category: 'INFRAESTRUTURA' },
  { date: '2026-05-19', type: 'S', amount: 522.50,  account: 'AUÊ', supplier: 'AF ACESSÓRIOS',             description: 'Infraestrutura',   category: 'INFRAESTRUTURA' },
  { date: '2026-05-19', type: 'S', amount: 598.86,  account: 'AUÊ', supplier: 'PREFEITURA OSASCO',         description: 'IPTU',             category: 'IMPOSTO IPTU' },
  { date: '2026-05-19', type: 'S', amount: 699.51,  account: 'AUÊ', supplier: 'PREFEITURA OSASCO',         description: 'IPTU',             category: 'IMPOSTO IPTU' },
  { date: '2026-05-19', type: 'S', amount: 683.22,  account: 'AUÊ', supplier: 'PREFEITURA OSASCO',         description: 'IPTU',             category: 'IMPOSTO IPTU' },
  { date: '2026-05-19', type: 'S', amount: 692.70,  account: 'AUÊ', supplier: 'PREFEITURA OSASCO',         description: 'IPTU',             category: 'IMPOSTO IPTU' },
  { date: '2026-05-15', type: 'S', amount: 123.38,  account: 'AUÊ', supplier: 'SEM PARAR',                 description: 'Sem Parar',        category: 'OUTROS' },
  { date: '2026-05-15', type: 'S', amount: 172.47,  account: 'AUÊ', supplier: 'SEM PARAR',                 description: 'Sem Parar',        category: 'OUTROS' },
  { date: '2026-05-15', type: 'S', amount: 6000,    account: 'AUÊ', supplier: 'ELAINE',                    description: 'Aluguel',          category: 'ALUGUEL' },
  { date: '2026-05-14', type: 'S', amount: 10,      account: 'AUÊ', supplier: 'JOEDSON',                   description: 'Outros',           category: 'OUTROS' },
  { date: '2026-05-14', type: 'S', amount: 10.04,   account: 'AUÊ', supplier: 'CASULO',                    description: 'Outros',           category: 'OUTROS' },
  { date: '2026-05-13', type: 'S', amount: 141.82,  account: 'AUÊ', supplier: 'CONTABILIDADE',             description: 'Contabilidade',    category: 'CONTABILIDADE' },
  { date: '2026-05-13', type: 'S', amount: 142.28,  account: 'AUÊ', supplier: 'CONTABILIDADE',             description: 'Contabilidade',    category: 'CONTABILIDADE' },
  { date: '2026-05-07', type: 'S', amount: 2151.85, account: 'AUÊ', supplier: 'SARAH',                     description: 'Salário Sarah',    category: 'FOLHA SALARIAL' },
  { date: '2026-05-06', type: 'S', amount: 79.90,   account: 'AUÊ', supplier: 'MERCADO LIVRE',             description: 'Compra ML',        category: 'INFRAESTRUTURA' },
  { date: '2026-05-04', type: 'S', amount: 304.52,  account: 'AUÊ', supplier: 'MERCADO LIVRE',             description: 'Compra ML',        category: 'INFRAESTRUTURA' },
  { date: '2026-04-23', type: 'S', amount: 163.96,  account: 'AUÊ', supplier: 'SABESP',                    description: 'Água',             category: 'ÁGUA' },
  { date: '2026-04-23', type: 'S', amount: 163.96,  account: 'AUÊ', supplier: 'SABESP',                    description: 'Água',             category: 'ÁGUA' },
  { date: '2026-04-14', type: 'S', amount: 99.90,   account: 'AUÊ', supplier: 'EBANX',                     description: 'Sistema cartão',   category: 'SISTEMA CARTÃO' },
  { date: '2026-04-02', type: 'S', amount: 183.95,  account: 'AUÊ', supplier: 'AUTOZONE',                  description: 'Prolabore/retirada', category: 'PROLABORE' },
  { date: '2026-03-28', type: 'S', amount: 265,     account: 'AUÊ', supplier: 'PETZ',                      description: 'Infraestrutura',   category: 'INFRAESTRUTURA' },
  { date: '2026-03-28', type: 'S', amount: 83.19,   account: 'AUÊ', supplier: 'FACEBOOK',                  description: 'Anúncios',         category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-03-28', type: 'S', amount: 300,     account: 'AUÊ', supplier: 'FACEBOOK',                  description: 'Anúncios',         category: 'COMUNICAÇÃO E MARKETING' },
]

async function main() {
  await login()

  // Filtrar os que já estão no banco
  const toImport = ALL_ENTRIES.filter(e => {
    const key = `${e.date}|${e.type}|${e.amount}`
    return !JA_NO_BANCO.has(key)
  })

  console.log(`Importando ${toImport.length} lançamentos do PicPay...`)

  let ok = 0, err = 0
  for (const entry of toImport) {
    const res = await request('/api/financeiro', 'POST', entry, 'application/json')
    if (res.status === 201 || res.status === 200) { ok++; process.stdout.write('.') }
    else { console.error(`\nERRO ${res.status} em ${entry.date} ${entry.supplier}: ${res.body}`); err++ }
  }
  console.log(`\nConcluído: ${ok} importados, ${err} erros.`)
}

main().catch(console.error)
