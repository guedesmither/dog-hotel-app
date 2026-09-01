import { prisma } from './prisma'

const GEMINI_MODEL = 'gemini-3.6-flash'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY || ''
}

const SYSTEM_PROMPT = `Você é a assistente virtual do Dog Hotel, um hotel e creche para cães.
Você responde mensagens dos tutores (donos dos cães) de forma simpática, profissional e breve.

Regras:
- Responda sempre em português brasileiro
- Seja breve e direta (máximo 3-4 frases)
- Use emojis com moderação (1-2 por mensagem)
- Se não souber algo específico sobre o cão, diga que vai verificar com a equipe
- Para questões financeiras, diga que vai confirmar com a administração
- Nunca invente informações sobre preços, datas ou status do cão
- Se o tutor perguntar sobre buscar/entregar o cão, oriente a falar com a equipe
- Para emergências ou questões urgentes, oriente a ligar para o hotel

Você pode ter acesso ao contexto do cão (nome, raça, status na agenda) se disponível.`

interface GeminiResponse {
  text: string
  usage?: { promptTokens: number; candidatesTokens: number }
}

/**
 * Generate a response using Gemini AI
 */
export async function generateGeminiResponse(
  conversationHistory: { role: 'user' | 'model'; text: string }[],
  dogContext?: string
): Promise<GeminiResponse | null> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    console.error('[gemini] Missing GEMINI_API_KEY')
    return null
  }

  const systemInstruction = dogContext
    ? `${SYSTEM_PROMPT}\n\nContexto do cão: ${dogContext}`
    : SYSTEM_PROMPT

  const contents = conversationHistory.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }))

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
          topP: 0.9,
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[gemini] API error:', err)
      return null
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const usageMeta = data.usageMetadata
    const usage = usageMeta
      ? { promptTokens: usageMeta.promptTokenCount || 0, candidatesTokens: usageMeta.candidatesTokenCount || 0 }
      : undefined

    return { text: text.trim(), usage }
  } catch (err) {
    console.error('[gemini] Error:', err)
    return null
  }
}

/**
 * Build conversation history for Gemini from stored messages
 */
export async function buildConversationHistory(conversationId: string, limit = 10) {
  const messages = await prisma.whatsAppMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Reverse to chronological order
  messages.reverse()

  return messages.map(msg => ({
    role: (msg.direction === 'INBOUND' ? 'user' : 'model') as 'user' | 'model',
    text: msg.text,
  }))
}

/**
 * Build dog context string for Gemini
 */
export function buildDogContext(dog: { name: string; breed: string; ownerName: string; dogStatus?: string } | null): string {
  if (!dog) return 'Cão não identificado no sistema.'
  return `Nome: ${dog.name}, Raça: ${dog.breed}, Tutor: ${dog.ownerName}${dog.dogStatus ? `, Status: ${dog.dogStatus}` : ''}`
}
