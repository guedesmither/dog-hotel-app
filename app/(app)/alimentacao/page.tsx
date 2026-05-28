'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Eye, RefreshCw, CheckCircle2, Clock, PlusCircle, Search, X, Plus, Trash2, Pill, MessageSquare, Smile } from 'lucide-react'
import { getTodayString, MEAL_STATUS_LABELS, MEAL_STATUS_COLORS } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const MEAL_STATUSES = ['PENDING', 'ALL', 'PARTIAL', 'REFUSED']

const MEAL_STATUS_SHORT: Record<string, string> = {
  PENDING: 'Pendente',
  ALL: 'Comeu tudo',
  PARTIAL: 'Parcial',
  REFUSED: 'Recusou',
}

interface ActivityItem {
  id: string
  name: string
  participated: boolean
  notes: string | null
}

interface DogReport {
  id: string
  breakfastStatus: string
  breakfastQty: string | null
  lunchStatus: string
  lunchQty: string | null
  afternoonSnackStatus: string
  afternoonSnackQty: string | null
  dinnerStatus: string
  dinnerQty: string | null
  mood: string | null
  generalNotes: string | null
  hasMedication: boolean
  medicationGiven: boolean | null
  medicationNotes: string | null
  activities: ActivityItem[]
  author?: { name: string }
  lastEditedByName?: string | null
  updatedAt?: string
}

interface DogItem {
  id: string
  name: string
  breed: string
  photoUrl: string | null
  feedingType: string | null
  feedingInstructions: string | null
  feedingTimesPerDay: string | null
  feedingGramsPerMeal: string | null
  medications: string | null
  allergies: string | null
  notes: string | null
  vetName: string | null
  vetPhone: string | null
  report: DogReport | null
  loadingReport: boolean
}

export default function AlimentacaoPage() {
  const [dogs, setDogs] = useState<DogItem[]>([])
  const [allDogs, setAllDogs] = useState<DogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const addRef = useRef<HTMLDivElement>(null)

  const todayLabel = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })
  const today = getTodayString()

  const loadDogs = useCallback(async () => {
    setLoading(true)
    try {
      const [dogsRes, rosterRes] = await Promise.all([
        fetch('/api/dogs?active=true'),
        fetch(`/api/roster?date=${today}`),
      ])
      const allRaw: (DogItem & { reports?: DogReport[] })[] = await dogsRes.json()
      const rosterEntries: Array<{ dog: { id: string }; present: boolean | null }> = await rosterRes.json()

      // Only dogs in the roster AND not absent (present !== false)
      const presentIds = new Set(
        rosterEntries.filter(e => e.present !== false).map(e => e.dog.id)
      )

      const mapped = allRaw
        .filter(d => presentIds.has(d.id))
        .map(d => ({
          ...d,
          report: d.reports?.[0] ?? null,
          loadingReport: false,
        }))

      setAllDogs(allRaw.map(d => ({ ...d, report: d.reports?.[0] ?? null, loadingReport: false })))
      setDogs(mapped)

      // Auto-create report for present dogs without one
      mapped.forEach(async (dog) => {
        if (!dog.report) {
          setDogs((prev) => prev.map((d) => d.id === dog.id ? { ...d, loadingReport: true } : d))
          const r = await fetch(`/api/dogs/${dog.id}/reports?date=${today}`)
          const report = await r.json()
          setDogs((prev) => prev.map((d) => d.id === dog.id ? { ...d, report, loadingReport: false } : d))
        }
      })
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => { loadDogs() }, [loadDogs])

  async function addDog(dog: DogItem) {
    if (dogs.find((d) => d.id === dog.id)) return
    const entry = { ...dog, loadingReport: true }
    setDogs((prev) => [...prev, entry])
    setShowAdd(false)
    setSearch('')
    const r = await fetch(`/api/dogs/${dog.id}/reports?date=${today}`)
    const report = await r.json()
    setDogs((prev) => prev.map((d) => d.id === dog.id ? { ...d, report, loadingReport: false } : d))
  }

  async function updateMeal(dog: DogItem, field: string, value: string) {
    if (!dog.report) return
    let parsedValue: any = value
    if (field === 'hasMedication') parsedValue = value === 'true'
    else if (field === 'medicationGiven') parsedValue = value === 'true' ? true : null
    const updated = { ...dog.report, [field]: parsedValue }
    setDogs((prev) => prev.map((d) => d.id === dog.id ? { ...d, report: updated } : d))
    setSavingId(dog.id)
    try {
      await fetch(`/api/reports/${dog.report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
    } finally {
      setSavingId(null)
    }
  }

  const availableToAdd = allDogs.filter((d) => !dogs.find((p) => p.id === d.id))
  const filteredAvailable = availableToAdd.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.breed.toLowerCase().includes(search.toLowerCase())
  )
  const presentCount = dogs.length
  const pendingCount = dogs.filter(
    (d) => d.report?.breakfastStatus === 'PENDING' || d.report?.lunchStatus === 'PENDING' || d.report?.dinnerStatus === 'PENDING'
  ).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-4xl animate-bounce">🍽️</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="w-6 h-6 text-amber-600" />
            Monitoria do Dia
          </h1>
          <p className="text-sm text-gray-500 capitalize mt-0.5">{todayLabel}</p>
        </div>
        <button onClick={loadDogs} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div ref={addRef} className="relative">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="card w-full flex items-center gap-3 hover:border-amber-300 hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl">🐕</div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-gray-900">{presentCount}</p>
              <p className="text-xs text-gray-500">Cães presentes</p>
            </div>
            <PlusCircle className="w-5 h-5 text-amber-500 shrink-0" />
          </button>

          {/* Dropdown de seleção */}
          {showAdd && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-amber-100 z-50 overflow-hidden">
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-700 flex-1">Adicionar cão ao dia</p>
                  <button onClick={() => { setShowAdd(false); setSearch('') }} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="Buscar cão..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {filteredAvailable.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhum cão disponível</p>
                ) : (
                  filteredAvailable.map((dog) => (
                    <button
                      key={dog.id}
                      onClick={() => addDog(dog)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center text-sm font-bold text-amber-700 shrink-0">
                        {dog.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{dog.name}</p>
                        <p className="text-xs text-gray-500">{dog.breed}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            <p className="text-xs text-gray-500">Refeições pendentes</p>
          </div>
        </div>
      </div>

      {dogs.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-3">🍽️</div>
          <p className="text-gray-600 font-medium">Nenhum cão presente hoje</p>
          <p className="text-gray-400 text-sm mt-1">Clique em <strong>Cães presentes</strong> para adicionar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dogs.map((dog) => (
            <DogMonitoringCard
              key={dog.id}
              dog={dog}
              saving={savingId === dog.id}
              onUpdate={(field, value) => updateMeal(dog, field, value)}
              onReload={loadDogs}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const MOODS = [
  { value: 'FELIZ', emoji: '😄', label: 'Feliz' },
  { value: 'CALMO', emoji: '😌', label: 'Calmo' },
  { value: 'AGITADO', emoji: '🤪', label: 'Agitado' },
  { value: 'ANSIOSO', emoji: '😟', label: 'Ansioso' },
  { value: 'APATICO', emoji: '😔', label: 'Apático' },
  { value: 'AGRESSIVO', emoji: '😡', label: 'Agressivo' },
]

const DEFAULT_ACTIVITIES = [
  'Bolinha',
  'Piscina',
  'Corrida',
  'Enriquecimento ambiental',
  'Adestramento comportamental',
  'Musicoterapia',
  'Circuito',
]

function DogMonitoringCard({
  dog,
  saving,
  onUpdate,
  onReload,
}: {
  dog: DogItem
  saving: boolean
  onUpdate: (field: string, value: string) => void
  onReload: () => void
}) {
  const [newActivity, setNewActivity] = useState('')
  const [addingActivity, setAddingActivity] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>('meals')

  const allDone =
    dog.report?.breakfastStatus !== 'PENDING' &&
    dog.report?.lunchStatus !== 'PENDING' &&
    dog.report?.dinnerStatus !== 'PENDING'

  async function addActivity(name: string) {
    if (!dog.report || !name.trim()) return
    setAddingActivity(true)
    try {
      await fetch(`/api/reports/${dog.report.id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), participated: true }),
      })
      setNewActivity('')
      onReload()
    } finally {
      setAddingActivity(false)
    }
  }

  async function toggleActivity(act: ActivityItem) {
    if (!dog.report) return
    await fetch(`/api/reports/${dog.report.id}/activities`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: act.id, name: act.name, participated: !act.participated, notes: act.notes }),
    })
    onReload()
  }

  async function deleteActivity(actId: string) {
    if (!dog.report) return
    await fetch(`/api/reports/${dog.report.id}/activities?activityId=${actId}`, { method: 'DELETE' })
    onReload()
  }

  const toggle = (section: string) => setOpenSection(prev => prev === section ? null : section)

  const activitiesCount = dog.report?.activities?.length ?? 0
  const participatedCount = dog.report?.activities?.filter(a => a.participated).length ?? 0

  return (
    <div className={`card border-2 transition-colors ${allDone ? 'border-green-200 bg-green-50/30' : 'border-amber-100'}`}>
      {/* Cabeçalho do cão */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center text-xl font-bold text-amber-700">
            {dog.photoUrl ? (
              <img src={dog.photoUrl} className="w-10 h-10 rounded-full object-cover" alt={dog.name} />
            ) : (
              dog.name[0].toUpperCase()
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{dog.name}</h3>
            <p className="text-xs text-gray-500">{dog.breed}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-gray-400 animate-pulse">Salvando...</span>}
          {dog.report?.mood && <span className="text-lg" title={dog.report.mood}>{MOODS.find(m => m.value === dog.report!.mood)?.emoji || '😊'}</span>}
          {activitiesCount > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{participatedCount}/{activitiesCount}</span>}
          {dog.report?.hasMedication && <span className="text-xs" title="Tem medicação">💊</span>}
          {allDone && !saving && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle2 className="w-4 h-4" /> 
            </span>
          )}
        </div>
      </div>

      {/* Identificação de quem preencheu / editou */}
      {dog.report && (dog.report.author || dog.report.lastEditedByName) && (
        <div className="flex items-center gap-3 mb-2 text-[10px] text-gray-400">
          {dog.report.author && (
            <span>📝 Criado por <span className="font-semibold text-gray-500">{dog.report.author.name}</span></span>
          )}
          {dog.report.lastEditedByName && (
            <span>✏️ Editado por <span className="font-semibold text-gray-500">{dog.report.lastEditedByName}</span>
              {dog.report.updatedAt && (
                <> às {new Date(dog.report.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
              )}
            </span>
          )}
        </div>
      )}

      {/* Instruções da ficha - Ficha Técnica */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 mb-3 border border-amber-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-amber-800">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="text-xs font-bold uppercase tracking-wide">Ficha Técnica</span>
          </div>
          <a href={`/dogs/${dog.id}`} className="text-[10px] text-amber-600 hover:underline">
            Ver ficha completa →
          </a>
        </div>
        
        {(dog.feedingType || dog.feedingInstructions || dog.allergies || dog.medications || dog.notes || dog.vetName || dog.feedingTimesPerDay || dog.feedingGramsPerMeal) ? (
          <div className="space-y-1.5 text-xs">
            {/* Alimentação */}
            {dog.feedingType && (
              <div className="flex items-start gap-2">
                <span className="text-gray-500 shrink-0 w-16">🍖 Tipo:</span>
                <span className="font-medium text-gray-700">{dog.feedingType}</span>
              </div>
            )}
            {dog.feedingTimesPerDay && (
              <div className="flex items-start gap-2">
                <span className="text-gray-500 shrink-0 w-16">⏰ Vezes:</span>
                <span className="font-medium text-gray-700">{dog.feedingTimesPerDay}x ao dia</span>
              </div>
            )}
            {dog.feedingGramsPerMeal && (
              <div className="flex items-start gap-2">
                <span className="text-gray-500 shrink-0 w-16">⚖️ Qtd:</span>
                <span className="font-medium text-gray-700">{dog.feedingGramsPerMeal} por refeição</span>
              </div>
            )}
            {dog.feedingInstructions && (
              <div className="flex items-start gap-2">
                <span className="text-gray-500 shrink-0 w-16">📝 Obs:</span>
                <span className="font-medium text-gray-700">{dog.feedingInstructions}</span>
              </div>
            )}
            
            {/* Medicação */}
            {dog.medications ? (
              <div className="flex items-start gap-2 bg-blue-50 p-1.5 rounded border border-blue-100">
                <span className="text-blue-600 shrink-0 w-16 font-semibold">💊 Meds:</span>
                <span className="font-medium text-blue-800">{dog.medications}</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-gray-400">
                <span className="shrink-0 w-16">💊 Meds:</span>
                <span>Sem medicação cadastrada</span>
              </div>
            )}
            
            {/* Alergias - Alerta */}
            {dog.allergies ? (
              <div className="flex items-start gap-2 bg-red-50 p-1.5 rounded border border-red-100">
                <span className="text-red-600 shrink-0 w-16 font-semibold">⚠️ Alergia:</span>
                <span className="font-medium text-red-700">{dog.allergies}</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-gray-400">
                <span className="shrink-0 w-16">⚠️ Alergia:</span>
                <span>Sem alergias cadastradas</span>
              </div>
            )}
            
            {/* Observações gerais */}
            {dog.notes && (
              <div className="flex items-start gap-2">
                <span className="text-gray-500 shrink-0 w-16">📋 Geral:</span>
                <span className="font-medium text-gray-700">{dog.notes}</span>
              </div>
            )}
            
            {/* Veterinário */}
            {dog.vetName && (
              <div className="flex items-start gap-2 mt-2 pt-2 border-t border-amber-200/50">
                <span className="text-gray-500 shrink-0 w-16">👨‍⚕️ Vet:</span>
                <div className="flex-1">
                  <span className="font-medium text-gray-700">{dog.vetName}</span>
                  {dog.vetPhone && (
                    <a href={`tel:${dog.vetPhone}`} className="block text-amber-600 hover:underline mt-0.5">
                      📞 {dog.vetPhone}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            Nenhuma informação de alimentação, medicação ou alergia cadastrada nesta ficha.
            <br />
            <a href={`/dogs/${dog.id}/edit`} className="text-amber-600 hover:underline">Cadastrar informações →</a>
          </p>
        )}
      </div>

      {dog.loadingReport ? (
        <p className="text-xs text-gray-400 animate-pulse text-center py-2">Carregando...</p>
      ) : dog.report ? (
        <div className="space-y-1">
          {/* SECTION: Refeições */}
          <button onClick={() => toggle('meals')} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">🍽️ Refeições</span>
            <span className="text-xs text-gray-400">{openSection === 'meals' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'meals' && (
            <div className="space-y-3 px-2 pb-2">
              {([
                { label: '🌅 Café da Manhã', statusKey: 'breakfastStatus', qtyKey: 'breakfastQty' },
                { label: '🌤️ Almoço', statusKey: 'lunchStatus', qtyKey: 'lunchQty' },
                { label: '🍪 Lanche da Tarde', statusKey: 'afternoonSnackStatus', qtyKey: 'afternoonSnackQty' },
                { label: '🌙 Janta', statusKey: 'dinnerStatus', qtyKey: 'dinnerQty' },
              ] as const).map(({ label, statusKey, qtyKey }) => (
                <div key={statusKey} className="bg-gray-50 rounded-lg p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">{label}</span>
                    <input type="text" className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 text-center"
                      placeholder="Qtd" value={dog.report![qtyKey] ?? ''}
                      onChange={(e) => onUpdate(qtyKey, e.target.value)}
                      onBlur={(e) => onUpdate(qtyKey, e.target.value)} />
                  </div>
                  <div className="flex gap-1.5">
                    {MEAL_STATUSES.map((s) => {
                      const currentVal = (dog.report![statusKey] ?? 'PENDING') as string
                      return (
                        <button key={s} onClick={() => onUpdate(statusKey, s)}
                          className={`flex-1 text-xs px-2 py-1.5 rounded-lg border font-medium transition-all ${
                            currentVal === s
                              ? MEAL_STATUS_COLORS[s] + ' border-transparent shadow-sm'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}>
                          {MEAL_STATUS_SHORT[s]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SECTION: Atividades */}
          <button onClick={() => toggle('activities')} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">🎾 Atividades {activitiesCount > 0 && <span className="text-gray-400 font-normal">({participatedCount}/{activitiesCount})</span>}</span>
            <span className="text-xs text-gray-400">{openSection === 'activities' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'activities' && (
            <div className="px-2 pb-2 space-y-3">
              {/* Quick select grid - ACTIVITIES AS BUTTONS */}
              <div className="grid grid-cols-2 gap-1.5">
                {DEFAULT_ACTIVITIES.map(a => {
                  const isAdded = dog.report!.activities?.some(act => act.name === a)
                  const act = dog.report!.activities?.find(act => act.name === a)
                  const participated = act?.participated
                  return (
                    <button
                      key={a}
                      onClick={() => isAdded ? toggleActivity(act!) : addActivity(a)}
                      className={`text-xs px-2 py-2 rounded-lg border-2 transition-all flex items-center gap-1.5 ${
                        participated
                          ? 'bg-green-100 border-green-400 text-green-700'
                          : isAdded
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {participated ? '✅' : isAdded ? '⏳' : '+'}
                      <span className="font-medium truncate">{a}</span>
                    </button>
                  )
                })}
              </div>
              
              {/* Legend */}
              <div className="flex gap-3 text-[10px] text-gray-500 justify-center">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-green-100 border border-green-400"></span>Participou</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-50 border border-amber-200"></span>Na lista</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-white border border-gray-200"></span>Não adicionado</span>
              </div>
              
              {/* Custom activity input */}
              <div className="flex items-center gap-1 pt-1 border-t border-gray-100">
                <input type="text" placeholder="+ Outra atividade..." value={newActivity}
                  onChange={e => setNewActivity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addActivity(newActivity)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                <button onClick={() => addActivity(newActivity)} disabled={!newActivity.trim() || addingActivity}
                  className="text-xs bg-blue-500 text-white px-2 py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-40">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* SECTION: Humor */}
          <button onClick={() => toggle('mood')} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5" /> Humor
              {dog.report!.mood && <span className="font-normal text-gray-400">({MOODS.find(m => m.value === dog.report!.mood)?.label || dog.report!.mood})</span>}
            </span>
            <span className="text-xs text-gray-400">{openSection === 'mood' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'mood' && (
            <div className="px-2 pb-3">
              <div className="grid grid-cols-2 gap-2">
                {MOODS.map(m => (
                  <button key={m.value} onClick={() => onUpdate('mood', dog.report!.mood === m.value ? '' : m.value)}
                    className={`text-xs px-3 py-2.5 rounded-lg border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                      dog.report!.mood === m.value
                        ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                    }`}>
                    <span className="text-lg">{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: Medicação */}
          <button onClick={() => toggle('medication')} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5" /> Medicação
              {dog.report!.hasMedication && <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>}
            </span>
            <span className="text-xs text-gray-400">{openSection === 'medication' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'medication' && (
            <div className="px-2 pb-3 space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdate('hasMedication', dog.report!.hasMedication ? '' : 'true')}
                  className={`flex-1 py-2.5 px-3 rounded-lg border-2 text-xs font-medium transition-all ${
                    dog.report!.hasMedication
                      ? 'bg-amber-100 border-amber-400 text-amber-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
                  }`}
                >
                  {dog.report!.hasMedication ? '💊 Com medicação' : '💊 Sem medicação'}
                </button>
                {dog.report!.hasMedication && (
                  <button
                    onClick={() => onUpdate('medicationGiven', dog.report!.medicationGiven ? '' : 'true')}
                    className={`flex-1 py-2.5 px-3 rounded-lg border-2 text-xs font-medium transition-all ${
                      dog.report!.medicationGiven
                        ? 'bg-green-100 border-green-400 text-green-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-green-300'
                    }`}
                  >
                    {dog.report!.medicationGiven ? '✅ Ministrada' : '⏳ Pendente'}
                  </button>
                )}
              </div>
              {dog.report!.hasMedication && (
                <textarea placeholder="Detalhes da medicação (horário, dosagem, etc)..."
                  value={dog.report!.medicationNotes ?? ''}
                  onChange={e => onUpdate('medicationNotes', e.target.value)}
                  onBlur={e => onUpdate('medicationNotes', e.target.value)}
                  rows={3}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none" />
              )}
            </div>
          )}

          {/* SECTION: Observações Gerais */}
          <button onClick={() => toggle('notes')} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Observações do Dia
              {dog.report!.generalNotes && <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>}
            </span>
            <span className="text-xs text-gray-400">{openSection === 'notes' ? '▲' : '▼'}</span>
          </button>
          {openSection === 'notes' && (
            <div className="px-2 pb-3">
              <textarea 
                placeholder="Descreva como foi o dia do cão: comportamento, interação com outros cães, energia, sono, etc..."
                value={dog.report!.generalNotes ?? ''}
                onChange={e => onUpdate('generalNotes', e.target.value)}
                onBlur={e => onUpdate('generalNotes', e.target.value)}
                rows={4}
                className="w-full text-sm border-2 border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none" 
              />
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-2">Sem relatório para hoje</p>
      )}
    </div>
  )
}
