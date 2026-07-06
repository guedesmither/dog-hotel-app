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

// Extrato PicPay completo
// Regras:
// - Transferência para AUÊ (R$8754.62) = transferência entre contas próprias → IGNORAR
// - Pix recebidos de Sebá/Verônica = repasse de gastos deles → IGNORAR (já lançados como despesas deles)
// - Rendimentos = ENTRADA CAIXA
// - Pix recebidos de clientes = ENTRADA CAIXA
// - Pix enviados = despesas → verificar se já estão no banco

const SOCIOS = ['SEBASTIAO GUEDES DE CAMARGO JUNIOR', 'SEBASTIÃO GUEDES DE CAMARGO JUNIOR', 'VERONICA CRISTINA GIRALDI']

const PICPAY = [
  // Maio 2026
  { date: '2026-05-26', type: 'S', amount: 8754.62, name: 'AUE PETCARE E LAZER LTDA',        skip: true,  reason: 'Transferência entre contas próprias' },
  { date: '2026-05-26', type: 'E', amount: 310,     name: 'LEANDRO DALECIO MANCANO',          cliente: true },
  { date: '2026-05-26', type: 'E', amount: 340,     name: 'CARLA AKEMI SATO',                 cliente: true },
  { date: '2026-05-26', type: 'E', amount: 110,     name: 'FERNANDA OLIVEIRA DE SOUZA',       cliente: true },
  { date: '2026-05-22', type: 'E', amount: 580,     name: 'Vitória Peres Cobo Koyama',        cliente: true },
  { date: '2026-05-22', type: 'S', amount: 342.19,  name: 'ELETROPAULO',                      supplier: 'ENEL',          category: 'ENERGIA ELÉTRICA' },
  { date: '2026-05-22', type: 'S', amount: 120.22,  name: 'SABESP',                           supplier: 'SABESP',        category: 'ÁGUA' },
  { date: '2026-05-21', type: 'E', amount: 1000,    name: 'NEUSA TOMOE KUGA YAMAJI',          cliente: true },
  { date: '2026-05-21', type: 'E', amount: 2438,    name: 'JOSIVALDO TENORIO GUEDES',         cliente: true },
  { date: '2026-05-21', type: 'S', amount: 29.90,   name: 'PASI SERVICOS E BENEFICIOS',       supplier: 'PASI',          category: 'OUTROS' },
  { date: '2026-05-19', type: 'E', amount: 110,     name: 'SEBASTIAO GUEDES DE CAMARGO JUNIOR', skip: true, reason: 'Repasse sócio' },
  { date: '2026-05-19', type: 'S', amount: 20,      name: 'G PARK ESTACIONAMENTO',            supplier: 'ESTACIONAMENTO', category: 'OUTROS' },
  { date: '2026-05-19', type: 'S', amount: 215.66,  name: 'LOJAO DOS ESPORTES',               supplier: 'LOJÃO ESPORTES', category: 'INFRAESTRUTURA' },
  { date: '2026-05-19', type: 'S', amount: 239.95,  name: 'FEITO FILHO PET',                  supplier: 'FEITO FILHO PET', category: 'INFRAESTRUTURA' },
  { date: '2026-05-19', type: 'S', amount: 522.50,  name: 'A F COMERCIO ACESSORIOS',          supplier: 'AF ACESSÓRIOS', category: 'INFRAESTRUTURA' },
  { date: '2026-05-19', type: 'S', amount: 598.86,  name: 'MUNICIPIO DE OSASCO IPTU',         supplier: 'PREFEITURA OSASCO', category: 'IMPOSTO IPTU' },
  { date: '2026-05-19', type: 'S', amount: 699.51,  name: 'MUNICIPIO DE OSASCO IPTU',         supplier: 'PREFEITURA OSASCO', category: 'IMPOSTO IPTU' },
  { date: '2026-05-19', type: 'S', amount: 683.22,  name: 'MUNICIPIO DE OSASCO IPTU',         supplier: 'PREFEITURA OSASCO', category: 'IMPOSTO IPTU' },
  { date: '2026-05-19', type: 'S', amount: 692.70,  name: 'MUNICIPIO DE OSASCO IPTU',         supplier: 'PREFEITURA OSASCO', category: 'IMPOSTO IPTU' },
  { date: '2026-05-15', type: 'S', amount: 123.38,  name: 'SEM PARAR',                        supplier: 'SEM PARAR',     category: 'OUTROS' },
  { date: '2026-05-15', type: 'S', amount: 172.47,  name: 'SEM PARAR',                        supplier: 'SEM PARAR',     category: 'OUTROS' },
  { date: '2026-05-15', type: 'S', amount: 6000,    name: 'ELAINE DUMAS NETO',                supplier: 'ELAINE',        category: 'ALUGUEL' },
  { date: '2026-05-15', type: 'E', amount: 0.85,    name: 'Rendimento de conta',              supplier: 'PICPAY',        category: 'ENTRADA CAIXA' },
  { date: '2026-05-14', type: 'S', amount: 10,      name: 'Joedson Jose da Silva',            supplier: 'JOEDSON',       category: 'OUTROS' },
  { date: '2026-05-14', type: 'S', amount: 10.04,   name: 'CASULO DISTRIBUIDORA',             supplier: 'CASULO',        category: 'OUTROS' },
  { date: '2026-05-14', type: 'E', amount: 0.12,    name: 'Rendimento de conta',              supplier: 'PICPAY',        category: 'ENTRADA CAIXA' },
  { date: '2026-05-13', type: 'E', amount: 460,     name: 'Aline Gonzalez',                   cliente: true },
  { date: '2026-05-13', type: 'S', amount: 141.82,  name: 'CONTAAGIL',                        supplier: 'CONTABILIDADE', category: 'CONTABILIDADE' },
  { date: '2026-05-13', type: 'S', amount: 142.28,  name: 'CONTAAGIL',                        supplier: 'CONTABILIDADE', category: 'CONTABILIDADE' },
  { date: '2026-05-13', type: 'E', amount: 100,     name: 'VALERIA BELLATO',                  cliente: true },
  { date: '2026-05-13', type: 'E', amount: 0.50,    name: 'Rendimento de conta',              supplier: 'PICPAY',        category: 'ENTRADA CAIXA' },
  { date: '2026-05-11', type: 'E', amount: 450,     name: 'ALEXANDRA PEIXOTO DEMORI LIMA',    cliente: true },
  { date: '2026-05-10', type: 'E', amount: 2230,    name: 'SEBASTIAO GUEDES DE CAMARGO JUNIOR', skip: true, reason: 'Repasse sócio' },
  { date: '2026-05-08', type: 'E', amount: 240,     name: 'BARBARA G MOREIRA',                cliente: true },
  { date: '2026-05-08', type: 'E', amount: 380,     name: '61.242.033 VALERIA BELLATO',       cliente: true },
  { date: '2026-05-07', type: 'S', amount: 2151.85, name: 'SARAH VICTORIA BATISTA DE ANDRADE', supplier: 'SARAH',       category: 'FOLHA SALARIAL' },
  { date: '2026-05-07', type: 'E', amount: 110,     name: 'EDSON PEREIRA DE MORAIS JUNIOR',   cliente: true },
  { date: '2026-05-06', type: 'E', amount: 2400,    name: 'EUNIRA KEIKO UCHIDA',              cliente: true },
  { date: '2026-05-06', type: 'S', amount: 79.90,   name: 'PIX Marketplace',                  supplier: 'MERCADO LIVRE', category: 'INFRAESTRUTURA' },
  { date: '2026-05-06', type: 'E', amount: 6.58,    name: 'Rendimento de conta',              supplier: 'PICPAY',        category: 'ENTRADA CAIXA' },
  { date: '2026-05-04', type: 'E', amount: 199,     name: 'PIX devolvido Marketplace',        supplier: 'MERCADO LIVRE', category: 'ENTRADA CAIXA' },
  { date: '2026-05-04', type: 'E', amount: 877.50,  name: 'EDSON PEREIRA DE MORAIS JUNIOR',   cliente: true },
  { date: '2026-05-04', type: 'S', amount: 304.52,  name: 'PIX Marketplace',                  supplier: 'MERCADO LIVRE', category: 'INFRAESTRUTURA' },
  { date: '2026-05-04', type: 'S', amount: 0.01,    name: 'SEBASTIAO GUEDES DE CAMARGO JUNIOR', skip: true, reason: 'Teste Pix' },
  { date: '2026-05-04', type: 'E', amount: 965.20,  name: 'SEBASTIAO GUEDES DE CAMARGO JUNIOR', skip: true, reason: 'Repasse sócio' },
  { date: '2026-05-04', type: 'E', amount: 3.99,    name: 'Rendimento de conta',              supplier: 'PICPAY',        category: 'ENTRADA CAIXA' },
  { date: '2026-05-03', type: 'E', amount: 150,     name: 'BARBARA G MOREIRA',                cliente: true },
  { date: '2026-05-02', type: 'E', amount: 450,     name: 'Rafaela Rodrigues Nobre',          cliente: true },
  { date: '2026-05-02', type: 'E', amount: 580,     name: 'SILVANA COBO',                     cliente: true },
  { date: '2026-05-01', type: 'E', amount: 450,     name: 'BARBARA G MOREIRA',                cliente: true },
  { date: '2026-05-01', type: 'S', amount: 237.15,  name: 'PIX Marketplace',                  supplier: 'MERCADO LIVRE', category: 'INFRAESTRUTURA' },

  // Abril 2026
  { date: '2026-04-30', type: 'E', amount: 640,     name: 'GABRIELA CARVALHO BITTENCOURT',    cliente: true },
  { date: '2026-04-28', type: 'E', amount: 225,     name: 'LEONARDO CICOTTI GOUVEIA GATTERMAYER', cliente: true },
  { date: '2026-04-28', type: 'S', amount: 100,     name: 'LOCATOM',                          supplier: 'LOCATOM',       category: 'INFRAESTRUTURA' },
  { date: '2026-04-28', type: 'E', amount: 942.04,  name: 'SEBASTIAO GUEDES DE CAMARGO JUNIOR', skip: true, reason: 'Repasse sócio' },
  { date: '2026-04-25', type: 'E', amount: 240,     name: 'BARBARA G MOREIRA',                cliente: true },
  { date: '2026-04-24', type: 'E', amount: 200,     name: 'ROSELAINE DA MOTA FELISBERTO',     cliente: true },
  { date: '2026-04-23', type: 'S', amount: 163.96,  name: 'SABESP',                           supplier: 'SABESP',        category: 'ÁGUA' },
  { date: '2026-04-23', type: 'S', amount: 163.96,  name: 'SABESP',                           supplier: 'SABESP',        category: 'ÁGUA' },
  { date: '2026-04-23', type: 'E', amount: 386.08,  name: 'SEBASTIAO GUEDES DE CAMARGO JUNIOR', skip: true, reason: 'Repasse sócio' },
  { date: '2026-04-23', type: 'E', amount: 120,     name: 'SEBASTIAO GUEDES DE CAMARGO JUNIOR', skip: true, reason: 'Repasse sócio' },
  { date: '2026-04-23', type: 'E', amount: 576,     name: 'CRISTIANE PEREIRA DE MELO MANCANO', cliente: true },
  { date: '2026-04-17', type: 'E', amount: 115,     name: 'ROSELAINE DA MOTA FELISBERTO',     cliente: true },
  { date: '2026-04-17', type: 'E', amount: 630,     name: 'BARBARA G MOREIRA',                cliente: true },
  { date: '2026-04-17', type: 'E', amount: 1500,    name: 'KLAUS PETER WARKENTIN',            cliente: true },
  { date: '2026-04-15', type: 'E', amount: 100,     name: 'SEBASTIAO GUEDES DE CAMARGO JUNIOR', skip: true, reason: 'Repasse sócio' },
  { date: '2026-04-14', type: 'S', amount: 99.90,   name: 'EBANX Ltda.',                      supplier: 'EBANX',         category: 'SISTEMA CARTÃO' },
  { date: '2026-04-14', type: 'E', amount: 115,     name: 'ALBERTO DA SILVA BRANDAO',         cliente: true },
  { date: '2026-04-11', type: 'E', amount: 580,     name: 'VITORIA PERES COBO KOYAMA',        cliente: true },
  { date: '2026-04-10', type: 'E', amount: 75,      name: 'ALCIDES AMERICO DE MELO NETO',     cliente: true },
  { date: '2026-04-10', type: 'E', amount: 255.78,  name: 'SEBASTIAO GUEDES DE CAMARGO JUNIOR', skip: true, reason: 'Repasse sócio' },
  { date: '2026-04-10', type: 'S', amount: 50,      name: 'SARAH VICTORIA BATISTA DE ANDRADE', supplier: 'SARAH',        category: 'FOLHA SALARIAL' },
  { date: '2026-04-08', type: 'E', amount: 75,      name: 'ALCIDES AMERICO DE MELO NETO',     cliente: true },
  { date: '2026-04-08', type: 'S', amount: 2197.34, name: 'SARAH VICTORIA BATISTA DE ANDRADE', supplier: 'SARAH',        category: 'FOLHA SALARIAL' },
  { date: '2026-04-08', type: 'E', amount: 200,     name: 'ROSELAINE DA MOTA FELISBERTO',     cliente: true },
  { date: '2026-04-08', type: 'S', amount: 1700,    name: 'SEBASTIÃO GUEDES DE CAMARGO JUNIOR', supplier: 'RETIRADA SEBÁ', category: 'PROLABORE' },
  { date: '2026-04-07', type: 'S', amount: 101.49,  name: 'ELETROPAULO',                      supplier: 'ENEL',          category: 'ENERGIA ELÉTRICA' },
  { date: '2026-04-07', type: 'S', amount: 303.01,  name: 'ELETROPAULO',                      supplier: 'ENEL',          category: 'ENERGIA ELÉTRICA' },
  { date: '2026-04-06', type: 'E', amount: 765,     name: 'TASSIA GOMES JARDIM BRANDAO',      cliente: true },
  { date: '2026-04-02', type: 'S', amount: 199.97,  name: 'IFOOD',                            supplier: 'IFOOD',         category: 'PROLABORE' },
  { date: '2026-04-02', type: 'S', amount: 150,     name: 'NOVA GRANADA (GASOLINA)',          supplier: 'NOVA GRANADA',  category: 'PROLABORE' },
  { date: '2026-04-02', type: 'S', amount: 183.95,  name: 'AUTOZONE',                         supplier: 'AUTOZONE',      category: 'PROLABORE' },
  { date: '2026-04-02', type: 'S', amount: 25.31,   name: 'ELETROPAULO',                      supplier: 'ENEL',          category: 'PROLABORE' },
  { date: '2026-04-01', type: 'E', amount: 1400,    name: 'SEBASTIAO GUEDES DE CAMARGO JUNIOR', skip: true, reason: 'Repasse sócio' },
  { date: '2026-04-01', type: 'S', amount: 125.56,  name: 'ELETROPAULO',                      supplier: 'ENEL',          category: 'PROLABORE' },
  { date: '2026-04-01', type: 'S', amount: 24.19,   name: 'ELETROPAULO',                      supplier: 'ENEL',          category: 'PROLABORE' },
  { date: '2026-04-01', type: 'S', amount: 34.21,   name: 'ELETROPAULO',                      supplier: 'ENEL',          category: 'ENERGIA ELÉTRICA' },
  { date: '2026-04-01', type: 'S', amount: 161.48,  name: 'SABESP',                           supplier: 'SABESP',        category: 'ÁGUA' },

  // Março 2026
  { date: '2026-03-30', type: 'E', amount: 580,     name: 'SILVANA COBO',                     cliente: true },
  { date: '2026-03-30', type: 'S', amount: 56,      name: 'JOYCE DANIELLI FERREIRA',          supplier: 'MARQUES',       category: 'INFRAESTRUTURA' },
  { date: '2026-03-30', type: 'S', amount: 55,      name: 'OZ DISTRIBUIDORA',                 supplier: 'SODIMAC',       category: 'INFRAESTRUTURA' },
  { date: '2026-03-30', type: 'S', amount: 85,      name: 'TELEFONICA BRASIL',                supplier: 'TELEFÔNICA',    category: 'INTERNET' },
  { date: '2026-03-30', type: 'S', amount: 59,      name: 'TELEFONICA BRASIL',                supplier: 'TELEFÔNICA',    category: 'INTERNET' },
  { date: '2026-03-30', type: 'S', amount: 49.20,   name: 'PALADIO',                          supplier: 'PALÁDIO',       category: 'INFRAESTRUTURA' },
  { date: '2026-03-28', type: 'S', amount: 265,     name: 'PET CENTER',                       supplier: 'PETZ',          category: 'INFRAESTRUTURA' },
  { date: '2026-03-28', type: 'E', amount: 1000,    name: 'ANA GABRIELA MONTEIRO SANTOS',     cliente: true },
  { date: '2026-03-28', type: 'E', amount: 115,     name: 'EUNIRA KEIKO UCHIDA',              cliente: true },
  { date: '2026-03-28', type: 'S', amount: 11.77,   name: 'SUPERMERCADO TROPICAL',            supplier: 'TROPICAL',      category: 'OUTROS' },
  { date: '2026-03-28', type: 'S', amount: 11.51,   name: 'EMPORIO DO PARQUE',                supplier: 'EMPÓRIO PARQUE', category: 'PROLABORE' },
  { date: '2026-03-28', type: 'S', amount: 83.19,   name: 'FACEBOOK',                         supplier: 'FACEBOOK',      category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-03-28', type: 'S', amount: 300,     name: 'FACEBOOK',                         supplier: 'FACEBOOK',      category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-03-26', type: 'S', amount: 271.96,  name: 'PIX Marketplace',                  supplier: 'MERCADO LIVRE', category: 'INFRAESTRUTURA' },
  { date: '2026-03-26', type: 'E', amount: 1000,    name: 'BRUNA OLIVEIRA DE SOUSA',          cliente: true },
  { date: '2026-03-25', type: 'E', amount: 650,     name: 'ALBERTO DA SILVA BRANDAO',         cliente: true },
  { date: '2026-03-25', type: 'S', amount: 142,     name: 'CONTAAGIL',                        supplier: 'CONTABILIDADE', category: 'CONTABILIDADE' },
  { date: '2026-03-24', type: 'S', amount: 42.25,   name: 'JOYCE DANIELLI FERREIRA',          supplier: 'MARQUES',       category: 'INFRAESTRUTURA' },
  { date: '2026-03-23', type: 'E', amount: 600,     name: 'VITORIA PERES COBO KOYAMA',        cliente: true },
  { date: '2026-03-22', type: 'E', amount: 135,     name: 'VERONICA CRISTINA GIRALDI',        skip: true, reason: 'Repasse sócia' },
  { date: '2026-03-20', type: 'E', amount: 360,     name: 'VERONICA CRISTINA GIRALDI',        skip: true, reason: 'Repasse sócia' },
  { date: '2026-03-17', type: 'E', amount: 987.32,  name: 'SEBASTIAO GUEDES DE CAMARGO JUNIOR', skip: true, reason: 'Repasse sócio' },
]

async function main() {
  await login()
  const res = await request('/api/financeiro')
  const banco = JSON.parse(res.body)

  // Indexar banco por date+amount+type para detectar duplicatas
  const bancoIdx = new Set()
  for (const e of banco) {
    const d = e.date.split('T')[0]
    bancoIdx.add(`${d}|${e.type}|${e.amount}`)
  }

  const toImport = []
  const skipped = []
  const jaExiste = []
  const clientes = []

  for (const row of PICPAY) {
    if (row.skip) { skipped.push(row); continue }
    if (row.cliente) { clientes.push(row); continue }

    const key = `${row.date}|${row.type}|${row.amount}`
    if (bancoIdx.has(key)) {
      jaExiste.push(row)
    } else {
      toImport.push(row)
    }
  }

  console.log(`\n=== RESUMO ===`)
  console.log(`Total PicPay: ${PICPAY.length}`)
  console.log(`Ignorados (transferências internas/repassse sócios): ${skipped.length}`)
  console.log(`Clientes (ENTRADA CAIXA): ${clientes.length}`)
  console.log(`Já existem no banco (mesma data+valor+tipo): ${jaExiste.length}`)
  console.log(`Para importar: ${toImport.length}`)

  if (jaExiste.length) {
    console.log(`\n=== JÁ EXISTEM (não vão ser duplicados) ===`)
    for (const e of jaExiste) console.log(`  ${e.date} ${e.type} R$${e.amount} - ${e.name}`)
  }

  if (toImport.length) {
    console.log(`\n=== NOVOS PARA IMPORTAR ===`)
    for (const e of toImport) console.log(`  ${e.date} ${e.type} R$${e.amount} - ${e.name} → ${e.category}`)
  }

  if (clientes.length) {
    console.log(`\n=== ENTRADAS DE CLIENTES (ENTRADA CAIXA) ===`)
    for (const e of clientes) console.log(`  ${e.date} R$${e.amount} - ${e.name}`)
  }

  return { toImport, clientes }
}

main().catch(console.error)
