import { prisma } from './prisma'

export function getInstanceId(): string {
  return process.env.ZAPI_INSTANCE_ID || ''
}

export function getToken(): string {
  return process.env.ZAPI_TOKEN || ''
}

export function getZapiClientToken(): string {
  return process.env.ZAPI_CLIENT_TOKEN || ''
}

/**
 * Z-API base URL for all endpoints
 */
function baseUrl(): string {
  const instanceId = getInstanceId()
  const token = getToken()
  return `https://api.z-api.com/instance/${instanceId}/token/${token}`
}

/**
 * Send a text message via Z-API
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<{ id: string } | null> {
  const instanceId = getInstanceId()
  const token = getToken()
  if (!instanceId || !token) {
    console.error('[whatsapp] Missing ZAPI_INSTANCE_ID or ZAPI_TOKEN')
    return null
  }

  try {
    const res = await fetch(`${baseUrl()}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: to, message: text }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[whatsapp] Z-API send failed:', err)
      return null
    }

    const data = await res.json()
    return { id: data.messageId || data.id || '' }
  } catch (err) {
    console.error('[whatsapp] Send error:', err)
    return null
  }
}

/**
 * Normalize phone to E.164 (digits only, with country code)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Find or create a conversation from an incoming phone number
 */
export async function findOrCreateConversation(phoneNumber: string) {
  const normalized = normalizePhone(phoneNumber)

  let conv = await prisma.whatsAppConversation.findUnique({
    where: { phoneNumber: normalized },
    include: { dog: { select: { id: true, name: true, ownerName: true, ownerPhone: true } } },
  })

  if (!conv) {
    // Try to match with a dog by ownerPhone
    const dog = await prisma.dog.findFirst({
      where: { ownerPhone: { contains: normalized.slice(-11) } },
      select: { id: true, name: true, ownerName: true, ownerPhone: true },
    })

    conv = await prisma.whatsAppConversation.create({
      data: {
        phoneNumber: normalized,
        contactName: dog?.ownerName || null,
        dogId: dog?.id || null,
        autoReply: true,
      },
      include: { dog: { select: { id: true, name: true, ownerName: true, ownerPhone: true } } },
    })
  }

  return conv
}

/**
 * Get QR code for connecting WhatsApp (Z-API)
 */
export async function getQRCode(): Promise<{ qrCode: string; connected: boolean } | null> {
  try {
    const res = await fetch(`${baseUrl()}/qr-code`)
    if (!res.ok) return null
    const data = await res.json()
    return { qrCode: data.qrcode || data.value || '', connected: false }
  } catch (err) {
    console.error('[whatsapp] QR code error:', err)
    return null
  }
}

/**
 * Check instance status (connected or not)
 */
export async function getInstanceStatus(): Promise<{ connected: boolean; phone?: string } | null> {
  try {
    const res = await fetch(`${baseUrl()}/instance`)
    if (!res.ok) return null
    const data = await res.json()
    return {
      connected: data.connected || data.status === 'CONNECTED',
      phone: data.phone,
    }
  } catch (err) {
    console.error('[whatsapp] Status error:', err)
    return null
  }
}
