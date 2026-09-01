import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getZapiClientToken, findOrCreateConversation } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// GET — Z-API webhook validation
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const clientToken = getZapiClientToken()

  if (clientToken && token !== clientToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
  }

  return NextResponse.json({ status: 'ok' })
}

// POST — Receive incoming messages from Z-API webhook
// Z-API format: { type: "ReceivedCallback", phone, text: { message: "..." }, messageId, ... }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const eventType = body.type || ''

    // Handle incoming message (ReceivedCallback)
    if (eventType === 'ReceivedCallback') {
      // Skip messages sent by me (from the instance itself)
      if (body.fromMe === true) return NextResponse.json({ status: 'ignored' })

      const from = body.phone || ''
      const text = body.text?.message || body.text?.text || ''
      const waMessageId = body.messageId || ''
      const senderName = body.senderName || body.chatName || ''

      if (!from || !text) return NextResponse.json({ status: 'ignored' })

      const conv = await findOrCreateConversation(from)

      // Update contact name if we have it and conversation doesn't
      if (senderName && !conv.contactName) {
        await prisma.whatsAppConversation.update({
          where: { id: conv.id },
          data: { contactName: senderName },
        })
      }

      await prisma.whatsAppMessage.create({
        data: {
          conversationId: conv.id,
          direction: 'INBOUND',
          source: 'HUMAN',
          text,
          waMessageId,
          status: 'DELIVERED',
        },
      })

      await prisma.whatsAppConversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: new Date() },
      })

      return NextResponse.json({ status: 'ok' })
    }

    // Handle message status update (MessageStatusCallback)
    if (eventType === 'MessageStatusCallback') {
      const waId = body.ids?.[0] || body.messageId || ''
      const statusValue = body.status || ''

      if (waId && statusValue) {
        await prisma.whatsAppMessage.updateMany({
          where: { waMessageId: waId },
          data: { status: statusValue.toUpperCase() },
        })
      }

      return NextResponse.json({ status: 'ok' })
    }

    // Fallback for older/other event formats
    if (body.phone && body.text?.message && !body.status) {
      const from = body.phone || ''
      const text = body.text.message || ''
      const waMessageId = body.messageId || ''

      if (!from || !text) return NextResponse.json({ status: 'ignored' })

      const conv = await findOrCreateConversation(from)

      await prisma.whatsAppMessage.create({
        data: {
          conversationId: conv.id,
          direction: 'INBOUND',
          source: 'HUMAN',
          text,
          waMessageId,
          status: 'DELIVERED',
        },
      })

      await prisma.whatsAppConversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: new Date() },
      })

      return NextResponse.json({ status: 'ok' })
    }

    return NextResponse.json({ status: 'ignored' })
  } catch (err) {
    console.error('[webhook] Error:', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
