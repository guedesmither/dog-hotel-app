import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWhatsAppMessage, sendWhatsAppImage, normalizePhone } from '@/lib/whatsapp'
import { getGeminiApiKey } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

const GEMINI_MODEL = 'gemini-2.5-flash'

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
      dog: { select: { id: true, name: true, breed: true, ownerName: true, ownerPhone: true } },
      activities: true,
      photos: true,
    },
    orderBy: { dog: { name: 'asc' } },
  })

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

  for (const report of reports) {
    if (report.absent) {
      drafts[report.dogId] = `Olá ${report.dog.ownerName}! Aviso que ${report.dog.name} não veio hoje. Qualquer coisa, estamos à disposição! 🐾`
      continue
    }

    const prompt = buildReportPrompt(report, attendantProfile)

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
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
          console.error('[daily-summary] Gemini returned empty text for', report.dog.name, JSON.stringify(data))
          drafts[report.dogId] = `Olá ${report.dog.ownerName}! O ${report.dog.name} teve um bom dia hoje. Em breve enviaremos mais detalhes. 🐾`
        }
      } else {
        const errText = await res.text()
        console.error('[daily-summary] Gemini API error for', report.dog.name, errText)
        drafts[report.dogId] = `Olá ${report.dog.ownerName}! O ${report.dog.name} teve um bom dia hoje. Em breve enviaremos mais detalhes. 🐾`
      }
    } catch (err) {
      console.error('[daily-summary] Gemini fetch error for', report.dog.name, err)
      drafts[report.dogId] = `Olá ${report.dog.ownerName}! O ${report.dog.name} teve um bom dia hoje. Em breve enviaremos mais detalhes. 🐾`
    }
  }

  // Save drafts to AppSetting
  await prisma.appSetting.upsert({
    where: { key: `daily_drafts_${date}` },
    update: { value: JSON.stringify(drafts) },
    create: { key: `daily_drafts_${date}`, value: JSON.stringify(drafts) },
  })

  return NextResponse.json({ date, drafts, count: Object.keys(drafts).length })
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
  attendantProfile: string
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
    if (status === 'EATEN') {
      mealsText.push(`${label}: comeu${qty ? ` (${qty})` : ''}${notes ? ` - ${notes}` : ''}`)
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

  const profileInstruction = attendantProfile
    ? `\n\nUse este estilo de atendimento:\n${attendantProfile}`
    : ''

  return `Você é a assistente do Dog Hotel. Escreva uma mensagem de WhatsApp para ${dog.ownerName}, tutor(a) do cachorro ${dog.name} (${dog.breed}), sobre como foi o dia dele hoje no hotel/creche.

FORMATO OBRIGATÓRIO da mensagem (use exatamente estes campos):

Resumo do dia do ${dog.name}

Alimentação: [Analise as refeições do dia. Se comeu tudo, diga que comeu bem. Se comeu parcial, informe quanto do parcial ele comeu. Se não comeu, diga de forma sutil e carinhosa que o cãozinho esteve mais agitado no dia e não quis realizar a refeição nas tentativas propostas]

Brincadeiras: [Analise as brincadeiras/atividades realizadas no dia e com base no humor diga se ele participou de forma animada, agitada ou se ficou mais quietinho]

Medicação: [SÓ inclua este campo se houver medicação marcada. Informe se foi medicado corretamente. Se NÃO houver medicação, NÃO inclua este campo]

Use 1-2 emojis no total. Não mencione valores financeiros. Termine com uma frase breve se colocando à disposição. Escreva apenas a mensagem, pronta para enviar no WhatsApp.

Dados do dia de ${dog.name}:
${moodText ? `- Humor: ${moodText}` : ''}
${mealsText.length > 0 ? `- Alimentação:\n${mealsText.map(m => `  ${m}`).join('\n')}` : '- Alimentação: sem registros'}
${activitiesText ? `- Atividades: ${activitiesText}` : ''}
${medText ? `- ${medText}` : ''}
${report.generalNotes ? `- Observações: ${report.generalNotes}` : ''}
${report.checkInNotes ? `- Notas de entrada: ${report.checkInNotes}` : ''}
${report.photos.length > 0 ? `- ${report.photos.length} foto(s) tirada(s) durante o dia` : ''}${profileInstruction}`
}
