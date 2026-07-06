import http from 'http'
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

// Conta: AUÊ no arquivo original = conta pessoal do Sebá usada para o negócio → SEBÁ no sistema
// Conta: VÊ = Verônica → VÊ
// Conta: NICE = aporte NICE → NICE
// Conta: AUÊ (a partir de mar/2026, conta PJ real) → AUÊ

const ENTRIES = [
  // DEZ 2025 — PRE_INAUGURACAO
  { date: '2025-12-04', type: 'S', amount: 139,     account: 'SEBÁ', supplier: 'ÁGIL CONT.',    description: 'Abertura - mensalidade',    category: 'CONTABILIDADE' },
  { date: '2025-12-07', type: 'S', amount: 418.56,  account: 'SEBÁ', supplier: 'LEROY MERLIN',  description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-07', type: 'S', amount: 1497.12, account: 'VÊ',   supplier: 'SODIMAC',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-10', type: 'S', amount: 336.4,   account: 'SEBÁ', supplier: 'MERCADO LIVRE', description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-10', type: 'S', amount: 1137.11, account: 'SEBÁ', supplier: 'MERCADO LIVRE', description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-10', type: 'E', amount: 3000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2025-12-11', type: 'S', amount: 211.01,  account: 'SEBÁ', supplier: 'ÁGIL CONT.',    description: 'Taxa Junta Comercial',      category: 'TAXA JUNTA COMERCIAL' },
  { date: '2025-12-11', type: 'E', amount: 4000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2025-12-11', type: 'S', amount: 3015.83, account: 'SEBÁ', supplier: 'OSASFERRO',     description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-12', type: 'S', amount: 1188.18, account: 'SEBÁ', supplier: 'SODIMAC',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-13', type: 'S', amount: 227.5,   account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-13', type: 'S', amount: 130.87,  account: 'SEBÁ', supplier: 'MARMITA',       description: 'Alimentação pedreiros',     category: 'OUTROS' },
  { date: '2025-12-13', type: 'S', amount: 102.8,   account: 'SEBÁ', supplier: 'SODIMAC',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-15', type: 'S', amount: 1000,    account: 'VÊ',   supplier: 'SIDEVANDO',     description: 'Pedreiro',                  category: 'OBRA' },
  { date: '2025-12-15', type: 'S', amount: 756,     account: 'SEBÁ', supplier: 'OSASFERRO',     description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-15', type: 'S', amount: 97,      account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-16', type: 'E', amount: 5000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2025-12-16', type: 'S', amount: 1175,    account: 'SEBÁ', supplier: 'DESTAK',        description: 'Fachada',                   category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2025-12-16', type: 'S', amount: 1500,    account: 'SEBÁ', supplier: 'FRANK',         description: 'Serralheiro',               category: 'OBRA' },
  { date: '2025-12-16', type: 'S', amount: 244,     account: 'SEBÁ', supplier: 'OSASFERRO',     description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-16', type: 'S', amount: 261.52,  account: 'SEBÁ', supplier: 'SODIMAC',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-17', type: 'S', amount: 124,     account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-17', type: 'S', amount: 399.65,  account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-17', type: 'S', amount: 900.93,  account: 'SEBÁ', supplier: 'LEROY MERLIN',  description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-19', type: 'S', amount: 1175,    account: 'SEBÁ', supplier: 'DESTAK',        description: 'Fachada',                   category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2025-12-19', type: 'E', amount: 2000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2025-12-22', type: 'S', amount: 156,     account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-22', type: 'S', amount: 92,      account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-22', type: 'S', amount: 40,      account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-22', type: 'S', amount: 1000,    account: 'SEBÁ', supplier: 'SIDEVANDO',     description: 'Pedreiro',                  category: 'OBRA' },
  { date: '2025-12-22', type: 'S', amount: 1023.6,  account: 'SEBÁ', supplier: 'SODIMAC',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-22', type: 'S', amount: 54,      account: 'SEBÁ', supplier: 'MINA DE OURO',  description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-22', type: 'S', amount: 334,     account: 'SEBÁ', supplier: 'SODIMAC',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-23', type: 'S', amount: 210,     account: 'VÊ',   supplier: 'CESTAS PINTORES',description: 'Outros',                   category: 'OUTROS' },
  { date: '2025-12-23', type: 'S', amount: 100,     account: 'VÊ',   supplier: 'ASSINATURA',    description: 'Outros',                    category: 'OUTROS' },
  { date: '2025-12-24', type: 'E', amount: 4000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2025-12-26', type: 'S', amount: 1408,    account: 'SEBÁ', supplier: 'CORANTE',       description: 'Material obra',             category: 'OBRA' },
  { date: '2025-12-26', type: 'S', amount: 2500,    account: 'SEBÁ', supplier: 'PINTORES',      description: 'Pintores',                  category: 'OBRA' },
  { date: '2025-12-26', type: 'S', amount: 100,     account: 'SEBÁ', supplier: 'REMOÇÃO SOFÁ',  description: 'Outros',                    category: 'OUTROS' },
  { date: '2025-12-30', type: 'S', amount: 1173,    account: 'SEBÁ', supplier: 'CORANTE',       description: 'Material obra',             category: 'OBRA' },

  // JAN 2026 — PRE_INAUGURACAO
  { date: '2026-01-02', type: 'S', amount: 2000,    account: 'SEBÁ', supplier: 'PINTORES',      description: 'Adiantamento pintores',     category: 'OBRA' },
  { date: '2026-01-02', type: 'S', amount: 750,     account: 'SEBÁ', supplier: 'SODIMAC',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-05', type: 'E', amount: 6000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2026-01-07', type: 'S', amount: 936,     account: 'SEBÁ', supplier: 'LEROY MERLIN',  description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-07', type: 'S', amount: 590,     account: 'SEBÁ', supplier: 'AVCB',          description: 'Alvará bombeiros',          category: 'TAXA BOMBEIROS' },
  { date: '2026-01-07', type: 'S', amount: 60,      account: 'SEBÁ', supplier: 'ASSOCIAÇÃO',    description: 'Associação',                category: 'ASSOCIAÇÃO' },
  { date: '2026-01-08', type: 'S', amount: 300,     account: 'SEBÁ', supplier: 'LOCATOM',       description: 'Andaimes',                  category: 'OBRA' },
  { date: '2026-01-09', type: 'S', amount: 2000,    account: 'SEBÁ', supplier: 'PINTORES',      description: 'Pintores',                  category: 'OBRA' },
  { date: '2026-01-09', type: 'S', amount: 80,      account: 'SEBÁ', supplier: 'PINTORES',      description: 'Gratificação pintores',     category: 'OBRA' },
  { date: '2026-01-09', type: 'S', amount: 140,     account: 'SEBÁ', supplier: 'TRANSPORTE',    description: 'Transporte paletes',        category: 'OBRA' },
  { date: '2026-01-09', type: 'S', amount: 540,     account: 'SEBÁ', supplier: 'PALLETE',       description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-01-09', type: 'S', amount: 506.32,  account: 'SEBÁ', supplier: 'LEROY MERLIN',  description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-10', type: 'S', amount: 60,      account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-10', type: 'S', amount: 52.35,   account: 'VÊ',   supplier: 'MOLDES',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-01-12', type: 'S', amount: 139,     account: 'SEBÁ', supplier: 'CONTABILIDADE', description: 'Contabilidade',             category: 'CONTABILIDADE' },
  { date: '2026-01-12', type: 'S', amount: 400,     account: 'SEBÁ', supplier: 'SIDEVANDO',     description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-13', type: 'S', amount: 128,     account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-14', type: 'S', amount: 355,     account: 'SEBÁ', supplier: 'CORANTE',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-14', type: 'S', amount: 1000,    account: 'SEBÁ', supplier: 'SIDEVANDO',     description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-14', type: 'S', amount: 233.04,  account: 'SEBÁ', supplier: 'LEROY MERLIN',  description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-15', type: 'E', amount: 7000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2026-01-15', type: 'S', amount: 6,       account: 'SEBÁ', supplier: 'CORANTE',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-16', type: 'S', amount: 6000,    account: 'SEBÁ', supplier: 'ELAINE',        description: 'Aluguel',                   category: 'ALUGUEL' },
  { date: '2026-01-17', type: 'S', amount: 1042.57, account: 'SEBÁ', supplier: 'LEROY MERLIN',  description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-17', type: 'S', amount: 626.86,  account: 'SEBÁ', supplier: 'SODIMAC',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-17', type: 'S', amount: 221.8,   account: 'SEBÁ', supplier: 'SODIMAC',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-17', type: 'S', amount: 49.6,    account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-17', type: 'S', amount: 151,     account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-19', type: 'S', amount: 2000,    account: 'SEBÁ', supplier: 'PINTORES',      description: 'Pintores',                  category: 'OBRA' },
  { date: '2026-01-19', type: 'E', amount: 5000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2026-01-20', type: 'S', amount: 1553,    account: 'SEBÁ', supplier: 'LEROY MERLIN',  description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-20', type: 'S', amount: 218,     account: 'SEBÁ', supplier: 'SIDEVANDO',     description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-20', type: 'S', amount: 249.85,  account: 'VÊ',   supplier: 'GRÁFICA TEXTIL', description: 'Camisetas Japan',          category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-01-22', type: 'S', amount: 47.7,    account: 'SEBÁ', supplier: 'SODIMAC',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-22', type: 'S', amount: 254.4,   account: 'SEBÁ', supplier: 'SODIMAC',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-22', type: 'S', amount: 1079.26, account: 'SEBÁ', supplier: 'LEROY MERLIN',  description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-22', type: 'S', amount: 114.81,  account: 'SEBÁ', supplier: 'LEROY MERLIN',  description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-22', type: 'S', amount: 206,     account: 'SEBÁ', supplier: 'MERCADO LIVRE', description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-22', type: 'E', amount: 3000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2026-01-23', type: 'S', amount: 651.77,  account: 'SEBÁ', supplier: 'LEROY MERLIN',  description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-23', type: 'S', amount: 30,      account: 'VÊ',   supplier: 'GRÁFICA TEXTIL', description: 'Camisetas Japan',          category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-01-24', type: 'S', amount: 1400,    account: 'SEBÁ', supplier: 'PINTORES',      description: 'Pintores',                  category: 'OBRA' },
  { date: '2026-01-24', type: 'S', amount: 1000,    account: 'VÊ',   supplier: 'PINTORES',      description: 'Pintores',                  category: 'OBRA' },
  { date: '2026-01-24', type: 'S', amount: 57.08,   account: 'VÊ',   supplier: 'OUTROS',        description: 'Outros',                    category: 'OUTROS' },
  { date: '2026-01-26', type: 'S', amount: 420,     account: 'SEBÁ', supplier: 'CAÇAMBA',       description: 'Caçamba entulho',           category: 'OBRA' },
  { date: '2026-01-26', type: 'S', amount: 206,     account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-26', type: 'S', amount: 47.88,   account: 'VÊ',   supplier: 'PAGBANK',       description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-01-27', type: 'S', amount: 1340,    account: 'SEBÁ', supplier: 'LEROY MERLIN',  description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-27', type: 'E', amount: 1500,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2026-01-28', type: 'S', amount: 355,     account: 'SEBÁ', supplier: 'CORANTE',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-29', type: 'S', amount: 100,     account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material obra',             category: 'OBRA' },
  { date: '2026-01-29', type: 'E', amount: 1500,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },

  // FEV 2026 — misto PRE_INAUGURACAO (até 08/02) e 2026-02 (a partir de 09/02)
  { date: '2026-02-02', type: 'S', amount: 232.27,  account: 'SEBÁ', supplier: 'MATERIAL PET',  description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-02', type: 'S', amount: 453.18,  account: 'SEBÁ', supplier: 'MATERIAL PET',  description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-02', type: 'S', amount: 211.79,  account: 'VÊ',   supplier: 'MATERIAL PET',  description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-02', type: 'S', amount: 1551,    account: 'VÊ',   supplier: 'MATERIAL PET',  description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-02', type: 'S', amount: 15,      account: 'VÊ',   supplier: 'MATERIAL PET',  description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-02', type: 'E', amount: 3000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2026-02-02', type: 'S', amount: 1000,    account: 'SEBÁ', supplier: 'PINTORES',      description: 'Pintores',                  category: 'OBRA' },
  { date: '2026-02-02', type: 'S', amount: 1000,    account: 'SEBÁ', supplier: 'PINTORES',      description: 'Pintores',                  category: 'OBRA' },
  { date: '2026-02-02', type: 'S', amount: 784.09,  account: 'SEBÁ', supplier: 'LEROY MERLIN',  description: 'Material',                  category: 'OBRA' },
  { date: '2026-02-02', type: 'S', amount: 439.96,  account: 'SEBÁ', supplier: 'CASULO',        description: 'Material',                  category: 'OBRA' },
  { date: '2026-02-02', type: 'S', amount: 1664.3,  account: 'VÊ',   supplier: 'LEROY MERLIN',  description: 'Material',                  category: 'OBRA' },
  { date: '2026-02-02', type: 'S', amount: 75.7,    account: 'VÊ',   supplier: 'KALUNGA',       description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-02-02', type: 'S', amount: 97.5,    account: 'VÊ',   supplier: 'TECIDO',        description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-02-02', type: 'S', amount: 49.97,   account: 'VÊ',   supplier: 'CAMISETA',      description: 'Comunicação/uniforme',      category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-02-03', type: 'S', amount: 449.5,   account: 'SEBÁ', supplier: 'MERCADO LIVRE', description: 'Material geral',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-03', type: 'S', amount: 17,      account: 'SEBÁ', supplier: 'KALUNGA',       description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-02-03', type: 'S', amount: 220,     account: 'SEBÁ', supplier: 'SMART MADEIRAS', description: 'Material',                 category: 'OBRA' },
  { date: '2026-02-03', type: 'S', amount: 2515.37, account: 'VÊ',   supplier: 'LEROY MERLIN',  description: 'Material',                  category: 'OBRA' },
  { date: '2026-02-03', type: 'S', amount: 903.52,  account: 'VÊ',   supplier: 'ATACADÃO',      description: 'Material',                  category: 'OBRA' },
  { date: '2026-02-04', type: 'S', amount: 398,     account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material',                  category: 'OBRA' },
  { date: '2026-02-04', type: 'S', amount: 180,     account: 'VÊ',   supplier: 'JOSENOR',       description: 'Serviço',                   category: 'OBRA' },
  { date: '2026-02-04', type: 'S', amount: 1288.92, account: 'VÊ',   supplier: 'NEON',          description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-04', type: 'S', amount: 86.4,    account: 'VÊ',   supplier: 'QR CODE PAREDE', description: 'Infraestrutura',           category: 'INFRAESTRUTURA' },
  { date: '2026-02-05', type: 'S', amount: 223,     account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material',                  category: 'OBRA' },
  { date: '2026-02-05', type: 'S', amount: 213,     account: 'SEBÁ', supplier: 'MADEREIRA SANTANA', description: 'Material',             category: 'OBRA' },
  { date: '2026-02-05', type: 'S', amount: 128.5,   account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-05', type: 'S', amount: 140,     account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-05', type: 'S', amount: 69.58,   account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-05', type: 'S', amount: 62.99,   account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-05', type: 'S', amount: 117.8,   account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-05', type: 'S', amount: 269.18,  account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-05', type: 'S', amount: 66.49,   account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-06', type: 'E', amount: 1000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2026-02-06', type: 'S', amount: 145.2,   account: 'SEBÁ', supplier: 'JAPA ADESIVOS', description: 'Adesivos geladeira',        category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-02-06', type: 'S', amount: 150,     account: 'SEBÁ', supplier: 'CORANTE',       description: 'Material',                  category: 'OBRA' },
  { date: '2026-02-06', type: 'S', amount: 509.55,  account: 'SEBÁ', supplier: 'MADEREIRA SANTANA', description: 'Material',             category: 'OBRA' },
  { date: '2026-02-06', type: 'S', amount: 88,      account: 'VÊ',   supplier: 'CASA DE BOLO',  description: 'Inauguração',               category: 'OUTROS' },
  { date: '2026-02-06', type: 'S', amount: 33.8,    account: 'VÊ',   supplier: 'MARQUES',       description: 'Material',                  category: 'OBRA' },
  // 07/02 = inauguração
  { date: '2026-02-07', type: 'S', amount: 1559.84, account: 'SEBÁ', supplier: 'PINTORES',      description: 'Pintores',                  category: 'OBRA' },
  { date: '2026-02-07', type: 'S', amount: 105,     account: 'SEBÁ', supplier: 'LU FLORES',     description: 'Flores inauguração',        category: 'OUTROS' },
  { date: '2026-02-07', type: 'S', amount: 80,      account: 'VÊ',   supplier: 'PÃO DE MEL',    description: 'Inauguração',               category: 'OUTROS' },
  { date: '2026-02-08', type: 'S', amount: 104.79,  account: 'SEBÁ', supplier: 'GARDEN',        description: '1/4',                       category: 'INFRAESTRUTURA' },
  { date: '2026-02-08', type: 'S', amount: 104.79,  account: 'SEBÁ', supplier: 'GARDEN',        description: '2/4',                       category: 'INFRAESTRUTURA' },
  { date: '2026-02-08', type: 'S', amount: 104.79,  account: 'SEBÁ', supplier: 'GARDEN',        description: '3/4',                       category: 'INFRAESTRUTURA' },
  // A partir daqui: período 2026-02 (pós-inauguração 09/02)
  { date: '2026-02-09', type: 'E', amount: 3000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2026-02-09', type: 'S', amount: 145.58,  account: 'SEBÁ', supplier: 'CADEIRAS',      description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-09', type: 'S', amount: 117,     account: 'VÊ',   supplier: 'FUNCIONÁRIO',   description: 'Natalia',                   category: 'FOLHA SALARIAL' },
  { date: '2026-02-09', type: 'S', amount: 70,      account: 'VÊ',   supplier: 'FUNCIONÁRIO',   description: 'Maria',                     category: 'FOLHA SALARIAL' },
  { date: '2026-02-09', type: 'S', amount: 100,     account: 'VÊ',   supplier: 'FUNCIONÁRIO',   description: 'Natalia',                   category: 'FOLHA SALARIAL' },
  { date: '2026-02-10', type: 'E', amount: 500,     account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2026-02-10', type: 'S', amount: 416.59,  account: 'SEBÁ', supplier: 'MUDANÇA',       description: 'Mudança',                   category: 'OUTROS' },
  { date: '2026-02-10', type: 'S', amount: 17.2,    account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-02-11', type: 'S', amount: 350,     account: 'SEBÁ', supplier: 'PAULINHO',      description: 'Serviço',                   category: 'OUTROS' },
  { date: '2026-02-12', type: 'S', amount: 148,     account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-02-13', type: 'E', amount: 1000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2026-02-13', type: 'S', amount: 280.32,  account: 'VÊ',   supplier: 'MERCADO LIVRE', description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-02-14', type: 'S', amount: 52.7,    account: 'VÊ',   supplier: 'PIRUETA',       description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-02-18', type: 'E', amount: 4000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2026-02-18', type: 'S', amount: 1000,    account: 'SEBÁ', supplier: 'ELAINE',        description: 'Aluguel parcial',           category: 'ALUGUEL' },
  { date: '2026-02-18', type: 'S', amount: 459.41,  account: 'SEBÁ', supplier: 'FUNCIONÁRIO',   description: 'Natalia',                   category: 'FOLHA SALARIAL' },
  { date: '2026-02-18', type: 'S', amount: 161.48,  account: 'SEBÁ', supplier: 'SABESP',        description: 'Água',                      category: 'ÁGUA' },
  { date: '2026-02-19', type: 'S', amount: 85.86,   account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-02-20', type: 'S', amount: 5000,    account: 'SEBÁ', supplier: 'ELAINE',        description: 'Aluguel',                   category: 'ALUGUEL' },
  { date: '2026-02-20', type: 'S', amount: 50,      account: 'SEBÁ', supplier: 'CORANTE',       description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-02-20', type: 'S', amount: 111.49,  account: 'SEBÁ', supplier: 'ENEL',          description: 'Energia elétrica',          category: 'ENERGIA ELÉTRICA' },
  { date: '2026-02-20', type: 'S', amount: 100,     account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-02-26', type: 'S', amount: 192.67,  account: 'SEBÁ', supplier: '360 IMPRIMIR',  description: 'Panfletos',                 category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-02-26', type: 'S', amount: 60,      account: 'SEBÁ', supplier: 'ABCC',          description: 'Associação',                category: 'ASSOCIAÇÃO' },
  { date: '2026-02-26', type: 'S', amount: 73,      account: 'SEBÁ', supplier: 'JUCESP',        description: 'Taxa Junta Comercial',      category: 'TAXA JUNTA COMERCIAL' },

  // MAR 2026
  { date: '2026-03-01', type: 'S', amount: 93.63,   account: 'SEBÁ', supplier: 'MERCADO LIVRE', description: 'Cortinas',                  category: 'INFRAESTRUTURA' },
  { date: '2026-03-01', type: 'S', amount: 1464.56, account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'Cartão início operação',    category: 'ADIANTAMENTO SÓCIO' },
  { date: '2026-03-03', type: 'S', amount: 344.41,  account: 'SEBÁ', supplier: 'MERCADO LIVRE', description: 'Material geral',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-03', type: 'E', amount: 600,     account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2026-03-03', type: 'E', amount: 1000,    account: 'NICE', supplier: 'NICE',          description: 'Aporte de capital',         category: 'APORTE NICE' },
  { date: '2026-03-03', type: 'S', amount: 344.41,  account: 'SEBÁ', supplier: 'MERCADO LIVRE', description: 'Material infra',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-04', type: 'S', amount: 34.23,   account: 'SEBÁ', supplier: 'MERCADO LIVRE', description: 'Mouse',                     category: 'INFRAESTRUTURA' },
  { date: '2026-03-05', type: 'S', amount: 94.88,   account: 'VÊ',   supplier: 'CLARO',         description: 'Internet',                  category: 'INTERNET' },
  { date: '2026-03-06', type: 'S', amount: 434.42,  account: 'SEBÁ', supplier: 'SARAH',         description: 'Funcionária Sarah',         category: 'FOLHA SALARIAL' },
  { date: '2026-03-06', type: 'S', amount: 424.09,  account: 'SEBÁ', supplier: 'FACEBOOK',      description: 'Anúncios março',            category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-03-07', type: 'S', amount: 122,     account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-03-07', type: 'S', amount: 122,     account: 'SEBÁ', supplier: 'MARQUES',       description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-03-09', type: 'S', amount: 46.4,    account: 'VÊ',   supplier: 'KALUNGA',       description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-03-10', type: 'S', amount: 33.8,    account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-11', type: 'S', amount: 26.9,    account: 'SEBÁ', supplier: 'LOCAWEB',       description: 'Site',                      category: 'INTERNET' },
  { date: '2026-03-11', type: 'S', amount: 149.3,   account: 'VÊ',   supplier: 'JAPAN GRÁFICA', description: 'Camisetas',                 category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-03-16', type: 'S', amount: 413.15,  account: 'SEBÁ', supplier: 'MERCADO LIVRE', description: 'Material infra',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-16', type: 'S', amount: 53.7,    account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-17', type: 'S', amount: 123.89,  account: 'SEBÁ', supplier: 'MERCADO LIVRE', description: 'Material infra',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-17', type: 'S', amount: 30.98,   account: 'SEBÁ', supplier: 'OZ PET',        description: 'Pote Baruc',                category: 'INFRAESTRUTURA' },
  { date: '2026-03-18', type: 'S', amount: 63.28,   account: 'SEBÁ', supplier: 'MERCADO LIVRE', description: 'Material infra',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-21', type: 'S', amount: 169.89,  account: 'SEBÁ', supplier: 'MERCADO LIVRE', description: 'Material infra',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-21', type: 'S', amount: 148.71,  account: 'SEBÁ', supplier: 'SODIMAC',       description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-03-23', type: 'S', amount: 88.59,   account: 'VÊ',   supplier: 'FACEBOOK',      description: 'Anúncios',                  category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-03-23', type: 'S', amount: 48.77,   account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-24', type: 'S', amount: 42.25,   account: 'AUÊ',  supplier: 'MARQUES',       description: 'Material infra',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-25', type: 'S', amount: 142,     account: 'AUÊ',  supplier: 'CONTABILIDADE', description: 'Contabilidade',             category: 'CONTABILIDADE' },
  { date: '2026-03-26', type: 'S', amount: 383.19,  account: 'AUÊ',  supplier: 'FACEBOOK',      description: 'Anúncios',                  category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-03-26', type: 'S', amount: 260.09,  account: 'SEBÁ', supplier: 'GOOGLE ADS',    description: 'Anúncios',                  category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-03-26', type: 'S', amount: 103.56,  account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-26', type: 'S', amount: 60.23,   account: 'VÊ',   supplier: 'CARREFOUR',     description: 'Itens Páscoa',              category: 'OUTROS' },
  { date: '2026-03-26', type: 'S', amount: 28.26,   account: 'VÊ',   supplier: 'MINI EXTRA',    description: 'Itens Páscoa',              category: 'OUTROS' },
  { date: '2026-03-26', type: 'S', amount: 271.96,  account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'Compra ML',                category: 'ADIANTAMENTO SÓCIO' },
  { date: '2026-03-28', type: 'S', amount: 11.77,   account: 'AUÊ',  supplier: 'TROPICAL',      description: 'Compra mercado',            category: 'OUTROS' },
  { date: '2026-03-28', type: 'S', amount: 11.51,   account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'Pão parque',               category: 'ADIANTAMENTO SÓCIO' },
  { date: '2026-03-28', type: 'S', amount: 235.1,   account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'Ração filhotes',           category: 'ADIANTAMENTO SÓCIO' },
  { date: '2026-03-28', type: 'S', amount: 29.9,    account: 'AUÊ',  supplier: 'PETZ',          description: 'Petiscos',                  category: 'INFRAESTRUTURA' },
  { date: '2026-03-30', type: 'S', amount: 49.2,    account: 'AUÊ',  supplier: 'PALÁDIO',       description: 'Material infra',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-30', type: 'S', amount: 85,      account: 'AUÊ',  supplier: 'TELEFÔNICA',    description: 'Telefone',                  category: 'INTERNET' },
  { date: '2026-03-30', type: 'S', amount: 56,      account: 'AUÊ',  supplier: 'MARQUES',       description: 'Material infra',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-30', type: 'S', amount: 55,      account: 'AUÊ',  supplier: 'SODIMAC',       description: 'Material infra',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-30', type: 'S', amount: 50.34,   account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura 1/3',        category: 'INFRAESTRUTURA' },
  { date: '2026-03-30', type: 'S', amount: 25,      account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-30', type: 'S', amount: 63.96,   account: 'VÊ',   supplier: 'SHOPEE',        description: 'Infraestrutura',            category: 'INFRAESTRUTURA' },
  { date: '2026-03-30', type: 'S', amount: 479.55,  account: 'VÊ',   supplier: 'MERCADO LIVRE', description: 'Banho & Tosa',              category: 'INFRAESTRUTURA' },
  { date: '2026-03-30', type: 'S', amount: 190.69,  account: 'VÊ',   supplier: 'MERCADO LIVRE', description: 'Banho & Tosa 1/10',         category: 'INFRAESTRUTURA' },
  { date: '2026-03-30', type: 'S', amount: 36.9,    account: 'VÊ',   supplier: 'MERCADO LIVRE', description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-03-30', type: 'S', amount: 59,      account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'Telefone',                  category: 'ADIANTAMENTO SÓCIO' },

  // ABR 2026
  { date: '2026-04-01', type: 'S', amount: 161.48,  account: 'AUÊ',  supplier: 'SABESP',        description: 'Água',                      category: 'ÁGUA' },
  { date: '2026-04-01', type: 'S', amount: 34.21,   account: 'AUÊ',  supplier: 'ENEL',          description: 'Energia elétrica',          category: 'ENERGIA ELÉTRICA' },
  { date: '2026-04-01', type: 'S', amount: 30,      account: 'AUÊ',  supplier: 'AUTOZONE',      description: 'Spray rosa',                category: 'INFRAESTRUTURA' },
  { date: '2026-04-01', type: 'S', amount: 24.19,   account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'ENEL casa',                 category: 'ADIANTAMENTO SÓCIO' },
  { date: '2026-04-01', type: 'S', amount: 125.56,  account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'ENEL casa',                 category: 'ADIANTAMENTO SÓCIO' },
  { date: '2026-04-02', type: 'S', amount: 37.58,   account: 'VÊ',   supplier: 'FACEBOOK',      description: 'Anúncios',                  category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-04-02', type: 'S', amount: 45.97,   account: 'VÊ',   supplier: 'MERCADO LIVRE', description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-04-02', type: 'S', amount: 49.5,    account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'Conta luz casa',           category: 'ADIANTAMENTO SÓCIO' },
  { date: '2026-04-02', type: 'S', amount: 25.31,   account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'ENEL casa',                 category: 'ADIANTAMENTO SÓCIO' },
  { date: '2026-04-02', type: 'S', amount: 153.95,  account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'Autozone',                  category: 'ADIANTAMENTO SÓCIO' },
  { date: '2026-04-02', type: 'S', amount: 150,     account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'Gasolina Pajero',           category: 'ADIANTAMENTO SÓCIO' },
  { date: '2026-04-02', type: 'S', amount: 199.97,  account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'Ovos filhos Sebá',          category: 'ADIANTAMENTO SÓCIO' },
  { date: '2026-04-07', type: 'S', amount: 303.01,  account: 'AUÊ',  supplier: 'ENEL',          description: 'Energia elétrica',          category: 'ENERGIA ELÉTRICA' },
  { date: '2026-04-07', type: 'S', amount: 101.49,  account: 'AUÊ',  supplier: 'ENEL',          description: 'Energia elétrica',          category: 'ENERGIA ELÉTRICA' },
  { date: '2026-04-07', type: 'S', amount: 100,     account: 'VÊ',   supplier: 'ATIVIDADES',    description: 'Atividades proventos',      category: 'FOLHA SALARIAL' },
  { date: '2026-04-08', type: 'S', amount: 2197.34, account: 'AUÊ',  supplier: 'SARAH',         description: 'Salário Sarah',             category: 'FOLHA SALARIAL' },
  { date: '2026-04-08', type: 'S', amount: 1700,    account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'Pensão crianças',           category: 'ADIANTAMENTO SÓCIO' },
  { date: '2026-04-08', type: 'S', amount: 82.05,   account: 'VÊ',   supplier: 'FACEBOOK',      description: 'Anúncios',                  category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-04-08', type: 'S', amount: 350.55,  account: 'VÊ',   supplier: 'PETZ',          description: 'Produtos limpeza',          category: 'MATERIAL LIMPEZA' },
  { date: '2026-04-10', type: 'S', amount: 50,      account: 'AUÊ',  supplier: 'SARAH',         description: 'Pernoite',                  category: 'FOLHA SALARIAL' },
  { date: '2026-04-11', type: 'S', amount: 61.08,   account: 'SEBÁ', supplier: 'LEROY MERLIN',  description: 'Material',                  category: 'INFRAESTRUTURA' },
  { date: '2026-04-12', type: 'S', amount: 189.95,  account: 'SEBÁ', supplier: 'AUTOZONE',      description: 'Sprays túnel',              category: 'INFRAESTRUTURA' },
  { date: '2026-04-12', type: 'S', amount: 167.39,  account: 'VÊ',   supplier: 'FACEBOOK',      description: 'Anúncios',                  category: 'COMUNICAÇÃO E MARKETING' },
  { date: '2026-04-15', type: 'S', amount: 6000,    account: 'VÊ',   supplier: 'ELAINE',        description: 'Aluguel',                   category: 'ALUGUEL' },
  { date: '2026-04-23', type: 'S', amount: 327.92,  account: 'AUÊ',  supplier: 'SABESP',        description: 'Água',                      category: 'ÁGUA' },
  { date: '2026-04-28', type: 'S', amount: 100,     account: 'AUÊ',  supplier: 'LOCATOM',       description: 'Escada',                    category: 'INFRAESTRUTURA' },

  // MAI 2026
  { date: '2026-05-01', type: 'S', amount: 237.15,  account: 'AUÊ',  supplier: 'MERCADO LIVRE', description: 'Roteador',                  category: 'INFRAESTRUTURA' },
  { date: '2026-05-04', type: 'S', amount: 105.52,  account: 'AUÊ',  supplier: 'MERCADO LIVRE', description: 'Câmera cozinha',            category: 'INFRAESTRUTURA' },
  { date: '2026-05-05', type: 'S', amount: 217,     account: 'AUÊ',  supplier: 'RETIRADA SEBÁ', description: 'Cartão',                    category: 'ADIANTAMENTO SÓCIO' },
  { date: '2026-05-05', type: 'S', amount: 79.9,    account: 'AUÊ',  supplier: 'MERCADO LIVRE', description: 'Câmera',                    category: 'INFRAESTRUTURA' },
]

async function main() {
  await login()

  const testRes = await request('/api/financeiro')
  if (testRes.status === 401) { console.error('Não autenticado'); process.exit(1) }

  console.log(`Importando ${ENTRIES.length} lançamentos históricos...`)

  let ok = 0, err = 0
  for (const entry of ENTRIES) {
    const res = await request('/api/financeiro', 'POST', entry, 'application/json')
    if (res.status === 201 || res.status === 200) {
      ok++
      process.stdout.write('.')
    } else {
      console.error(`\nERRO ${res.status} em ${entry.date} ${entry.supplier}: ${res.body}`)
      err++
    }
  }
  console.log(`\n\nConcluído: ${ok} importados, ${err} erros.`)
}

main().catch(console.error)
