import { prisma } from './prisma'

const META_API_VERSION = 'v21.0'

export function getPhoneId(): string {
  return process.env.WHATSAPP_PHONE_NUMBER_ID || ''
}

export function getAccessToken(): string {
  return process.env.META_ACCESS_TOKEN || ''
}

export function getVerifyToken(): string {
  return process.env.WHATSAPP_VERIFY_TOKEN || 'dog_hotel_verify_2024'
}

/**
 * Send a text message via WhatsApp Cloud API
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<{ id: string } | null> {
  const phoneId = getPhoneId()
  const token = getAccessToken()
  if (!phoneId || !token) {
    console.error('[whatsapp] Missing WHATSAPP_PHONE_NUMBER_ID or META_ACCESS_TOKEN')
    return null
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: { body: text },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('[whatsapp] Send failed:', err)
      return null
    }

    const data = await res.json()
    return { id: data.messages?.[0]?.id || '' }
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
 * Mark a message as read via WhatsApp Cloud API
 */
export async function markMessageRead(messageId: string): Promise<void> {
  const phoneId = getPhoneId()
  const token = getAccessToken()
  if (!phoneId || !token) return

  try {
    await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      }
    )
  } catch (err) {
    console.error('[whatsapp] Mark read error:', err)
  }
}
