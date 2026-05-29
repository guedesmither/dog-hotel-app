'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Send, Camera, Check, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate, getTodayString, MEAL_STATUS_LABELS, MOOD_OPTIONS, generateWhatsAppMessage, buildWhatsAppUrl } from '@/lib/utils'

interface Activity {
  id: string
  name: string
  participated: boolean
  notes: string | null
}

interface Photo {
  id: string
  url: string
  caption: string | null
}

interface Report {
  id: string
  dogId: string
  date: string
  absent: boolean
  breakfastStatus: string
  breakfastQty: string | null
  breakfastNotes: string | null
  lunchStatus: string
  lunchQty: string | null
  lunchNotes: string | null
  afternoonSnackStatus: string
  afternoonSnackQty: string | null
  afternoonSnackNotes: string | null
  dinnerStatus: string
  dinnerQty: string | null
  dinnerNotes: string | null
  hasMedication: boolean
  medicationGiven: boolean | null
  medicationNotes: string | null
  mood: string | null
  generalNotes: string | null
  sentToWhatsApp: boolean
  activities: Activity[]
  photos: Photo[]
  dog?: {
    name: string
    ownerPhone: string
    ownerName: string
    medications: string | null
  }
}

const MEAL_STATUS_OPTIONS = [
  { value: 'PENDING', label: '⏳ Pendente' },
  { value: 'ALL', label: '✅ Comeu tudo' },
  { value: 'PARTIAL', label: '🔸 Comeu parcial' },
  { value: 'REFUSED', label: '❌ Recusou' },
]

const PRESET_ACTIVITIES = [
  { name: 'Bolinha', emoji: '🎾' },
  { name: 'Piscina', emoji: '🏊' },
  { name: 'Corrida', emoji: '🏃' },
  { name: 'Enriquecimento ambiental', emoji: '🌿' },
  { name: 'Adestramento comportamental', emoji: '🎓' },
  { name: 'Musicoterapia', emoji: '🎵' },
  { name: 'Circuito', emoji: '🏅' },
]

function MealSection({
  title,
  emoji,
  statusKey,
  qtyKey,
  notesKey,
  report,
  onChange,
  saving,
}: {
  title: string
  emoji: string
  statusKey: keyof Report
  qtyKey: keyof Report
  notesKey: keyof Report
  report: Report
  onChange: (key: keyof Report, value: string) => void
  saving: boolean
}) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-gray-700 flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Status</label>
          <select
            className="select"
            value={report[statusKey] as string}
            onChange={(e) => onChange(statusKey, e.target.value)}
            disabled={saving}
          >
            {MEAL_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Quantidade consumida</label>
          <input
            className="input"
            placeholder="Ex: 200g, metade, tudo..."
            value={(report[qtyKey] as string) || ''}
            onChange={(e) => onChange(qtyKey, e.target.value)}
            disabled={saving}
          />
        </div>
      </div>
      <div>
        <label className="label">Observações</label>
        <input
          className="input"
          placeholder="Observações sobre a refeição..."
          value={(report[notesKey] as string) || ''}
          onChange={(e) => onChange(notesKey, e.target.value)}
          disabled={saving}
        />
      </div>
    </div>
  )
}

export default function ReportPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const userRole = (session?.user as { role?: string })?.role
  const readOnly = userRole === 'TUTOR'
  const canSendWhatsApp = userRole === 'ADMIN' || userRole === 'MANAGER'
  const dateParam = searchParams.get('date') || getTodayString()
  const isToday = dateParam === getTodayString()

  const [report, setReport] = useState<Report | null>(null)
  const [replacement, setReplacement] = useState<{ id: string; billingMonthEnd: string; scheduledDate: string | null; status: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newActivity, setNewActivity] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [sharingPhotos, setSharingPhotos] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch(`/api/replacements?status=PENDING`)
      .then(r => r.json())
      .then((list: Array<{ id: string; absentDate: string; billingMonthEnd: string; scheduledDate: string | null; status: string; dog: { id: string } }>) => {
        const found = list.find(x => x.dog.id === params.id && x.absentDate === dateParam)
        if (found) setReplacement(found)
      }).catch(() => {})
    fetch(`/api/replacements?status=SCHEDULED`)
      .then(r => r.json())
      .then((list: Array<{ id: string; absentDate: string; billingMonthEnd: string; scheduledDate: string | null; status: string; dog: { id: string } }>) => {
        const found = list.find(x => x.dog.id === params.id && x.absentDate === dateParam)
        if (found) setReplacement(found)
      }).catch(() => {})
  }, [params.id, dateParam])

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/dogs/${params.id}/reports?date=${dateParam}`)
      const data = await res.json()
      if (data) {
        const dogRes = await fetch(`/api/dogs/${params.id}`)
        const dog = await dogRes.json()
        setReport({ ...data, dog: { name: dog.name, ownerPhone: dog.ownerPhone, ownerName: dog.ownerName, medications: dog.medications } })
      }
      setLoading(false)
    }
    load()
  }, [params.id, dateParam])

  function handleChange(key: keyof Report, value: string | boolean) {
    if (!report) return
    const updated = { ...report, [key]: value }
    setReport(updated)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveReport(updated), 1200)
  }

  async function saveReport(data: Report) {
    setSaving(true)
    try {
      await fetch(`/api/reports/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function forceSave() {
    if (!report) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaving(true)
    try {
      await fetch(`/api/reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })
      toast.success('Relatório salvo!')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function addActivity(name?: string) {
    const actName = name ?? newActivity.trim()
    if (!report || !actName) return
    try {
      const res = await fetch(`/api/reports/${report.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: actName, participated: true }),
      })
      const activity = await res.json()
      setReport((prev) => prev ? { ...prev, activities: [...prev.activities, activity] } : prev)
      if (!name) setNewActivity('')
    } catch {
      toast.error('Erro ao adicionar atividade')
    }
  }

  async function handlePresetToggle(presetName: string) {
    if (!report) return
    const existing = report.activities.find((a) => a.name === presetName)
    if (!existing) {
      await addActivity(presetName)
    } else if (existing.participated) {
      await toggleActivity(existing)
    } else {
      await deleteActivity(existing.id)
    }
  }

  async function toggleActivity(activity: Activity) {
    if (!report) return
    try {
      const res = await fetch(`/api/reports/${report.id}/activities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activity, participated: !activity.participated }),
      })
      const updated = await res.json()
      setReport((prev) => prev ? {
        ...prev,
        activities: prev.activities.map((a) => a.id === updated.id ? updated : a),
      } : prev)
    } catch {
      toast.error('Erro ao atualizar atividade')
    }
  }

  async function deleteActivity(activityId: string) {
    if (!report) return
    try {
      await fetch(`/api/reports/${report.id}/activities?activityId=${activityId}`, { method: 'DELETE' })
      setReport((prev) => prev ? { ...prev, activities: prev.activities.filter((a) => a.id !== activityId) } : prev)
    } catch {
      toast.error('Erro ao remover atividade')
    }
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (!report || !e.target.files?.length) return
    const file = e.target.files[0]
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Foto muito grande (máx. 5MB)')
      return
    }
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      const res = await fetch(`/api/reports/${report.id}/photos`, { method: 'POST', body: formData })
      const photo = await res.json()
      setReport((prev) => prev ? { ...prev, photos: [...prev.photos, photo] } : prev)
      toast.success('Foto adicionada!')
    } catch {
      toast.error('Erro ao enviar foto')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function deletePhoto(photoId: string) {
    if (!report) return
    try {
      await fetch(`/api/reports/${report.id}/photos?photoId=${photoId}`, { method: 'DELETE' })
      setReport((prev) => prev ? { ...prev, photos: prev.photos.filter((p) => p.id !== photoId) } : prev)
    } catch {
      toast.error('Erro ao remover foto')
    }
  }

  function buildMessage() {
    if (!report?.dog) return ''
    return generateWhatsAppMessage({
      dogName: report.dog.name,
      date: report.date,
      breakfastStatus: report.breakfastStatus,
      breakfastQty: report.breakfastQty,
      breakfastNotes: report.breakfastNotes,
      lunchStatus: report.lunchStatus,
      lunchQty: report.lunchQty,
      lunchNotes: report.lunchNotes,
      afternoonSnackStatus: report.afternoonSnackStatus,
      afternoonSnackQty: report.afternoonSnackQty,
      afternoonSnackNotes: report.afternoonSnackNotes,
      dinnerStatus: report.dinnerStatus,
      dinnerQty: report.dinnerQty,
      dinnerNotes: report.dinnerNotes,
      hasMedication: report.hasMedication,
      medicationGiven: report.medicationGiven,
      medicationNotes: report.medicationNotes,
      mood: report.mood,
      generalNotes: report.generalNotes,
      activities: report.activities,
      photosCount: report.photos.length,
    })
  }

  async function markSent() {
    if (!report) return
    await fetch(`/api/reports/${report.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...report, sentToWhatsApp: true }),
    })
    setReport((prev) => prev ? { ...prev, sentToWhatsApp: true } : prev)
  }

  async function sendWhatsApp() {
    if (!report || !report.dog) return
    await forceSave()
    const url = buildWhatsAppUrl(report.dog.ownerPhone, buildMessage())
    window.open(url, '_blank')
    // Auto-mark as sent immediately
    await markSent()
    toast((t) => (
      <div className="flex flex-col gap-2">
        <span className="font-semibold">✅ WhatsApp aberto e marcado como enviado!</span>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              toast.dismiss(t.id)
              // Undo: mark as not sent
              await fetch(`/api/reports/${report.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...report, sentToWhatsApp: false }),
              })
              setReport((prev) => prev ? { ...prev, sentToWhatsApp: false } : prev)
              toast.success('Desfeito!')
            }}
            className="bg-amber-500 text-white px-3 py-1 rounded-lg text-sm font-medium"
          >
            Desfazer
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-sm font-medium"
          >
            OK
          </button>
        </div>
      </div>
    ), { duration: 8000 })
  }

  async function shareWithPhotos() {
    if (!report || !report.dog) return
    if (!navigator.share) {
      toast.error('Compartilhamento nativo não suportado neste navegador')
      return
    }
    await forceSave()
    setSharingPhotos(true)
    try {
      const message = buildMessage()
      if (report.photos.length === 0) {
        await navigator.share({ text: message })
        await markSent()
        toast.success('Compartilhado!')
        return
      }
      const files: File[] = []
      for (const photo of report.photos) {
        try {
          let blob: Blob
          if (photo.url.startsWith('data:')) {
            // base64 data URI — parse directly without fetch (fetch of data: URI unreliable on iOS)
            const [meta, b64] = photo.url.split(',')
            const mimeMatch = meta.match(/data:([^;]+)/)
            const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
            const binary = atob(b64)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
            blob = new Blob([bytes], { type: mime })
          } else {
            const res = await fetch(photo.url)
            blob = await res.blob()
          }
          const ext = blob.type.split('/')[1] || 'jpg'
          const file = new File([blob], `foto-${photo.id}.${ext}`, { type: blob.type || 'image/jpeg' })
          files.push(file)
        } catch { /* skip failed photo */ }
      }
      const shareData: ShareData = { text: message, files: files.length > 0 ? files : undefined }
      if (files.length > 0 && !navigator.canShare(shareData)) {
        // Files not supported — fallback to text only
        await navigator.share({ text: message })
      } else {
        await navigator.share(shareData)
      }
      await markSent()
      toast.success('Compartilhado com fotos!')
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        toast.error('Erro ao compartilhar')
      }
    } finally {
      setSharingPhotos(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-4xl animate-bounce">🐾</div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Relatório não encontrado</p>
        <Link href="/dashboard" className="btn-secondary mt-4 inline-block">Voltar</Link>
      </div>
    )
  }

  const isAbsent = report.absent === true

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-amber-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            📋 Relatório — {report.dog?.name}
          </h1>
          <p className="text-sm text-gray-500">{formatDate(report.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          {readOnly
            ? <span className="badge bg-blue-100 text-blue-700 text-xs">👁 Somente leitura</span>
            : <>
                {saving && <span className="text-xs text-gray-400 animate-pulse">Salvando...</span>}
                <button onClick={forceSave} disabled={saving} className="btn-secondary text-sm flex items-center gap-1">
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
              </>}
        </div>
      </div>

      {!isToday && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          📅 Você está visualizando o relatório de {formatDate(report.date)}
        </div>
      )}

      {isAbsent && (
        <div className="mb-4 space-y-2">
          <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-2xl">🚫</span>
              <div>
                <p className="font-semibold text-gray-700">{report.dog?.name} estava ausente{isToday ? ' hoje' : ` em ${formatDate(report.date)}`}</p>
                <p className="text-xs text-gray-500">Nenhum registro de alimentação ou atividades é necessário.</p>
              </div>
            </div>
            {!readOnly && (
              <button
                onClick={async () => {
                  await fetch('/api/roster/presence', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dogId: params.id, date: dateParam, present: true }),
                  })
                  setReplacement(null)
                  setReport((prev) => prev ? { ...prev, absent: false } : prev)
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 shrink-0"
              >
                ↩ Desfazer
              </button>
            )}
          </div>
          {replacement && (
            <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
              replacement.status === 'SCHEDULED'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-orange-50 border-orange-200 text-orange-800'
            }`}>
              <span className="text-lg">{replacement.status === 'SCHEDULED' ? '📅' : '🔄'}</span>
              <div>
                {replacement.status === 'SCHEDULED' && replacement.scheduledDate
                  ? <><span className="font-semibold">Reposição agendada</span> para {formatDate(replacement.scheduledDate)}</>  
                  : <><span className="font-semibold">Reposição pendente</span> — prazo até {formatDate(replacement.billingMonthEnd)}</>}
              </div>
            </div>
          )}
        </div>
      )}

      <fieldset disabled={readOnly || isAbsent} className="space-y-4">
        {/* MEALS */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4 text-lg">🍽️ Refeições</h2>
          <div className="space-y-4">
            <MealSection title="Café da Manhã" emoji="☀️" statusKey="breakfastStatus" qtyKey="breakfastQty" notesKey="breakfastNotes" report={report} onChange={handleChange} saving={saving} />
            <MealSection title="Almoço" emoji="🌤️" statusKey="lunchStatus" qtyKey="lunchQty" notesKey="lunchNotes" report={report} onChange={handleChange} saving={saving} />
            <MealSection title="Lanche da Tarde" emoji="🍪" statusKey="afternoonSnackStatus" qtyKey="afternoonSnackQty" notesKey="afternoonSnackNotes" report={report} onChange={handleChange} saving={saving} />
            <MealSection title="Janta" emoji="🌙" statusKey="dinnerStatus" qtyKey="dinnerQty" notesKey="dinnerNotes" report={report} onChange={handleChange} saving={saving} />
          </div>
        </div>

        {/* MEDICATION */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4 text-lg">💊 Medicação</h2>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              id="hasMed"
              checked={report.hasMedication}
              onChange={(e) => handleChange('hasMedication', e.target.checked)}
              className="w-4 h-4 accent-amber-600"
            />
            <label htmlFor="hasMed" className="text-sm font-medium text-gray-700">
              Há medicação para administrar hoje?
            </label>
          </div>
          {report.hasMedication && (
            <div className="space-y-3 mt-3 pl-2 border-l-2 border-amber-200">
              {report.dog?.medications && (
                <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                  📋 Medicações cadastradas: {report.dog.medications}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => handleChange('medicationGiven', true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 flex items-center justify-center gap-2 transition-colors ${report.medicationGiven === true ? 'bg-green-100 border-green-500 text-green-700' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}
                >
                  <Check className="w-4 h-4" />
                  Administrada ✅
                </button>
                <button
                  onClick={() => handleChange('medicationGiven', false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 flex items-center justify-center gap-2 transition-colors ${report.medicationGiven === false ? 'bg-red-100 border-red-500 text-red-700' : 'border-gray-200 text-gray-600 hover:border-red-300'}`}
                >
                  <X className="w-4 h-4" />
                  Não dada ❌
                </button>
              </div>
              <div>
                <label className="label">Observações sobre a medicação</label>
                <input
                  className="input"
                  placeholder="Horário, reações, observações..."
                  value={report.medicationNotes || ''}
                  onChange={(e) => handleChange('medicationNotes', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* ACTIVITIES */}
        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-gray-800 text-lg">🎯 Atividades do Dia</h2>
            <span className="text-xs text-gray-400">
              {report.activities.filter(a => a.participated).length} realizadas
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Toque para marcar: <span className="text-green-600 font-medium">✅ participou</span> → <span className="text-red-500 font-medium">❌ não participou</span> → remove
          </p>

          {/* Preset activity cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {PRESET_ACTIVITIES.map((preset) => {
              const existing = report.activities.find((a) => a.name === preset.name)
              const state = !existing ? 'none' : existing.participated ? 'yes' : 'no'
              return (
                <button
                  key={preset.name}
                  onClick={() => handlePresetToggle(preset.name)}
                  className={`relative flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 text-center transition-all font-medium text-xs
                    ${ state === 'yes'
                        ? 'bg-green-50 border-green-400 text-green-700 shadow-sm'
                        : state === 'no'
                        ? 'bg-red-50 border-red-300 text-red-600'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-amber-300 hover:bg-amber-50'
                    }`}
                >
                  <span className="text-xl leading-none">{preset.emoji}</span>
                  <span className="leading-tight">{preset.name}</span>
                  {state !== 'none' && (
                    <span className="absolute top-1 right-1 text-xs">
                      {state === 'yes' ? '✅' : '❌'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Custom activities already added */}
          {report.activities.filter(a => !PRESET_ACTIVITIES.some(p => p.name === a.name)).length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs text-gray-400 font-medium">Outras atividades:</p>
              {report.activities
                .filter(a => !PRESET_ACTIVITIES.some(p => p.name === a.name))
                .map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <button
                      onClick={() => toggleActivity(activity)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors shrink-0 ${activity.participated ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
                    >
                      {activity.participated ? '✅' : '❌'}
                    </button>
                    <span className={`flex-1 text-sm font-medium ${activity.participated ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                      {activity.name}
                    </span>
                    <button onClick={() => deleteActivity(activity.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Other activities input */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 mb-2 font-medium">✨ Outras atividades (especificar):</p>
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Nome da atividade..."
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addActivity())}
              />
              <button onClick={() => addActivity()} disabled={!newActivity.trim()} className="btn-primary flex items-center gap-1 px-3 text-sm">
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </div>
        </div>

        {/* MOOD */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4 text-lg">😊 Humor</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleChange('mood', report.mood === mood.value ? '' : mood.value)}
                className={`p-3 rounded-xl text-sm font-medium border-2 transition-colors text-left ${report.mood === mood.value ? 'bg-amber-100 border-amber-500 text-amber-700' : 'border-gray-100 text-gray-600 hover:border-amber-200 bg-gray-50'}`}
              >
                {mood.label}
              </button>
            ))}
          </div>
        </div>

        {/* GENERAL NOTES */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4 text-lg">📝 Observações Gerais</h2>
          <textarea
            className="textarea"
            rows={4}
            placeholder="Comportamento, intercorrências, algo que o tutor deva saber..."
            value={report.generalNotes || ''}
            onChange={(e) => handleChange('generalNotes', e.target.value)}
          />
        </div>

        {/* PHOTOS */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4 text-lg">📸 Fotos do Dia</h2>
          <div className="mb-4 flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,image/heic,image/heif"
              capture="environment"
              className="hidden"
              onChange={uploadPhoto}
              multiple={false}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,image/heic,image/heif"
              className="hidden"
              onChange={uploadPhoto}
              multiple={false}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="btn-secondary flex items-center gap-2 flex-1 justify-center"
            >
              <Camera className="w-4 h-4" />
              {uploadingPhoto ? 'Enviando...' : 'Câmera'}
            </button>
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="btn-secondary flex items-center gap-2 flex-1 justify-center"
            >
              <span className="text-base leading-none">🖼️</span>
              {uploadingPhoto ? 'Enviando...' : 'Álbum'}
            </button>
          </div>

          {report.photos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma foto adicionada ainda</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {report.photos.map((photo) => (
                <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square">
                  <img src={photo.url} alt={photo.caption || 'Foto'} className="w-full h-full object-cover" />
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">{photo.caption}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WHATSAPP SEND */}
        {canSendWhatsApp && <div className="card bg-green-50 border-green-200">
          <h2 className="font-bold text-gray-800 mb-2 text-lg">📱 Enviar ao Tutor</h2>
          {report.dog && (
            <p className="text-sm text-gray-600 mb-3">
              Tutor: <strong>{report.dog.ownerName}</strong> · {report.dog.ownerPhone}
            </p>
          )}
          {report.sentToWhatsApp && (
            <div className="mb-3 flex items-center gap-2 text-sm text-green-700 bg-green-100 p-2 rounded-lg">
              <Check className="w-4 h-4" />
              Mensagem já enviada hoje via WhatsApp
            </div>
          )}
          <div className="space-y-2">
            {/* Share with photos — Web Share API */}
            {report.photos.length > 0 && (
              <button onClick={shareWithPhotos} disabled={sharingPhotos}
                className="btn-whatsapp w-full justify-center text-base py-3">
                <Camera className="w-5 h-5" />
                {sharingPhotos
                  ? `Carregando ${report.photos.length} foto(s)...`
                  : `Enviar com ${report.photos.length} foto(s) 📸`}
              </button>
            )}
            {/* Text-only via wa.me */}
            <button onClick={sendWhatsApp} className={`w-full justify-center text-base py-3 flex items-center gap-2 font-medium rounded-xl transition-colors ${report.photos.length > 0 ? 'btn-secondary' : 'btn-whatsapp'}`}>
              <Send className="w-5 h-5" />
              {report.sentToWhatsApp ? 'Reenviar (só texto)' : report.photos.length > 0 ? 'Enviar só o texto' : 'Enviar Relatório via WhatsApp'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {report.photos.length > 0
              ? '"Enviar com fotos" abre o seletor nativo do celular — selecione o WhatsApp'
              : 'Abre o WhatsApp com a mensagem formatada pronta para enviar'}
          </p>
        </div>}
      </fieldset>
    </div>
  )
}
