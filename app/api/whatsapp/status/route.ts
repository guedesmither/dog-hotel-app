import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getInstanceStatus, getQRCode, getInstanceId, getToken } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// GET /api/whatsapp/status — check Z-API instance status and QR code
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const instanceId = getInstanceId()
  const token = getToken()

  if (!instanceId || !token) {
    return NextResponse.json({
      configured: false,
      message: 'ZAPI_INSTANCE_ID e ZAPI_TOKEN não configurados',
    })
  }

  const status = await getInstanceStatus()

  if (status?.connected) {
    return NextResponse.json({
      configured: true,
      connected: true,
      phone: status.phone,
    })
  }

  // Not connected — get QR code
  const qr = await getQRCode()
  return NextResponse.json({
    configured: true,
    connected: false,
    qrCode: qr?.qrCode || null,
  })
}
