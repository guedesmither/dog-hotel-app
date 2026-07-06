const BASE_URL = 'https://guedesmither-dog-hotel-app.vercel.app'
const EMAIL = 'admin@petday.com'
const PASSWORD = 'admin123'

async function main() {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`)
  const { csrfToken } = await csrfRes.json()
  const csrfCookie = csrfRes.headers.getSetCookie?.()?.map(c => c.split(';')[0]).join('; ') || ''

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', cookie: csrfCookie },
    body: new URLSearchParams({ email: EMAIL, password: PASSWORD, csrfToken, redirect: 'false', callbackUrl: '/', json: 'true' }),
    redirect: 'manual',
  })
  const sessionCookies = loginRes.headers.getSetCookie?.()?.map(c => c.split(';')[0]).join('; ') || ''
  const cookie = [csrfCookie, sessionCookies].filter(Boolean).join('; ')

  const res = await fetch(`${BASE_URL}/api/financeiro`, { headers: { cookie } })
  console.log('Status:', res.status)
  const data = await res.json()
  if (Array.isArray(data)) {
    console.log(`Total de lançamentos: ${data.length}`)
    if (data.length > 0) {
      console.log('Primeiro:', JSON.stringify(data[0], null, 2))
      console.log('Último:', JSON.stringify(data[data.length - 1], null, 2))
    }
  } else {
    console.log('Resposta:', JSON.stringify(data))
  }
}

main().catch(console.error)
