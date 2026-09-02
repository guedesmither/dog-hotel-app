import { prisma } from './prisma'

/**
 * Evolution API configuration
 * Env vars: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME
 */

export function getApiUrl(): string {
  return (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '')
}

export function getApiKey(): string {
  return process.env.EVOLUTION_API_KEY || ''
}

export function getInstanceName(): string {
  return process.env.EVOLUTION_INSTANCE_NAME || ''
}

/**
 * Check if Evolution API is configured
 */
export function isConfigured(): boolean {
  return !!(getApiUrl() && getApiKey() && getInstanceName())
}

/**
 * Send a text message via Evolution API
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<{ id: string } | null> {
  const apiUrl = getApiUrl()
  const apiKey = getApiKey()
  const instance = getInstanceName()

  if (!apiUrl || !apiKey || !instance) {
    console.error('[whatsapp] Missing EVOLUTION_API_URL, EVOLUTION_API_KEY or EVOLUTION_INSTANCE_NAME')
    return null
  }

  try {
    const res = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: to,
        text,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[whatsapp] Evolution API send failed:', err)
      return null
    }

    const data = await res.json()
    const messageId = data.key?.id || data.messageId || data.id || ''
    return { id: messageId }
  } catch (err) {
    console.error('[whatsapp] Send error:', err)
    return null
  }
}

/**
 * Send an image with caption via Evolution API
 * image: URL or base64 string (data:image/...)
 */
export async function sendWhatsAppImage(
  to: string,
  image: string,
  caption?: string
): Promise<{ id: string } | null> {
  const apiUrl = getApiUrl()
  const apiKey = getApiKey()
  const instance = getInstanceName()

  if (!apiUrl || !apiKey || !instance) {
    console.error('[whatsapp] Missing EVOLUTION_API_URL, EVOLUTION_API_KEY or EVOLUTION_INSTANCE_NAME')
    return null
  }

  try {
    const isBase64 = image.startsWith('data:')
    const body: Record<string, unknown> = {
      number: to,
      mediatype: 'image',
      caption: caption || '',
      fileName: 'photo.jpg',
      mimetype: 'image/jpeg',
    }

    if (isBase64) {
      body.media = image
    } else {
      body.media = image
    }

    const res = await fetch(`${apiUrl}/message/sendMedia/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[whatsapp] Evolution API send-image failed:', err)
      return null
    }

    const data = await res.json()
    const messageId = data.key?.id || data.messageId || data.id || ''
    return { id: messageId }
  } catch (err) {
    console.error('[whatsapp] Send image error:', err)
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
        autoReply: false,
      },
      include: { dog: { select: { id: true, name: true, ownerName: true, ownerPhone: true } } },
    })
  }

  return conv
}

/**
 * Get QR code for connecting WhatsApp (Evolution API)
 */
export async function getQRCode(): Promise<{ qrCode: string; connected: boolean } | null> {
  const apiUrl = getApiUrl()
  const apiKey = getApiKey()
  const instance = getInstanceName()

  if (!apiUrl || !apiKey || !instance) return null

  try {
    const res = await fetch(`${apiUrl}/instance/connect/${instance}`, {
      headers: {
        'apikey': apiKey,
      },
    })
    if (!res.ok) return null
    const data = await res.json()

    if (data.instance?.state === 'open' || data.status === 'open') {
      return { qrCode: '', connected: true }
    }

    const qr = data.qrcode?.base64 || data.qrcode || data.base64 || ''
    return { qrCode: qr, connected: false }
  } catch (err) {
    console.error('[whatsapp] QR code error:', err)
    return null
  }
}

/**
 * Check instance status (connected or not) via Evolution API
 */
export async function getInstanceStatus(): Promise<{ connected: boolean; phone?: string } | null> {
  const apiUrl = getApiUrl()
  const apiKey = getApiKey()
  const instance = getInstanceName()

  if (!apiUrl || !apiKey || !instance) return null

  try {
    const res = await fetch(`${apiUrl}/instance/connectionState/${instance}`, {
      headers: {
        'apikey': apiKey,
      },
    })
    if (!res.ok) return null
    const data = await res.json()
    const state = data.instance?.state || data.state || ''
    return {
      connected: state === 'open',
      phone: data.instance?.ownerNumber || data.phone,
    }
  } catch (err) {
    console.error('[whatsapp] Status error:', err)
    return null
  }
}

/**
 * Set webhook for the instance (Evolution API)
 */
export async function setWebhook(webhookUrl: string): Promise<boolean> {
  const apiUrl = getApiUrl()
  const apiKey = getApiKey()
  const instance = getInstanceName()

  if (!apiUrl || !apiKey || !instance) return false

  try {
    const res = await fetch(`${apiUrl}/webhook/set/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: false,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
        ],
      }),
    })
    return res.ok
  } catch (err) {
    console.error('[whatsapp] Set webhook error:', err)
    return false
  }
}
