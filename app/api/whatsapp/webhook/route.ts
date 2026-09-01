import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getZapiClientToken, findOrCreateConversation, sendWhatsAppMessage } from '@/lib/whatsapp'
import { generateGeminiResponse, buildConversationHistory, buildDogContext } from '@/lib/gemini'

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
// Z-API sends: { phone, message, messageId, type, ... }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const event = body.event || body.type

    // Handle incoming message
    if (event === 'message-received' || (body.phone && body.message && !body.status)) {
      const from = body.phone || ''
      const text = body.message?.text || body.text || body.message || ''
      const waMessageId = body.messageId || body.id || ''

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

      if (conv.autoReply) {
        try {
          const history = await buildConversationHistory(conv.id)
          const dogContext = buildDogContext(conv.dog as any)
          const geminiResult = await generateGeminiResponse(history, dogContext)

          if (geminiResult?.text) {
            const sendResult = await sendWhatsAppMessage(from, geminiResult.text)

            await prisma.whatsAppMessage.create({
              data: {
                conversationId: conv.id,
                direction: 'OUTBOUND',
                source: 'AI',
                text: geminiResult.text,
                waMessageId: sendResult?.id || null,
                status: sendResult ? 'SENT' : 'FAILED',
              },
            })

            await prisma.whatsAppConversation.update({
              where: { id: conv.id },
              data: { lastMessageAt: new Date() },
            })
          }
        } catch (aiErr) {
          console.error('[webhook] AI auto-reply error:', aiErr)
        }
      }

      return NextResponse.json({ status: 'ok' })
    }

    // Handle message status update
    if (event === 'message-status' || body.status) {
      const waId = body.messageId || body.id || ''
      const statusValue = body.status || ''

      if (waId && statusValue) {
        await prisma.whatsAppMessage.updateMany({
          where: { waMessageId: waId },
          data: { status: statusValue.toUpperCase() },
        })
      }

      return NextResponse.json({ status: 'ok' })
    }

    return NextResponse.json({ status: 'ignored' })
  } catch (err) {
    console.error('[webhook] Error:', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
