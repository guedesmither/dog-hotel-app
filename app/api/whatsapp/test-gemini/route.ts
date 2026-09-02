import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY || ''
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não definida', hasKey: false })
  }

  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Escreva uma frase curta sobre um cachorro chamado Teobaldo que comeu tudo no almoço.' }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
          topP: 0.9,
        },
      }),
    })

    const status = res.status
    const rawText = await res.text()

    return NextResponse.json({
      hasKey: true,
      keyPrefix: apiKey.substring(0, 6) + '...',
      model,
      httpStatus: status,
      response: rawText.substring(0, 1000),
    })
  } catch (err: any) {
    return NextResponse.json({
      hasKey: true,
      keyPrefix: apiKey.substring(0, 6) + '...',
      model,
      error: err?.message || String(err),
    })
  }
}
