import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage, normalizePhone } from '@/lib/whatsapp'
import { generateGeminiResponse, buildConversationHistory, buildDogContext } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

// GET /api/whatsapp/conversations — list all conversations
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')

  if (conversationId) {
    // Get single conversation with messages
    const conv = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      include: {
        dog: { select: { id: true, name: true, breed: true, ownerName: true, dogStatus: true, photoUrl: true } },
        messages: { orderBy: { createdAt: 'asc' }, take: 200 },
      },
    })
    if (!conv) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
    return NextResponse.json(conv)
  }

  // List all conversations
  const conversations = await prisma.whatsAppConversation.findMany({
    include: {
      dog: { select: { id: true, name: true, ownerName: true, photoUrl: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { lastMessageAt: 'desc' },
  })

  return NextResponse.json(conversations)
}

// POST /api/whatsapp/conversations — send a message or toggle auto-reply
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { conversationId, text, action } = body

  // Toggle auto-reply
  if (action === 'toggleAutoReply') {
    const conv = await prisma.whatsAppConversation.findUnique({ where: { id: conversationId } })
    if (!conv) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

    const updated = await prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { autoReply: !conv.autoReply },
    })
    return NextResponse.json({ autoReply: updated.autoReply })
  }

  // Generate AI suggestion (without sending)
  if (action === 'suggest') {
    const conv = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      include: { dog: { select: { id: true, name: true, breed: true, ownerName: true, dogStatus: true } } },
    })
    if (!conv) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

    const history = await buildConversationHistory(conversationId)
    const dogContext = buildDogContext(conv.dog as any)
    const result = await generateGeminiResponse(history, dogContext)

    if (result?.text) {
      // Store suggestion on the last inbound message
      const lastInbound = await prisma.whatsAppMessage.findFirst({
        where: { conversationId, direction: 'INBOUND' },
        orderBy: { createdAt: 'desc' },
      })
      if (lastInbound) {
        await prisma.whatsAppMessage.update({
          where: { id: lastInbound.id },
          data: { aiSuggestion: result.text },
        })
      }
      return NextResponse.json({ suggestion: result.text })
    }
    return NextResponse.json({ suggestion: null })
  }

  // Send a manual message
  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'Texto obrigatório' }, { status: 400 })
  }

  const conv = await prisma.whatsAppConversation.findUnique({ where: { id: conversationId } })
  if (!conv) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const sendResult = await sendWhatsAppMessage(conv.phoneNumber, text.trim())

  const message = await prisma.whatsAppMessage.create({
    data: {
      conversationId,
      direction: 'OUTBOUND',
      source: 'HUMAN',
      text: text.trim(),
      waMessageId: sendResult?.id || null,
      status: sendResult ? 'SENT' : 'FAILED',
    },
  })

  await prisma.whatsAppConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  })

  return NextResponse.json(message, { status: 201 })
}
