'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Send, Sparkles, Dog as DogIcon, Check, Loader2, Calendar, AlertCircle, Edit3, X, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

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

const MOOD_LABELS: Record<string, string> = {
  HAPPY: 'Feliz',
  CALM: 'Tranquilo',
  ANXIOUS: 'Ansioso',
  TIRED: 'Cansado',
  PLAYFUL: 'Brincalhão',
  SHY: 'Tímido',
}

const MEAL_LABELS: Record<string, string> = {
  EATEN: 'Comeu',
  PARTIAL: 'Parcial',
  REFUSED: 'Recusou',
  PENDING: 'Pendente',
}

export default function DailySummaryPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [summaries, setSummaries] = useState<DogSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [photoData, setPhotoData] = useState<Record<string, string>>({}) // dogId -> base64 image
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const loadSummaries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/whatsapp/daily-summary?date=${date}`)
      if (res.ok) {
        const data = await res.json()
        setSummaries(data.summaries || [])
      } else {
        const err = await res.json()
        setError(err.error || 'Erro ao carregar')
      }
    } catch {
      setError('Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    loadSummaries()
  }, [loadSummaries])

  async function generateDrafts() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/whatsapp/daily-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      if (res.ok) {
        await loadSummaries()
      } else {
        const err = await res.json()
        setError(err.error || 'Erro ao gerar rascunhos')
      }
    } catch {
      setError('Erro ao gerar rascunhos')
    } finally {
      setGenerating(false)
    }
  }

  async function saveDraft(dogId: string) {
    try {
      await fetch('/api/whatsapp/daily-summary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, dogId, message: editText }),
      })
      setEditingId(null)
      await loadSummaries()
    } catch {
      alert('Erro ao salvar rascunho')
    }
  }

  async function sendDraft(summary: DogSummary) {
    if (!summary.draftMessage) return
    setSendingId(summary.dogId)
    try {
      const res = await fetch('/api/whatsapp/daily-summary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          dogId: summary.dogId,
          reportId: summary.reportId,
          image: photoData[summary.dogId] || undefined,
        }),
      })
      if (res.ok) {
        setPhotoData(prev => { const next = { ...prev }; delete next[summary.dogId]; return next })
        await loadSummaries()
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao enviar')
      }
    } catch {
      alert('Erro ao enviar')
    } finally {
      setSendingId(null)
    }
  }

  function handlePhotoSelect(dogId: string, file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Imagem muito grande (máx 5MB)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setPhotoData(prev => ({ ...prev, [dogId]: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  function removePhoto(dogId: string) {
    setPhotoData(prev => { const next = { ...prev }; delete next[dogId]; return next })
  }

  function startEdit(summary: DogSummary) {
    setEditingId(summary.dogId)
    setEditText(summary.draftMessage || '')
  }

  const sentCount = summaries.filter(s => s.sent).length
  const pendingCount = summaries.filter(s => !s.sent && s.draftMessage).length
  const noDraftCount = summaries.filter(s => !s.draftMessage).length

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] md:h-[calc(100vh-2rem)] gap-3">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-green-600" />
          <div>
            <h1 className="font-bold text-gray-800">Resumo Diário</h1>
            <p className="text-xs text-gray-500">Rascunhos de mensagens para os tutores</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={generateDrafts}
            disabled={generating || summaries.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? 'Gerando...' : 'Gerar rascunhos'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {summaries.length > 0 && (
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-sm">
            <DogIcon className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-700">{summaries.length} cães</span>
          </div>
          {sentCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200 text-sm text-green-700">
              <Check className="w-4 h-4" />
              <span>{sentCount} enviadas</span>
            </div>
          )}
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-700">
              <Send className="w-4 h-4" />
              <span>{pendingCount} prontas</span>
            </div>
          )}
          {noDraftCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
              <Sparkles className="w-4 h-4" />
              <span>{noDraftCount} sem rascunho</span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : summaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <DogIcon className="w-12 h-12 opacity-30" />
            <p className="text-sm">Nenhum relatório encontrado para {date}.</p>
            <p className="text-xs">Os relatórios do dia aparecerão aqui para gerar as mensagens.</p>
          </div>
        ) : (
          summaries.map(summary => (
            <div
              key={summary.dogId}
              className={cn(
                'bg-white rounded-xl shadow-sm border overflow-hidden',
                summary.sent ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
              )}
            >
              {/* Dog header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <DogIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{summary.dogName}</h3>
                    <p className="text-xs text-gray-500">
                      {summary.breed} · Tutor: {summary.ownerName} · {summary.ownerPhone}
                    </p>
                  </div>
                </div>
                {summary.sent && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check className="w-4 h-4" />
                    Enviada
                  </span>
                )}
              </div>

              {/* Report info */}
              <div className="px-4 py-2 bg-gray-50/50 text-xs text-gray-600 space-y-1">
                {summary.absent ? (
                  <p className="text-amber-600 font-medium">Cão ausente hoje</p>
                ) : (
                  <>
                    {summary.mood && (
                      <p>Humor: <span className="font-medium">{MOOD_LABELS[summary.mood] || summary.mood}</span></p>
                    )}
                    {summary.activities.filter(a => a.participated).length > 0 && (
                      <p>Atividades: {summary.activities.filter(a => a.participated).map(a => a.name).join(', ')}</p>
                    )}
                    {summary.hasMedication && (
                      <p>Medicação: {summary.medicationGiven ? 'aplicada' : 'não aplicada'}{summary.medicationNotes ? ` - ${summary.medicationNotes}` : ''}</p>
                    )}
                    {summary.generalNotes && (
                      <p>Observações: {summary.generalNotes}</p>
                    )}
                  </>
                )}
              </div>

              {/* Draft message */}
              <div className="px-4 py-3">
                {editingId === summary.dogId ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveDraft(summary.dogId)}
                        className="px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : summary.draftMessage ? (
                  <div className="space-y-2">
                    <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
                      {summary.draftMessage}
                    </div>

                    {/* Photo preview */}
                    {photoData[summary.dogId] && (
                      <div className="relative inline-block">
                        <img
                          src={photoData[summary.dogId]}
                          alt="Preview"
                          className="max-h-32 rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => removePhoto(summary.dogId)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {!summary.sent && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => sendDraft(summary)}
                          disabled={sendingId === summary.dogId}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {sendingId === summary.dogId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          {photoData[summary.dogId] ? 'Enviar com foto' : 'Enviar'}
                        </button>
                        <button
                          onClick={() => startEdit(summary)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => fileInputRefs.current[summary.dogId]?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          {photoData[summary.dogId] ? 'Trocar foto' : 'Anexar foto'}
                        </button>
                        <input
                          ref={el => { fileInputRefs.current[summary.dogId] = el }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) handlePhotoSelect(summary.dogId, file)
                            e.target.value = ''
                          }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    Sem rascunho. Clique em "Gerar rascunhos" para criar.
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
