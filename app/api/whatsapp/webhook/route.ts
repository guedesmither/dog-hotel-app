import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVerifyToken, findOrCreateConversation, sendWhatsAppMessage, markMessageRead } from '@/lib/whatsapp'
import { generateGeminiResponse, buildConversationHistory, buildDogContext } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

// GET — Meta webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === getVerifyToken()) {
    return NextResponse.json(Number(challenge))
  }

  return NextResponse.json({ error: 'Invalid verification' }, { status: 403 })
}

// POST — Receive incoming messages from Meta
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Meta sends status updates and message notifications
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' })
    }

    const entries = body.entry || []
    for (const entry of entries) {
      const changes = entry.changes || []
      for (const change of changes) {
        const value = change.value
        if (!value) continue

        // Handle incoming messages
        const messages = value.messages || []
        for (const msg of messages) {
          if (msg.type !== 'text') continue

          const from = msg.from // E.164 phone
          const text = msg.text?.body || ''
          const waMessageId = msg.id

          if (!from || !text) continue

          // Find or create conversation
          const conv = await findOrCreateConversation(from)

          // Store inbound message
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

          // Update conversation timestamp
          await prisma.whatsAppConversation.update({
            where: { id: conv.id },
            data: { lastMessageAt: new Date() },
          })

          // Mark as read
          await markMessageRead(waMessageId)

          // Auto-reply with Gemini if enabled
          if (conv.autoReply) {
            try {
              const history = await buildConversationHistory(conv.id)
              const dogContext = buildDogContext(conv.dog as any)
              const geminiResult = await generateGeminiResponse(history, dogContext)

              if (geminiResult?.text) {
                // Send via WhatsApp
                const sendResult = await sendWhatsAppMessage(from, geminiResult.text)

                // Store outbound message
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
              }
            } catch (aiErr) {
              console.error('[webhook] AI auto-reply error:', aiErr)
            }
          }
        }

        // Handle message status updates
        const statuses = value.statuses || []
        for (const status of statuses) {
          const waId = status.id
          const statusValue = status.status // sent, delivered, read, failed

          if (waId && statusValue) {
            await prisma.whatsAppMessage.updateMany({
              where: { waMessageId: waId },
              data: { status: statusValue.toUpperCase() },
            })
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[webhook] Error:', err)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
