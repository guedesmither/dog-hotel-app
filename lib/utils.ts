import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date
    if (isNaN(d.getTime())) return '—'
    return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return '—'
  }
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : date
    if (isNaN(d.getTime())) return '—'
    return format(d, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '—'
  }
}

export function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

export const MEAL_STATUS_LABELS: Record<string, string> = {
  PENDING: '⏳ Pendente',
  ALL: '✅ Comeu tudo',
  PARTIAL: '🔸 Comeu parcial',
  REFUSED: '❌ Recusou',
}

export const MEAL_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  ALL: 'bg-green-100 text-green-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  REFUSED: 'bg-red-100 text-red-700',
}

export const MOOD_OPTIONS = [
  { value: 'calmo', label: 'Calmo' },
  { value: 'mais quietinho', label: 'Mais quietinho' },
  { value: 'agitado', label: 'Agitado' },
  { value: 'feliz', label: 'Feliz' },
]

export const MOOD_EMOJIS: Record<string, string> = {
  calmo: ':)',
  'mais quietinho': ':|',
  agitado: ':D',
  feliz: ':)',
}

export function generateWhatsAppMessage(data: {
  dogName: string
  date: string
  breakfastStatus: string
  breakfastQty?: string | null
  breakfastNotes?: string | null
  lunchStatus: string
  lunchQty?: string | null
  lunchNotes?: string | null
  afternoonSnackStatus: string
  afternoonSnackQty?: string | null
  afternoonSnackNotes?: string | null
  dinnerStatus: string
  dinnerQty?: string | null
  dinnerNotes?: string | null
  hasMedication: boolean
  medicationGiven?: boolean | null
  medicationNotes?: string | null
  mood?: string | null
  generalNotes?: string | null
  activities: Array<{ name: string; participated: boolean; notes?: string | null }>
  photosCount: number
  hotelName?: string
}) {
  const mealStatusText: Record<string, string> = {
    PENDING: '',
    ALL: 'Comeu tudo [OK]',
    PARTIAL: 'Comeu parcial [1/2]',
    REFUSED: 'Recusou [X]',
  }

  const dateFormatted = formatDate(data.date)
  const lines: string[] = []

  lines.push(`*${data.dogName} - ${dateFormatted}*`)
  lines.push('')

  // Refeições — só inclui se tiver status preenchido (não PENDING)
  const meals: string[] = []
  const fmtMeal = (icon: string, label: string, status: string, qty?: string | null, notes?: string | null) => {
    const statusText = mealStatusText[status]
    if (!statusText) return // skip PENDING
    let line = `${icon} ${label}: ${statusText}`
    if (qty) line += ` (${qty})`
    if (notes) line += `\n    _${notes}_`
    meals.push(line)
  }
  fmtMeal('[M]', 'Cafe da manha', data.breakfastStatus, data.breakfastQty, data.breakfastNotes)
  fmtMeal('[A]', 'Almoco', data.lunchStatus, data.lunchQty, data.lunchNotes)
  fmtMeal('�', 'Lanche da tarde', data.afternoonSnackStatus, data.afternoonSnackQty, data.afternoonSnackNotes)
  fmtMeal('�', 'Janta', data.dinnerStatus, data.dinnerQty, data.dinnerNotes)

  if (meals.length > 0) {
    lines.push('*REFEICOES:*')
    meals.forEach(m => lines.push(m))
    lines.push('')
  }

  // Medicação — só se o cão tiver medicação
  if (data.hasMedication) {
    lines.push(`*Medicacao:* ${data.medicationGiven ? 'Administrada [OK]' : 'Nao administrada [X]'}`)
    if (data.medicationNotes) lines.push(`    _${data.medicationNotes}_`)
    lines.push('')
  }

  // Humor — só se preenchido
  if (data.mood) {
    const moodLabel = data.mood.charAt(0).toUpperCase() + data.mood.slice(1)
    lines.push(`${MOOD_EMOJIS[data.mood] || ':)'} *Humor:* ${moodLabel}`)
    lines.push('')
  }

  // Atividades — só as que participou
  const participated = data.activities.filter(a => a.participated)
  if (participated.length > 0) {
    lines.push('*ATIVIDADES:*')
    participated.forEach(a => {
      let line = `• ${a.name}`
      if (a.notes) line += ` — _${a.notes}_`
      lines.push(line)
    })
    lines.push('')
  }

  // Observações — só se preenchido
  if (data.generalNotes?.trim()) {
    lines.push(`*OBSERVACOES:*\n${data.generalNotes.trim()}`)
    lines.push('')
  }

  // Fotos
  if (data.photosCount > 0) {
    lines.push(`[FOTO] *${data.photosCount} foto${data.photosCount > 1 ? 's' : ''}* do dia em anexo!`)
    lines.push('')
  }

  lines.push(`_${data.hotelName || 'AU-Ê Petcare'}_`)

  return lines.join('\n')
}

export function buildWhatsAppUrl(phone: string, message: string) {
  // Remove tudo exceto dígitos
  let cleanPhone = phone.replace(/\D/g, '')
  
  // Garante o código do Brasil (55)
  if (!cleanPhone.startsWith('55')) {
    cleanPhone = '55' + cleanPhone
  }
  
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${cleanPhone}?text=${encoded}`
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestão',
  MONITOR: 'Monitor(a)',
  TUTOR: 'Tutor',
}

export const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  MONITOR: 'bg-green-100 text-green-700',
  TUTOR: 'bg-amber-100 text-amber-700',
}
