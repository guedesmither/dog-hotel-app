import http from 'http'
import https from 'https'

const BASE_URL = 'https://guedesmither-dog-hotel-app.vercel.app'

const cookieJar = []

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {},
    }
    if (cookieJar.length) {
      options.headers.Cookie = cookieJar.join('; ')
    }
    if (body) {
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }

    const client = url.protocol === 'https:' ? https : http
    const req = client.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        if (res.headers['set-cookie']) {
          for (const c of res.headers['set-cookie']) {
            cookieJar.push(c.split(';')[0])
          }
        }
        resolve({ status: res.statusCode, headers: res.headers, body: data })
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function login() {
  const csrfRes = await request('/api/auth/csrf')
  const csrfData = JSON.parse(csrfRes.body)
  const csrfToken = csrfData.csrfToken

  const form = new URLSearchParams({
    email: 'admin@petday.com',
    password: 'admin123',
    csrfToken,
    callbackUrl: '/',
    redirect: 'false',
  })

  await request('/api/auth/callback/credentials', 'POST', form.toString())
}

async function diagnose(date) {
  const res = await request(`/api/roster?reset=diagnostic&date=${date}`, 'DELETE')
  if (res.status !== 200) {
    console.error('Failed to get diagnostic:', res.status, res.body)
    return null
  }
  return JSON.parse(res.body)
}

async function main() {
  const date = process.argv[2] || '2026-07-13'
  await login()
  const result = await diagnose(date)
  if (result) {
    console.log(`Diagnóstico para ${date} (produção):`)
    console.log(JSON.stringify(result, null, 2))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
