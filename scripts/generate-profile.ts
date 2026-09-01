import { PrismaClient } from '@prisma/client'
import { getGeminiApiKey } from './gemini'

const prisma = new PrismaClient()
const GEMINI_MODEL = 'gemini-3.6-flash'

async function generateAttendantProfile(): Promise<string> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    console.error('[profile] Missing GEMINI_API_KEY')
    return ''
  }

  // Buscar todas as mensagens outbound (respostas humanas) para analisar o estilo
  const messages = await prisma.whatsAppMessage.findMany({
    where: { direction: 'OUTBOUND', source: 'HUMAN' },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { conversation: { include: { dog: { select: { name: true, breed: true, ownerName: true } } } } },
  })

  // Buscar também mensagens inbound para contexto
  const inboundMessages = await prisma.whatsAppMessage.findMany({
    where: { direction: 'INBOUND' },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  if (messages.length === 0 && inboundMessages.length === 0) {
    console.log('[profile] No message history found')
    return ''
  }

  // Construir exemplo de conversas
  const allMessages = [...messages, ...inboundMessages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

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
      return ''
    }

    const data = await res.json()
    const profile = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return profile.trim()
  } catch (err) {
    console.error('[profile] Error:', err)
    return ''
  }
}

async function main() {
  console.log('Analisando histórico de mensagens...')
  const profile = await generateAttendantProfile()
  if (profile) {
    console.log('\n=== PERFIL DE ATENDIMENTO GERADO ===\n')
    console.log(profile)
    console.log('\n=== FIM ===\n')
  } else {
    console.log('Não foi possível gerar o perfil. Verifique se há mensagens no banco.')
  }
}

main().finally(() => prisma.$disconnect())
