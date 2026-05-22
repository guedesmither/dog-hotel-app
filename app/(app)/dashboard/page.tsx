'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Dog, ClipboardList, CheckCircle2, Clock, AlertCircle, UserX, RefreshCw, CalendarCheck, ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react'
import { formatDate, getTodayString, MEAL_STATUS_COLORS, MOOD_EMOJIS } from '@/lib/utils'


interface ReplacementItem {
  id: string
  absentDate: string
  billingMonthEnd: string
  scheduledDate: string | null
  status: string
  dog: { id: string; name: string; photoUrl: string | null; scheduledDays: string | null; serviceType: string | null }
}

interface DogWithStay {
  id: string
  name: string
  breed: string
  photoUrl: string | null
  ownerName: string
  size: string | null
  serviceType: string | null
  scheduledDays: string | null
  stays: Array<{ room: string | null; checkIn: string; active: boolean }>
  reports: Array<{
    id: string
    absent: boolean
    breakfastStatus: string
    lunchStatus: string
    dinnerStatus: string
    mood: string | null
    activities: Array<{ participated: boolean }>
    author?: { name: string }
    lastEditedByName?: string | null
    updatedAt?: string
  }>
}

function MealDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-gray-300',
    ALL: 'bg-green-500',
    PARTIAL: 'bg-amber-400',
    REFUSED: 'bg-red-500',
  }
  return <span className={`w-2.5 h-2.5 rounded-full inline-block ${colors[status] || 'bg-gray-300'}`} title={status} />
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [dogs, setDogs] = useState<DogWithStay[]>([])
  const [rosterEntries, setRosterEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingAbsent, setTogglingAbsent] = useState<string | null>(null)
  const [replacements, setReplacements] = useState<ReplacementItem[]>([])
  const [schedulingId, setSchedulingId] = useState<string | null>(null)
  const [schedulingDate, setSchedulingDate] = useState<Record<string, string>>({})
  const realToday = getTodayString()
  const [selectedDate, setSelectedDate] = useState(realToday)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const today = selectedDate
  const isToday = selectedDate === realToday

  function shiftDate(days: number) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  async function toggleAbsent(dogId: string, currentAbsent: boolean) {
    setTogglingAbsent(dogId)
    try {
      // Single source of truth: roster presence
      // currentAbsent=true → undo absence → present:true | currentAbsent=false → mark absent → present:false
      await fetch('/api/roster/presence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId, date: today, present: currentAbsent }),
      })
      await loadDay()
      await loadReplacements()
    } finally {
      setTogglingAbsent(null)
    }
  }

  useEffect(() => {
    const u = session?.user as { role?: string; tutorDogId?: string } | undefined
    if (u?.role === 'TUTOR') {
      if (u.tutorDogId) router.replace(`/dogs/${u.tutorDogId}`)
      return
    }
  }, [session, router])

  useEffect(() => {
    fetch('/api/replacements?status=PENDING')
      .then(r => r.json()).then(setReplacements).catch(() => {})
    fetch('/api/replacements?status=SCHEDULED')
      .then(r => r.json()).then((d: ReplacementItem[]) => setReplacements(prev => [
        ...prev.filter(r => r.status !== 'SCHEDULED'), ...d
      ])).catch(() => {})
  }, [])

  async function loadReplacements() {
    const [p, s] = await Promise.all([
      fetch('/api/replacements?status=PENDING').then(r => r.json()),
      fetch('/api/replacements?status=SCHEDULED').then(r => r.json()),
    ])
    setReplacements([...p, ...s])
  }

  async function scheduleReplacement(id: string, date: string) {
    setSchedulingId(id)
    try {
      await fetch(`/api/replacements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: date }),
      })
      await loadReplacements()
      setSchedulingDate(prev => { const n = { ...prev }; delete n[id]; return n })
    } finally {
      setSchedulingId(null)
    }
  }

  async function markDone(id: string) {
    await fetch(`/api/replacements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    })
    await loadReplacements()
  }

  async function loadDay() {
    setLoading(true)
    try {
      const [dogsRes, rosterRes] = await Promise.all([
        fetch('/api/dogs?active=true'),
        fetch(`/api/roster?date=${today}`),
      ])
      const allDogs: DogWithStay[] = await dogsRes.json()
      const entries: any[] = await rosterRes.json()
      setRosterEntries(entries)
      const rosterIds = new Set(entries.map((e: any) => e.dogId || e.dog?.id))
      const todayDogs = allDogs.filter(d =>
        d.stays.some(s => s.active) || rosterIds.has(d.id)
      )
      setDogs(todayDogs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDay() }, [today])

  const hotelDogs = dogs.filter((d) => d.stays.some((s) => s.active))
  const crecheDogs = dogs.filter((d) => !d.stays.some((s) => s.active))
  const dogsWithReport = dogs.filter((d) => d.reports?.length > 0 && !d.reports[0].absent)
  const dogsWithoutReport = dogs.filter((d) => !d.reports?.length)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-bounce">🐾</div>
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => shiftDate(-1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setSelectedDate(realToday)}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium min-w-[110px] text-center border transition-colors ${
                isToday ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {formatDate(today)}
            </button>
            <button onClick={() => shiftDate(1)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
            {!isToday && (
              <button onClick={() => setSelectedDate(realToday)} className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium ml-1">
                Hoje
              </button>
            )}
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden ml-2">
            <button onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'cards' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              <LayoutGrid className="w-3.5 h-3.5" /> Cards
            </button>
            <button onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              <List className="w-3.5 h-3.5" /> Lista
            </button>
          </div>
        </div>
        <div className="flex gap-2 text-sm flex-wrap">
          {hotelDogs.length > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-medium">
              <Dog className="w-4 h-4" />
              {hotelDogs.length} hotel
            </span>
          )}
          {crecheDogs.length > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-medium">
              <Dog className="w-4 h-4" />
              {crecheDogs.length} creche
            </span>
          )}
        </div>
      </div>

      {dogs.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🐕</div>
          <h3 className="font-semibold text-gray-700 text-lg">Nenhum cão hospedado hoje</h3>
          <p className="text-gray-500 text-sm mt-1">Faça o check-in de um cão para começar.</p>
        </div>
      ) : (
        <>
          {dogsWithoutReport.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{dogsWithoutReport.length} {dogsWithoutReport.length === 1 ? 'cão' : 'cães'} ainda sem relatório hoje</span>
            </div>
          )}

          {viewMode === 'list' ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                    <th className="px-3 py-2 text-left">Cão</th>
                    <th className="px-3 py-2 text-left">Tutor</th>
                    <th className="px-3 py-2 text-center">Tipo</th>
                    <th className="px-3 py-2 text-center">Porte</th>
                    <th className="px-3 py-2 text-center">Presença</th>
                    <th className="px-3 py-2 text-center">Refeições</th>
                    <th className="px-3 py-2 text-center">Humor</th>
                    <th className="px-3 py-2 text-center">Atividades</th>
                    <th className="px-3 py-2 text-center">Monitor</th>
                    <th className="px-3 py-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dogs.map((dog) => {
                    const report = dog.reports?.[0]
                    const isAbsent = report?.absent === true
                    const rosterEntry = rosterEntries.find((e: any) => (e.dogId || e.dog?.id) === dog.id)
                    const entryType = rosterEntry?.type || (dog.stays.some(s => s.active) ? 'HOTEL' : 'CRECHE')
                    const present = rosterEntry?.present
                    return (
                      <tr key={dog.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                        isAbsent ? 'opacity-50 bg-gray-50' : ''
                      }`}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm shrink-0 overflow-hidden">
                              {dog.photoUrl ? <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover rounded-lg" /> : '🐶'}
                            </div>
                            <div>
                              <Link href={`/dogs/${dog.id}`} className="font-semibold text-gray-800 hover:underline">{dog.name}</Link>
                              <p className="text-xs text-gray-400">{dog.breed}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{dog.ownerName}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            entryType === 'HOTEL' ? 'bg-blue-100 text-blue-700'
                            : entryType === 'REPOSICAO' ? 'bg-purple-100 text-purple-700'
                            : entryType === 'AVULSO' ? 'bg-orange-100 text-orange-700'
                            : entryType === 'PACOTE' ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                          }`}>{entryType}</span>
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-gray-500">{dog.size || '—'}</td>
                        <td className="px-3 py-2 text-center">
                          {isAbsent
                            ? <span className="text-xs text-gray-400">🚫 Ausente</span>
                            : present === true
                              ? <span className="text-xs text-green-600 font-semibold">✓ Presente</span>
                              : present === false
                                ? <span className="text-xs text-red-500 font-semibold">✗ Faltou</span>
                                : <span className="text-xs text-gray-400">—</span>
                          }
                        </td>
                        <td className="px-3 py-2 text-center">
                          {report && !isAbsent ? (
                            <div className="flex gap-1 justify-center">
                              <MealDot status={report.breakfastStatus} />
                              <MealDot status={report.lunchStatus} />
                              <MealDot status={report.dinnerStatus} />
                            </div>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {report?.mood ? <span>{MOOD_EMOJIS[report.mood] || '😊'}</span> : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-gray-500">
                          {report?.activities?.length ? `${report.activities.filter(a => a.participated).length}/${report.activities.length}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {report?.author ? (
                            <div className="text-[10px] text-gray-500">
                              <span className="font-medium">{report.author.name}</span>
                              {report.lastEditedByName && report.lastEditedByName !== report.author.name && (
                                <div className="text-gray-400">✏️ {report.lastEditedByName}</div>
                              )}
                            </div>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            {!isAbsent && (
                              <Link href={`/dogs/${dog.id}/report`} className="text-xs bg-amber-600 hover:bg-amber-700 text-white py-1 px-2 rounded font-medium">📝</Link>
                            )}
                            <button
                              onClick={() => toggleAbsent(dog.id, isAbsent)}
                              disabled={togglingAbsent === dog.id}
                              className={`text-xs py-1 px-2 rounded font-medium ${
                                isAbsent ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {isAbsent ? '↩' : '🚫'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dogs.map((dog) => {
              const report = dog.reports?.[0]
              const hasReport = !!report
              const isAbsent = report?.absent === true
              const allMealsDone =
                hasReport &&
                !isAbsent &&
                report.breakfastStatus !== 'PENDING' &&
                report.lunchStatus !== 'PENDING' &&
                report.dinnerStatus !== 'PENDING'

              return (
                <div key={dog.id} className={`card hover:shadow-md transition-shadow ${isAbsent ? 'opacity-60 bg-gray-50' : ''}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                      {dog.photoUrl ? (
                        <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        '🐶'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{dog.name}</h3>
                        {isAbsent ? (
                          <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-medium">Ausente</span>
                        ) : allMealsDone ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">{dog.breed}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dog.stays.find(s => s.active)?.room && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            {dog.stays.find(s => s.active)!.room}
                          </span>
                        )}
                        {dog.serviceType && (
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                            {dog.serviceType}
                          </span>
                        )}
                        {dog.size && (
                          <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                            {dog.size}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isAbsent ? (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <UserX className="w-3.5 h-3.5" />
                      Marcado como ausente hoje
                    </p>
                  ) : hasReport ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Refeições</span>
                        <div className="flex gap-1.5">
                          <MealDot status={report.breakfastStatus} />
                          <MealDot status={report.lunchStatus} />
                          <MealDot status={report.dinnerStatus} />
                        </div>
                      </div>
                      {report.mood && (
                        <div className="text-xs text-gray-600">
                          Humor: {MOOD_EMOJIS[report.mood] || '😊'} {report.mood}
                        </div>
                      )}
                      {report.activities?.length > 0 && (
                        <div className="text-xs text-gray-600">
                          Atividades: {report.activities.filter((a) => a.participated).length}/{report.activities.length}
                        </div>
                      )}
                      {(report.author || report.lastEditedByName) && (
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                          {report.author && <span>📝 {report.author.name}</span>}
                          {report.lastEditedByName && (
                            <span>✏️ {report.lastEditedByName}
                              {report.updatedAt && <> {new Date(report.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <ClipboardList className="w-3.5 h-3.5" />
                      Relatório não iniciado
                    </p>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    {!isAbsent && (
                      <Link
                        href={`/dogs/${dog.id}/report`}
                        className="flex-1 text-center text-xs bg-amber-600 hover:bg-amber-700 text-white py-2 px-3 rounded-lg font-medium transition-colors"
                      >
                        📝 Relatório do Dia
                      </Link>
                    )}
                    <button
                      onClick={() => toggleAbsent(dog.id, isAbsent)}
                      disabled={togglingAbsent === dog.id}
                      className={`${isAbsent ? 'flex-1' : ''} text-xs py-2 px-3 rounded-lg font-medium transition-colors ${
                        isAbsent
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {isAbsent ? '↩ Desfazer ausência' : '🚫 Ausente'}
                    </button>
                    {!isAbsent && (
                      <Link
                        href={`/dogs/${dog.id}`}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg font-medium transition-colors"
                      >
                        Perfil
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          )}
        </>
      )}
      {/* REPLACEMENTS SECTION */}
      {replacements.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-orange-500" />
            Reposições Pendentes
          </h2>
          <div className="space-y-3">
            {replacements.map((r) => {
              const isExpired = r.billingMonthEnd < today && r.status !== 'DONE'
              const inputDate = schedulingDate[r.id] || ''
              return (
                <div key={r.id} className={`card flex flex-col sm:flex-row sm:items-center gap-3 ${
                  isExpired ? 'border-red-200 bg-red-50' : r.status === 'SCHEDULED' ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'
                }`}>
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shrink-0 overflow-hidden border border-gray-100">
                      {r.dog.photoUrl
                        ? <img src={r.dog.photoUrl} alt={r.dog.name} className="w-full h-full object-cover rounded-xl" />
                        : '🐶'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">
                        <Link href={`/dogs/${r.dog.id}`} className="hover:underline">{r.dog.name}</Link>
                      </p>
                      <p className="text-xs text-gray-500">
                        Ausente em {formatDate(r.absentDate)} · prazo até <span className={isExpired ? 'text-red-600 font-semibold' : 'text-gray-600'}>{formatDate(r.billingMonthEnd)}</span>
                      </p>
                      {r.status === 'SCHEDULED' && r.scheduledDate && (
                        <p className="text-xs text-green-700 flex items-center gap-1 mt-0.5">
                          <CalendarCheck className="w-3 h-3" /> Agendada para {formatDate(r.scheduledDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status !== 'SCHEDULED' ? (
                      <>
                        <input
                          type="date"
                          value={inputDate}
                          min={today}
                          max={r.billingMonthEnd}
                          onChange={(e) => setSchedulingDate(prev => ({ ...prev, [r.id]: e.target.value }))}
                          className="input text-xs py-1 px-2 w-36"
                        />
                        <button
                          onClick={() => scheduleReplacement(r.id, inputDate)}
                          disabled={!inputDate || schedulingId === r.id}
                          className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40"
                        >
                          Agendar
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => markDone(r.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700"
                      >
                        ✓ Realizada
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
