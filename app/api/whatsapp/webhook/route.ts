import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findOrCreateConversation } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

// GET — Webhook validation (optional, Evolution API doesn't require this)
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'ok' })
}

// POST — Receive events from Evolution API webhook
// Format: { event: "MESSAGES_UPSERT", data: { key: { remoteJid, fromMe, id }, message: { conversation } }, ... }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const eventType = body.event || ''

    // Handle incoming message (MESSAGES_UPSERT)
    if (eventType === 'MESSAGES_UPSERT') {
      const msgData = body.data || {}
      const key = msgData.key || {}
      
      // Skip messages sent by me
      if (key.fromMe === true) return NextResponse.json({ status: 'ignored' })

      // Extract phone from remoteJid (format: 5511999999999@s.whatsapp.net)
      const remoteJid = key.remoteJid || ''
      const from = remoteJid.split('@')[0] || ''
      const waMessageId = key.id || ''
      
      // Extract text from various message formats
      const message = msgData.message || {}
      const text = message.conversation || 
                   message.extendedTextMessage?.text || 
                   message.imageMessage?.caption ||
                   message.videoMessage?.caption ||
                   ''

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

    // Handle message status update (MESSAGES_UPDATE)
    if (eventType === 'MESSAGES_UPDATE') {
      const msgData = body.data || {}
      const key = msgData.key || {}
      const waId = key.id || ''
      const statusValue = msgData.status?.status || msgData.status || ''

      if (waId && statusValue) {
        await prisma.whatsAppMessage.updateMany({
          where: { waMessageId: waId },
          data: { status: String(statusValue).toUpperCase() },
        })
      }

      return NextResponse.json({ status: 'ok' })
    }

    // Handle connection update (CONNECTION_UPDATE)
    if (eventType === 'CONNECTION_UPDATE') {
      const state = body.data?.state || ''
      console.log('[webhook] Connection update:', state)
      return NextResponse.json({ status: 'ok' })
    }

    // Handle QR code update (QRCODE_UPDATED)
    if (eventType === 'QRCODE_UPDATED') {
      console.log('[webhook] QR code updated')
      return NextResponse.json({ status: 'ok' })
    }

    return NextResponse.json({ status: 'ignored' })
  } catch (err) {
    console.error('[webhook] Error:', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
