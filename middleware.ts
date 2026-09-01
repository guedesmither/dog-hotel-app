export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/((?!api/auth|api/setup|api/admin/reset-pw|api/admin/fix-phones|api/whatsapp/webhook|login|_next/static|_next/image|favicon.ico|uploads).*)',
  ],
}
