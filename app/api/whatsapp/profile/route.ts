import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGeminiApiKey } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

const GEMINI_MODEL = 'gemini-3.6-flash'

// POST /api/whatsapp/profile — Analyze message history and generate attendant profile
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role === 'TUTOR') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const apiKey = getGeminiApiKey()
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 })

  // Get all human outbound messages to analyze style
  const outboundMessages = await prisma.whatsAppMessage.findMany({
    where: { direction: 'OUTBOUND', source: 'HUMAN' },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { conversation: { include: { dog: { select: { name: true, breed: true, ownerName: true } } } } },
  })

  // Get inbound messages for context
  const inboundMessages = await prisma.whatsAppMessage.findMany({
    where: { direction: 'INBOUND' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  if (outboundMessages.length === 0 && inboundMessages.length === 0) {
    return NextResponse.json({ error: 'Sem histórico de mensagens suficiente para gerar o perfil' }, { status: 400 })
  }

  const allMessages = [...outboundMessages, ...inboundMessages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  )

  const conversationText = allMessages.map(m => {
    const role = m.direction === 'INBOUND' ? 'Tutor' : 'Atendente'
    const dogName = m.conversation?.dog?.name || ''
    return `${role}${dogName ? ` (cão: ${dogName})` : ''}: ${m.text}`
  }).join('\n')

  const analysisPrompt = `Analise o histórico de mensagens abaixo de um Dog Hotel/Creche e crie um "Perfil de Atendimento" detalhado.

Identifique e descreva:
1. **Tom de voz**: Como o atendente fala com os tutores (formal/informal, uso de emojis, linguagem)
2. **Estrutura das respostas**: Como as mensagens são estruturadas (saudação, corpo, despedida)
3. **Informações frequentemente fornecidas**: O que o atendente costuma informar (horários, valores, status do cão, etc)
4. **Como lida com perguntas comuns**: Agendamento, buscar/entregar cão, pagamentos, emergências
5. **Palavras/frases características**: Expressões próprias do atendente
6. **Limites**: O que o atendente pede para confirmar com a equipe vs responde direto
7. **Procedimentos padrão**: O que acontece quando um tutor pergunta sobre check-in, check-out, vacinas, alimentação, etc

Histórico de mensagens:
${conversationText}

Gere o perfil em português brasileiro, de forma estruturada e prática para ser usado como instrução de sistema por uma IA que vai responder mensagens automaticamente imitando esse estilo.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
            topP: 0.9,
          },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('[profile] Gemini error:', err)
      return NextResponse.json({ error: 'Erro ao gerar perfil' }, { status: 500 })
    }

    const data = await res.json()
    const profile = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Save profile to app settings (using a simple key-value in the database)
    await prisma.appSetting.upsert({
      where: { key: 'whatsapp_attendant_profile' },
      update: { value: profile.trim() },
      create: { key: 'whatsapp_attendant_profile', value: profile.trim() },
    })

    return NextResponse.json({ profile: profile.trim(), messageCount: allMessages.length })
  } catch (err) {
    console.error('[profile] Error:', err)
    return NextResponse.json({ error: 'Erro ao gerar perfil' }, { status: 500 })
  }
}

// GET /api/whatsapp/profile — Get current attendant profile
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const setting = await prisma.appSetting.findUnique({
    where: { key: 'whatsapp_attendant_profile' },
  })

  return NextResponse.json({ profile: setting?.value || null })
}

// PUT /api/whatsapp/profile — Manually update attendant profile
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role === 'TUTOR') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { profile } = body

  if (!profile) return NextResponse.json({ error: 'Perfil não fornecido' }, { status: 400 })

  await prisma.appSetting.upsert({
    where: { key: 'whatsapp_attendant_profile' },
    update: { value: profile },
    create: { key: 'whatsapp_attendant_profile', value: profile },
  })

  return NextResponse.json({ success: true })
}
