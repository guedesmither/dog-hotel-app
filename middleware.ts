import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

const monitorPages = new Set(['/dashboard', '/alimentacao'])

function isMonitorApiAllowed(pathname: string, method: string) {
  if (pathname === '/api/dogs') return method === 'GET'
  if (/^\/api\/dogs\/[^/]+\/reports$/.test(pathname)) return method === 'GET'
  if (pathname === '/api/roster') return method === 'GET'
  if (pathname === '/api/roster/presence') return method === 'PATCH'
  if (/^\/api\/reports\/[^/]+$/.test(pathname)) return method === 'PUT'
  if (/^\/api\/reports\/[^/]+\/activities$/.test(pathname)) return ['POST', 'PUT', 'DELETE'].includes(method)
  if (pathname === '/api/checkin/photos') return method === 'POST'
  return false
}

export default withAuth(
  function middleware(req) {
    if (req.nextauth.token?.role !== 'MONITOR') return NextResponse.next()

    const { pathname } = req.nextUrl
    if (pathname.startsWith('/api/')) {
      return isMonitorApiAllowed(pathname, req.method)
        ? NextResponse.next()
        : NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (!monitorPages.has(pathname)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
  }
)

export const config = {
  matcher: [
    '/((?!api/auth|api/setup|api/admin/reset-pw|api/admin/fix-phones|api/whatsapp/webhook|api/whatsapp/test-gemini|login|_next/static|_next/image|favicon.ico|uploads).*)',
  ],
}
