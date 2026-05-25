export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/((?!api/auth|api/setup|api/admin/reset-pw|login|_next/static|_next/image|favicon.ico|uploads).*)',
  ],
}
