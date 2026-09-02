import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getInstanceStatus, getQRCode, isConfigured } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// GET /api/whatsapp/status — check Evolution API instance status and QR code
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  if (!isConfigured()) {
    return NextResponse.json({
      configured: false,
      message: 'EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME não configurados',
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
