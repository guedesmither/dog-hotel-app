import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage, sendWhatsAppImage, normalizePhone } from '@/lib/whatsapp'
import { getGeminiApiKey } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

const GEMINI_MODEL = 'gemini-3.6-flash'

interface DogSummary {
  dogId: string
  dogName: string
  breed: string
  ownerName: string
  ownerPhone: string
  reportId: string
  date: string
  mood: string | null
  generalNotes: string | null
  checkInNotes: string | null
  absent: boolean
  hasMedication: boolean
  medicationGiven: boolean | null
  medicationNotes: string | null
  meals: {
    breakfast: { status: string; qty: string | null; notes: string | null }
    lunch: { status: string; qty: string | null; notes: string | null }
    afternoonSnack: { status: string; qty: string | null; notes: string | null }
    dinner: { status: string; qty: string | null; notes: string | null }
  }
  activities: { name: string; participated: boolean; notes: string | null }[]
  photos: { url: string; caption: string | null }[]
  draftMessage: string | null
  sent: boolean
}

// GET /api/whatsapp/daily-summary?date=YYYY-MM-DD
// Returns all dogs with reports for the date, with draft messages
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role === 'TUTOR') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const reports = await prisma.dailyReport.findMany({
    where: { date },
    include: {
      dog: { select: { id: true, name: true, breed: true, ownerName: true, ownerPhone: true, photoUrl: true } },
      activities: true,
      photos: true,
    },
    orderBy: { dog: { name: 'asc' } },
  })

  // Get existing drafts from AppSetting
  const draftsSetting = await prisma.appSetting.findUnique({
    where: { key: `daily_drafts_${date}` },
  })
  const existingDrafts: Record<string, string> = draftsSetting
    ? JSON.parse(draftsSetting.value)
    : {}

  // Get sent status from reports
  const summaries: DogSummary[] = reports.map(report => {
    const meals = {
      breakfast: { status: report.breakfastStatus, qty: report.breakfastQty, notes: report.breakfastNotes },
      lunch: { status: report.lunchStatus, qty: report.lunchQty, notes: report.lunchNotes },
      afternoonSnack: { status: report.afternoonSnackStatus, qty: report.afternoonSnackQty, notes: report.afternoonSnackNotes },
      dinner: { status: report.dinnerStatus, qty: report.dinnerQty, notes: report.dinnerNotes },
    }

    return {
      dogId: report.dogId,
      dogName: report.dog.name,
      breed: report.dog.breed,
      ownerName: report.dog.ownerName,
      ownerPhone: report.dog.ownerPhone,
      reportId: report.id,
      date: report.date,
      mood: report.mood,
      generalNotes: report.generalNotes,
      checkInNotes: report.checkInNotes,
      absent: report.absent,
      hasMedication: report.hasMedication,
      medicationGiven: report.medicationGiven,
      medicationNotes: report.medicationNotes,
      meals,
      activities: report.activities.map(a => ({ name: a.name, participated: a.participated, notes: a.notes })),
      photos: report.photos.map(p => ({ url: p.url, caption: p.caption })),
      draftMessage: existingDrafts[report.dogId] || null,
      sent: report.sentToWhatsApp,
    }
  })

  return NextResponse.json({ date, summaries })
}

// POST /api/whatsapp/daily-summary
// Body: { date: string, dogIds?: string[] }
// Generates Gemini draft messages for all (or specified) dogs with reports on that date
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role === 'TUTOR') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const apiKey = getGeminiApiKey()
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY não configurada' }, { status: 500 })

  const body = await req.json()
  const date = body.date || new Date().toISOString().split('T')[0]
  const dogIds = body.dogIds as string[] | undefined

  const reports = await prisma.dailyReport.findMany({
    where: {
      date,
      ...(dogIds ? { dogId: { in: dogIds } } : {}),
    },
    include: {
      dog: { select: { id: true, name: true, breed: true, ownerName: true, ownerPhone: true, createdAt: true, sex: true } },
      activities: true,
      photos: true,
    },
    orderBy: { dog: { name: 'asc' } },
  })

  // Fetch weather for Osasco, SP
  let weatherInfo = ''
  try {
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=-23.53&longitude=-46.79&current=temperature_2m,weather_code&timezone=America/Sao_Paulo&forecast_days=1`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (weatherRes.ok) {
      const w = await weatherRes.json()
      const temp = w.current?.temperature_2m
      const code = w.current?.weather_code
      const weatherMap: Record<number, string> = {
        0: 'céu limpo', 1: 'predominantemente limpo', 2: 'parcialmente nublado',
        3: 'nublado', 45: 'neblina', 48: 'neblina com geada',
        51: 'garoa leve', 53: 'garoa moderada', 55: 'garoa intensa',
        61: 'chuva leve', 63: 'chuva moderada', 65: 'chuva forte',
        71: 'neve leve', 73: 'neve moderada', 75: 'neve forte',
        80: 'pancadas leves', 81: 'pancadas moderadas', 82: 'pancadas violentas',
        95: 'tempestade', 96: 'tempestade com granizo leve', 99: 'tempestade com granizo forte',
      }
      const desc = weatherMap[code] || 'tempo instável'
      if (temp !== undefined) {
        weatherInfo = `Clima em Osasco/SP hoje: ${desc}, ${Math.round(temp)}°C`
      }
    }
  } catch {
    // weather is optional, continue without it
  }

  if (reports.length === 0) {
    return NextResponse.json({ error: 'Nenhum relatório encontrado para esta data' }, { status: 404 })
  }

  // Get attendant profile for tone/style
  const profileSetting = await prisma.appSetting.findUnique({
    where: { key: 'whatsapp_attendant_profile' },
  })
  const attendantProfile = profileSetting?.value || ''

  // Generate drafts for each dog
  const drafts: Record<string, string> = {}
  const debugErrors: string[] = []

  for (const report of reports) {
    if (report.absent) {
      drafts[report.dogId] = `Olá ${report.dog.ownerName}! Aviso que ${report.dog.name} não veio hoje. Qualquer coisa, estamos à disposição! 🐾`
      continue
    }

    // Fetch last 10 days of reports for this dog (excluding today)
    const historyReports = await prisma.dailyReport.findMany({
      where: {
        dogId: report.dogId,
        date: { lt: date },
        absent: false,
      },
      include: { activities: true },
      orderBy: { date: 'desc' },
      take: 10,
    })

    // Debug: log raw meal data
    console.log('[daily-summary] RAW MEALS for', report.dog.name, {
      date: report.date,
      breakfast: report.breakfastStatus,
      lunch: report.lunchStatus,
      afternoonSnack: report.afternoonSnackStatus,
      dinner: report.dinnerStatus,
    })

    const prompt = buildReportPrompt(report, attendantProfile, historyReports, weatherInfo)

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: 'Você é uma assistente que escreve mensagens curtas e naturais de WhatsApp em PORTUGUÊS DO BRASIL. Nunca escreva em inglês. Suas mensagens são sempre breves, carinhosas e diretas, no estilo de uma mensagem real de WhatsApp.' }] },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
              topP: 0.9,
            },
          }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        if (text.trim()) {
          drafts[report.dogId] = text.trim()
        } else {
          const dbg = `[empty] ${report.dog.name}: ${JSON.stringify(data).substring(0, 300)}`
          console.error('[daily-summary]', dbg)
          debugErrors.push(dbg)
          drafts[report.dogId] = `Olá ${report.dog.ownerName}! O ${report.dog.name} teve um bom dia hoje. Em breve enviaremos mais detalhes. 🐾`
        }
      } else {
        const errText = await res.text()
        const dbg = `[api-error ${res.status}] ${report.dog.name}: ${errText.substring(0, 300)}`
        console.error('[daily-summary]', dbg)
        debugErrors.push(dbg)
        drafts[report.dogId] = `Olá ${report.dog.ownerName}! O ${report.dog.name} teve um bom dia hoje. Em breve enviaremos mais detalhes. 🐾`
      }
    } catch (err: any) {
      const dbg = `[fetch-error] ${report.dog.name}: ${err?.message || String(err)}`
      console.error('[daily-summary]', dbg)
      debugErrors.push(dbg)
      drafts[report.dogId] = `Olá ${report.dog.ownerName}! O ${report.dog.name} teve um bom dia hoje. Em breve enviaremos mais detalhes. 🐾`
    }
  }

  // Save drafts to AppSetting
  await prisma.appSetting.upsert({
    where: { key: `daily_drafts_${date}` },
    update: { value: JSON.stringify(drafts) },
    create: { key: `daily_drafts_${date}`, value: JSON.stringify(drafts) },
  })

  return NextResponse.json({ date, drafts, count: Object.keys(drafts).length, debug: debugErrors.length > 0 ? debugErrors : undefined })
}

// PUT /api/whatsapp/daily-summary
// Body: { date: string, dogId: string, message: string }
// Updates a single draft message
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role === 'TUTOR') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { date, dogId, message } = body

  if (!date || !dogId || message === undefined) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: date, dogId, message' }, { status: 400 })
  }

  const draftsSetting = await prisma.appSetting.findUnique({
    where: { key: `daily_drafts_${date}` },
  })
  const drafts: Record<string, string> = draftsSetting ? JSON.parse(draftsSetting.value) : {}
  drafts[dogId] = message

  await prisma.appSetting.upsert({
    where: { key: `daily_drafts_${date}` },
    update: { value: JSON.stringify(drafts) },
    create: { key: `daily_drafts_${date}`, value: JSON.stringify(drafts) },
  })

  return NextResponse.json({ success: true })
}

// PATCH /api/whatsapp/daily-summary
// Body: { date: string, dogId: string, reportId: string }
// Sends the draft message via WhatsApp and marks report as sent
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role === 'TUTOR') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body = await req.json()
  const { date, dogId, reportId, image } = body as { date: string; dogId: string; reportId: string; image?: string }

  if (!date || !dogId || !reportId) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: date, dogId, reportId' }, { status: 400 })
  }

  // Get draft
  const draftsSetting = await prisma.appSetting.findUnique({
    where: { key: `daily_drafts_${date}` },
  })
  const drafts: Record<string, string> = draftsSetting ? JSON.parse(draftsSetting.value) : {}
  const message = drafts[dogId]

  if (!message) {
    return NextResponse.json({ error: 'Rascunho não encontrado' }, { status: 404 })
  }

  // Get dog phone
  const report = await prisma.dailyReport.findUnique({
    where: { id: reportId },
    include: { dog: { select: { id: true, name: true, ownerName: true, ownerPhone: true } } },
  })

  if (!report) {
    return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 })
  }

  const phone = normalizePhone(report.dog.ownerPhone)
  if (!phone) {
    return NextResponse.json({ error: 'Telefone do tutor não encontrado' }, { status: 400 })
  }

  // Send via WhatsApp (image with caption or text only)
  const sendResult = image
    ? await sendWhatsAppImage(phone, image, message)
    : await sendWhatsAppMessage(phone, message)

  if (!sendResult) {
    return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 })
  }

  // Mark report as sent
  await prisma.dailyReport.update({
    where: { id: reportId },
    data: { sentToWhatsApp: true },
  })

  // Save message to conversation
  const conv = await prisma.whatsAppConversation.findUnique({
    where: { phoneNumber: phone },
  })

  if (conv) {
    await prisma.whatsAppMessage.create({
      data: {
        conversationId: conv.id,
        direction: 'OUTBOUND',
        source: 'HUMAN',
        text: message,
        waMessageId: sendResult.id,
        status: 'SENT',
      },
    })
  }

  return NextResponse.json({ success: true, messageId: sendResult.id })
}

function buildReportPrompt(
  report: any,
  attendantProfile: string,
  historyReports: any[] = [],
  weatherInfo = ''
): string {
  const dog = report.dog
  const mealsText = []
  
  const mealMap = [
    ['Café da manhã', report.breakfastStatus, report.breakfastQty, report.breakfastNotes],
    ['Almoço', report.lunchStatus, report.lunchQty, report.lunchNotes],
    ['Lanche da tarde', report.afternoonSnackStatus, report.afternoonSnackQty, report.afternoonSnackNotes],
    ['Janta', report.dinnerStatus, report.dinnerQty, report.dinnerNotes],
  ] as const

  for (const [label, status, qty, notes] of mealMap) {
    if (status === 'ALL') {
      mealsText.push(`${label}: comeu tudo${qty ? ` (${qty})` : ''}${notes ? ` - ${notes}` : ''}`)
    } else if (status === 'PARTIAL') {
      mealsText.push(`${label}: comeu parcialmente${qty ? ` (${qty})` : ''}${notes ? ` - ${notes}` : ''}`)
    } else if (status === 'REFUSED') {
      mealsText.push(`${label}: recusou${notes ? ` - ${notes}` : ''}`)
    }
  }

  const activitiesText = report.activities
    .filter((a: any) => a.participated)
    .map((a: any) => a.name + (a.notes ? ` (${a.notes})` : ''))
    .join(', ')

  const medText = report.hasMedication
    ? `Medicação: ${report.medicationGiven ? 'aplicada' : 'não aplicada'}${report.medicationNotes ? ` - ${report.medicationNotes}` : ''}`
    : ''

  const moodMap: Record<string, string> = {
    'HAPPY': 'feliz',
    'CALM': 'tranquilo',
    'ANXIOUS': 'ansioso',
    'TIRED': 'cansado',
    'PLAYFUL': 'brincalhão',
    'SHY': 'tímido',
  }
  const moodText = report.mood ? moodMap[report.mood] || report.mood : ''

  // First name only
  const firstName = dog.ownerName.split(' ')[0]

  // Pronouns based on sex
  const isFemale = dog.sex === 'FEMEA' || dog.sex === 'F' || dog.sex === 'Fêmea'
  const pronoun = isFemale ? 'ela' : 'ele'
  const article = isFemale ? 'a' : 'o'
  const articleUpper = isFemale ? 'A' : 'O'

  // Check if dog is new (created within last 30 days)
  const dogCreatedAt = new Date(dog.createdAt)
  const daysSinceCreated = Math.floor((Date.now() - dogCreatedAt.getTime()) / (1000 * 60 * 60 * 24))
  const isNewDog = daysSinceCreated <= 30

  // Build history summary
  let historySummary = ''
  if (historyReports.length > 0) {
    const eatingScores: string[] = []
    const moodHistory: string[] = []
    const activityHistory: string[] = []
    for (const h of historyReports) {
      const hMeals = [h.breakfastStatus, h.lunchStatus, h.afternoonSnackStatus, h.dinnerStatus]
        .filter(s => s === 'ALL').length
      const hTotal = [h.breakfastStatus, h.lunchStatus, h.afternoonSnackStatus, h.dinnerStatus]
        .filter(s => s !== 'PENDING').length
      if (hTotal > 0) {
        eatingScores.push(`${h.date}: ${hMeals}/${hTotal} refeições`)
      }
      if (h.mood) {
        moodHistory.push(`${h.date}: ${moodMap[h.mood] || h.mood}`)
      }
      const hActs = h.activities.filter((a: any) => a.participated).map((a: any) => a.name).join(', ')
      if (hActs) {
        activityHistory.push(`${h.date}: ${hActs}`)
      }
    }
    historySummary = [
      eatingScores.length > 0 ? `Histórico alimentação (últimos ${historyReports.length} dias):\n  ${eatingScores.join('\n  ')}` : '',
      moodHistory.length > 0 ? `Histórico humor:\n  ${moodHistory.join('\n  ')}` : '',
      activityHistory.length > 0 ? `Histórico atividades:\n  ${activityHistory.join('\n  ')}` : '',
    ].filter(Boolean).join('\n')
  }

  const profileInstruction = attendantProfile
    ? `\n\nUse este estilo de atendimento:\n${attendantProfile}`
    : ''

  // Calculate greeting based on Brazil timezone (UTC-3)
  const brTime = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false })
  const brHour = parseInt(brTime)
  const greeting = brHour < 12 ? 'bom dia' : brHour < 18 ? 'boa tarde' : 'boa noite'

  return `Você é a assistente do Dog Hotel AU-Ê Petcare em Osasco/SP. Escreva uma mensagem curta e natural de WhatsApp em PORTUGUÊS DO BRASIL para ${dog.ownerName}, tutor(a) do cachorro ${dog.name} (${dog.breed}). ${dog.name} é ${isFemale ? 'uma cadela (fêmea)' : 'um cachorro (macho)'}. Use sempre os pronomes e artigos corretos: ${pronoun}/${article} para ${dog.name}.

A mensagem deve seguir EXATAMENTE este formato (escreva em PORTUGUÊS, nunca em inglês):

${firstName}, ${greeting}!
Passando pra dizer que hoje ${article} ${dog.name} [descreva como foi o dia de ${pronoun} de forma breve e natural, 2-3 linhas, mencionando humor, atividades e alimentação de forma conversacional. Use sempre ${pronoun}/${article} para se referir a ${dog.name}]

Regras para o texto:
1. Considere o humor do cão (${moodText || 'não registrado'}) para definir o tom da mensagem
2. Mencione as atividades que ${pronoun} realizou: ${activitiesText || 'nenhuma atividade registrada'}
3. Sobre alimentação: ${mealsText.length > 0 ? mealsText.join('; ') : 'sem registros de alimentação'}
   - Se comeu tudo, diga que comeu bem
   - Se comeu parcialmente, aponte isso sutilmente
   - Se não comeu nada, diga de forma amena que ${pronoun} recusou a comida após algumas tentativas, por provável ansiedade${isNewDog ? ' ou por estar na fase de adaptação (cão novo)' : ''}
   - Se estiver pendente, não mencione essa refeição
4. ${medText ? `Inclua que a medicação foi ${report.medicationGiven ? 'aplicada corretamente' : 'não foi possível aplicar'}.` : 'NÃO mencione medicação pois não há.'}
5. Use 1-2 emojis no total. Não mencione valores financeiros.
6. Termine com uma frase breve se colocando à disposição.
7. Escreva apenas a mensagem, pronta para enviar no WhatsApp. Sem títulos, sem cabeçalhos. Seja BREVE - máximo 5 linhas no total.

Dados do dia de ${dog.name}:
- Sexo: ${isFemale ? 'fêmea' : 'macho'}
- Humor: ${moodText || 'não registrado'}
- Alimentação: ${mealsText.length > 0 ? mealsText.join('; ') : 'sem registros'}
- Atividades: ${activitiesText || 'nenhuma'}
${medText ? `- ${medText}` : ''}
${report.generalNotes ? `- Observações: ${report.generalNotes}` : ''}
${report.checkInNotes ? `- Notas de entrada: ${report.checkInNotes}` : ''}
${report.photos.length > 0 ? `- ${report.photos.length} foto(s) tirada(s) durante o dia` : ''}
${isNewDog ? `- Cão novo: cadastrado há ${daysSinceCreated} dias (fase de adaptação)` : ''}
${weatherInfo ? `- ${weatherInfo}` : ''}
${historySummary ? `\n${historySummary}` : ''}
${profileInstruction}`
}
