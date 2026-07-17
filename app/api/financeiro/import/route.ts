import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const INAUGURATION_DATE = new Date('2026-02-07')

function calcPeriod(date: Date) {
  return date < INAUGURATION_DATE
    ? 'PRE_INAUGURACAO'
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function parseBRL(v: string): number {
  return parseFloat(v.trim().replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''))
}

function parseDate(v: string): Date | null {
  // DD/MM/YYYY ou YYYY-MM-DD
  const clean = v.trim()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/')
    return new Date(`${y}-${m}-${d}T12:00:00Z`)
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return new Date(clean.substring(0, 10) + 'T12:00:00Z')
  }
  return null
}

function inferCategory(desc: string, supplier: string, type: string): string {
  const s = (desc + ' ' + supplier).toUpperCase()
  if (type === 'E') return 'ENTRADA CAIXA'
  if (s.includes('SALARI') || s.includes('FOLHA') || s.includes('SARAH')) return 'FOLHA SALARIAL'
  if (s.includes('ALUGUEL') || s.includes('ELAINE DUMAS')) return 'ALUGUEL'
  if (s.includes('PROLABORE') || s.includes('PRO-LABORE') || s.includes('RETIRADA')) return 'PROLABORE'
  if (s.includes('ENEL') || s.includes('ELETRO') || s.includes('ENERGIA') || s.includes('ELETROPAULO')) return 'ENERGIA ELÉTRICA'
  if (s.includes('SABESP') || s.includes('ÁGUA') || s.includes('AGUA')) return 'ÁGUA'
  if (s.includes('CONTAB') || s.includes('CONTAAGIL')) return 'CONTABILIDADE'
  if (s.includes('FACEBOOK') || s.includes('INSTAGRAM') || s.includes('GOOGLE ADS') || s.includes('MARKETING')) return 'COMUNICAÇÃO E MARKETING'
  if (s.includes('INTERNET') || s.includes('TELEFON') || s.includes('VIVO') || s.includes('CLARO') || s.includes('TIM')) return 'INTERNET'
  if (s.includes('IPTU') || s.includes('PREFEITURA')) return 'IMPOSTO IPTU'
  if (s.includes('OBRA') || s.includes('PINTO') || s.includes('MÃO DE OBRA') || s.includes('CONSTRUC')) return 'OBRA'
  if (s.includes('LIMPEZA') || s.includes('PRODUTO LIMP')) return 'MATERIAL LIMPEZA'
  if (s.includes('BOMBEIRO') || s.includes('AVCB')) return 'TAXA BOMBEIROS'
  if (s.includes('JUNTA') || s.includes('COMERCIAL')) return 'TAXA JUNTA COMERCIAL'
  if (s.includes('ASSOCIA')) return 'ASSOCIAÇÃO'
  if (s.includes('CARTÃO') || s.includes('STONE') || s.includes('INFINITEPAY') || s.includes('GETNET')) return 'SISTEMA CARTÃO'
  if (s.includes('PET') || s.includes('EQUIPAMENTO') || s.includes('MERCADO LIVRE') || s.includes('SHOPEE') || s.includes('INFRA')) return 'INFRAESTRUTURA'
  return 'OUTROS'
}

// Parse CSV do InfinityPay / extrato genérico
// Tenta detectar o formato automaticamente
function parseCSV(text: string, account: string): { entries: any[], skipped: string[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return { entries: [], skipped: [] }

  const entries: any[] = []
  const skipped: string[] = []

  // Detectar separador
  const sep = lines[0].includes(';') ? ';' : ','

  // Parse header
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ''))

  // Mapear colunas conhecidas
  const colIdx = (names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex(h => h.includes(n))
      if (i >= 0) return i
    }
    return -1
  }

  const dateCol = colIdx(['data', 'date', 'dt'])
  const descCol = colIdx(['descri', 'descrição', 'historico', 'histórico', 'memo', 'lançamento'])
  const valCol = colIdx(['valor', 'value', 'amount', 'quantia'])
  const typeCol = colIdx(['tipo', 'type', 'débito', 'crédito', 'dc', 'd/c'])
  const supplierCol = colIdx(['beneficiário', 'beneficiario', 'favorecido', 'nome', 'pagador', 'fornecedor'])

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw.trim()) continue

    const cols = raw.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))

    const dateStr = dateCol >= 0 ? cols[dateCol] : cols[0]
    const date = parseDate(dateStr)
    if (!date) { skipped.push(`Linha ${i + 1}: data inválida "${dateStr}"`); continue }

    const descRaw = descCol >= 0 ? cols[descCol] : (cols[1] || '')
    const supplierRaw = supplierCol >= 0 ? cols[supplierCol] : ''
    const valRaw = valCol >= 0 ? cols.slice(valCol).join(',') : (cols[cols.length - 1] || '0')

    const amount = parseBRL(valRaw)
    if (isNaN(amount) || amount === 0) { skipped.push(`Linha ${i + 1}: valor inválido "${valRaw}"`); continue }

    // Determinar tipo (E/S)
    // Prioridade 1: sinal explícito (+/-) no valor bruto — é a fonte mais confiável
    // quando presente (ex.: extratos com "Valor" tipo "+R$ 1.000,00" / "-R$ 100,00").
    const valTrim = valRaw.trim()
    let type: 'E' | 'S'
    if (valTrim.startsWith('-')) {
      type = 'S'
    } else if (valTrim.startsWith('+')) {
      type = 'E'
    } else if (typeCol >= 0) {
      const t = cols[typeCol].toUpperCase()
      type = (t === 'CRÉDITO' || t === 'CREDITO' || t === 'C' || t === 'E' || t === 'ENTRADA') ? 'E' : 'S'
    } else {
      type = amount > 0 ? 'E' : 'S'
    }

    const absAmount = Math.abs(amount)
    const description = descRaw || supplierRaw || 'Importado'
    const supplier = supplierRaw || descRaw || undefined
    const category = inferCategory(description, supplier || '', type)
    const period = calcPeriod(date)

    entries.push({ type, date, amount: absAmount, account, supplier: supplier || null, description, category, period })
  }

  return { entries, skipped }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const account = (formData.get('account') as string) || 'AUÊ'
  const dryRun = formData.get('dryRun') === 'true'

  if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

  const text = await file.text()
  const { entries, skipped } = parseCSV(text, account)

  if (dryRun) {
    return NextResponse.json({ preview: entries, skipped, total: entries.length })
  }

  // Checar duplicatas: mesma data + valor + tipo + conta
  const existing = await prisma.financialEntry.findMany({
    select: { date: true, amount: true, type: true, account: true },
  })
  const existingKeys = new Set(
    existing.map(e => `${e.date.toISOString().split('T')[0]}|${e.type}|${e.amount}|${e.account}`)
  )

  const toInsert = entries.filter(e => {
    const key = `${e.date.toISOString().split('T')[0]}|${e.type}|${e.amount}|${e.account}`
    return !existingKeys.has(key)
  })

  const duplicates = entries.length - toInsert.length

  if (toInsert.length > 0) {
    await prisma.financialEntry.createMany({ data: toInsert })
  }

  return NextResponse.json({
    imported: toInsert.length,
    duplicates,
    skipped: skipped.length,
    skippedDetails: skipped,
  })
}
