'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X, Plus, GripVertical, Check, UserX, List, CalendarDays, RotateCcw } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

interface RosterDog {
  id: string
  name: string
  breed: string
  ownerName: string
  photoUrl: string | null
  serviceType: string | null
  scheduledDays: string | null
  dogStatus: string | null
}

interface RosterEntry {
  id: string
  dogId: string
  date: string
  source: string
  type: string
  present: boolean | null
  isPernoite: boolean
  hasBanho: boolean
  packageId: string | null
  dog: RosterDog
}

interface WeekData {
  entries: RosterEntry[]
  allDogs: RosterDog[]
  dates: string[]
}

function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(12, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function fmtShort(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function AgendaPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [data, setData] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dragDogId, setDragDogId] = useState<string | null>(null)
  const [dragFromDate, setDragFromDate] = useState<string | null>(null)
  const [droppingDate, setDroppingDate] = useState<string | null>(null)
  const [addingToDate, setAddingToDate] = useState<string | null>(null)
  const [pendingAddDog, setPendingAddDog] = useState<{ dogId: string; date: string } | null>(null)
  const [togglingPresence, setTogglingPresence] = useState<string | null>(null)
  const [changingTypeId, setChangingTypeId] = useState<string | null>(null)
  const [resettingDay, setResettingDay] = useState<string | null>(null)
  const [error, setError] = useState<{ message: string; details?: string } | null>(null)
  const [showError, setShowError] = useState(false)
  const [dogPackages, setDogPackages] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'week' | 'dog'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'dog' : 'week'
  )
  const [selectedDogId, setSelectedDogId] = useState<string>('')
  const [dogTimeline, setDogTimeline] = useState<any[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [showWeekPicker, setShowWeekPicker] = useState(false)
  const [dogSearch, setDogSearch] = useState('')
  const [showDogSearch, setShowDogSearch] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [addSearch, setAddSearch] = useState('')
  const [suggestedDogSales, setSuggestedDogSales] = useState<Map<string, string[]>>(new Map())

  const weekStartStr = toDateStr(weekStart)

  // Generate all Mondays of current year for the week picker
  const weekOptions = (() => {
    const year = weekStart.getFullYear()
    const weeks: { monday: Date; weekNum: number }[] = []
    const jan1 = new Date(year, 0, 1)
    // Find first Monday of or before Jan 1
    const firstMonday = getMonday(jan1)
    const cur = new Date(firstMonday)
    while (cur.getFullYear() <= year) {
      if (cur.getFullYear() === year || cur.getFullYear() === year - 1) {
        weeks.push({ monday: new Date(cur), weekNum: getWeekNumber(cur) })
      }
      cur.setDate(cur.getDate() + 7)
      if (cur.getFullYear() > year) break
    }
    return weeks
  })()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/roster?weekStart=${weekStartStr}`)
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [weekStartStr])

  const reload = useCallback(async () => {
    try {
      const res = await fetch(`/api/roster?weekStart=${weekStartStr}`)
      const json = await res.json()
      setData(json)
    } catch (e) { /* silent */ }
  }, [weekStartStr])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!showWeekPicker) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-week-picker]')) setShowWeekPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showWeekPicker])

  useEffect(() => {
    if (!showDogSearch) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dog-search]')) setShowDogSearch(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDogSearch])

  async function addDog(dogId: string, date: string, type: string, packageId?: string) {
    try {
      const res = await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId, date, type, packageId }),
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        setError({ message: errorData.error || 'Erro ao adicionar cão à agenda', details: errorData.reason || errorData.details })
        setShowError(true)
        setPendingAddDog(null)
        setAddingToDate(null)
        setDogPackages(null)
        return
      }
      
      setError(null)
      setShowError(false)
      setPendingAddDog(null)
      setAddingToDate(null)
      setDogPackages(null)
      await reload()
    } catch (err) {
      setError({ message: 'Erro ao adicionar cão à agenda', details: err instanceof Error ? err.message : String(err) })
      setShowError(true)
      setPendingAddDog(null)
      setAddingToDate(null)
      setDogPackages(null)
    }
  }

  async function loadDogTimeline(dogId: string) {
    if (!dogId) return
    setLoadingTimeline(true)
    try {
      const res = await fetch(`/api/roster/dog-timeline?dogId=${dogId}`)
      if (res.ok) setDogTimeline(await res.json())
    } finally {
      setLoadingTimeline(false)
    }
  }

  useEffect(() => {
    if (viewMode === 'dog' && selectedDogId) loadDogTimeline(selectedDogId)
  }, [viewMode, selectedDogId])

  async function loadSuggestedDogs(date: string) {
    try {
      // Fetch all active sales (not cancelled, not manually completed)
      // Use broad date range to catch sales whose validity covers the target date
      const res = await fetch(`/api/sales?startDate=2000-01-01&endDate=2099-12-31`)
      if (!res.ok) return
      const sales: Array<{ dogId: string | null; saleType: string; paymentStatus: string; manualBaixa: boolean; startDate: string | null; endDate: string | null; saleDate: string | null }> = await res.json()

      const target = new Date(date + 'T12:00:00')
        target.setHours(0, 0, 0, 0)

      const map = new Map<string, string[]>()
      for (const s of sales) {
        if (!s.dogId) continue
        if (s.paymentStatus === 'CANCELADO') continue
        if (s.manualBaixa) continue

        // Check if sale validity covers the target date
        const start = s.startDate ? new Date(s.startDate) : s.saleDate ? new Date(s.saleDate) : null
        if (!start) continue
        start.setHours(0, 0, 0, 0)

        if (target < start) continue

        if (s.endDate) {
          const end = new Date(s.endDate)
          end.setHours(23, 59, 59, 999)
          if (target > end) continue
        } else {
          // No explicit endDate:
          // MENSAL: valid indefinitely from start
          if (s.saleType === 'MENSAL') {
            // ok, no end check
          } else if (s.saleType === 'HOTEL') {
            const end = new Date(start)
            end.setDate(end.getDate() + 30)
            end.setHours(23, 59, 59, 999)
            if (target > end) continue
          } else if (s.saleType === 'AVULSO') {
            const end = new Date(start)
            end.setDate(end.getDate() + 30)
            end.setHours(23, 59, 59, 999)
            if (target > end) continue
          } else if (s.saleType === 'PACOTE') {
            const end = new Date(start)
            end.setMonth(end.getMonth() + 6)
            end.setHours(23, 59, 59, 999)
            if (target > end) continue
          }
        }

        const existing = map.get(s.dogId) ?? []
        if (!existing.includes(s.saleType)) existing.push(s.saleType)
        map.set(s.dogId, existing)
      }
      setSuggestedDogSales(map)
    } catch { /* silent */ }
  }

  async function loadDogPackages(dogId: string) {
    try {
      const res = await fetch(`/api/packages?dogId=${dogId}`)
      if (res.ok) {
        const packages = await res.json()
        setDogPackages(packages)
      } else {
        setDogPackages([])
      }
    } catch (err) {
      setDogPackages([])
    }
  }

  async function removeDog(dogId: string, date: string) {
    await fetch(`/api/roster?dogId=${dogId}&date=${date}`, { method: 'DELETE' })
    await reload()
  }

  async function changeType(dogId: string, date: string, newType: string) {
    setChangingTypeId(null)
    await fetch('/api/roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dogId, date, type: newType }),
    })
    await reload()
  }

  async function resetDay(date: string) {
    if (!confirm(`Re-semear o dia ${new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}?\n\nIsso remove as entradas automáticas e re-adiciona os cães agendados para o dia. Entradas manuais são mantidas.`)) return
    setResettingDay(date)
    try {
      await fetch(`/api/roster?reset=day&date=${date}`, { method: 'DELETE' })
      await reload()
    } finally {
      setResettingDay(null)
    }
  }

  function toggleFilter(type: string) {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  async function toggleBanho(dogId: string, date: string, current: boolean) {
    try {
      await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId, date, hasBanho: !current }),
      })
      await reload()
    } catch (error) {
      console.error('Error toggling banho:', error)
    }
  }

  async function togglePernoite(dogId: string, date: string, current: boolean) {
    try {
      await fetch('/api/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId, date, isPernoite: !current }),
      })
      await reload()
    } catch (error) {
      console.error('Error toggling pernoite:', error)
    }
  }

  async function togglePresence(dogId: string, date: string, current: boolean | null, isHotel: boolean) {
    const key = `${dogId}_${date}`
    setTogglingPresence(key)
    try {
      let next: boolean | null
      if (isHotel) {
        // Hotel: only confirm presence (null→true) or unconfirm (true→null). No absent state.
        next = current === true ? null : true
      } else {
        // Creche: null→true (present); true→false (absent); false→true (present)
        next = current === true ? false : true
      }
      await fetch('/api/roster/presence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId, date, present: next }),
      })
      await reload()
    } finally {
      setTogglingPresence(null)
    }
  }

  async function markAbsent(dogId: string, date: string, entryType?: string) {
    const key = `${dogId}_${date}`
    setTogglingPresence(key)
    try {
      await fetch('/api/roster/presence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId, date, present: false, entryType }),
      })
      await reload()
    } finally {
      setTogglingPresence(null)
    }
  }

  async function markPresent(dogId: string, date: string, entryType?: string) {
    const key = `${dogId}_${date}`
    setTogglingPresence(key)
    try {
      await fetch('/api/roster/presence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId, date, present: true, entryType }),
      })
      await reload()
    } finally {
      setTogglingPresence(null)
    }
  }

  function isHotelEntry(entry: RosterEntry) {
    return entry.type === 'HOTEL'
  }

  function isReposicaoEntry(entry: RosterEntry) {
    return entry.type === 'REPOSICAO'
  }

  function isAvulsoEntry(entry: RosterEntry) {
    return entry.type === 'AVULSO'
  }

  function isBolsista(entry: RosterEntry) {
    return entry.dog.dogStatus === 'BOLSISTA'
  }

  // Drag handlers
  function onDragStart(dogId: string, fromDate: string | null) {
    setDragDogId(dogId)
    setDragFromDate(fromDate)
  }

  function onDragOver(e: React.DragEvent, date: string) {
    e.preventDefault()
    setDroppingDate(date)
  }

  function onDragLeave() {
    setDroppingDate(null)
  }

  async function onDrop(e: React.DragEvent, toDate: string) {
    e.preventDefault()
    setDroppingDate(null)
    if (!dragDogId) return
    if (dragFromDate === toDate) return
    await addDog(dragDogId, toDate, 'CRECHE')
    // Note: does NOT remove from source day — adds to new day only
    setDragDogId(null)
    setDragFromDate(null)
  }

  const today = toDateStr(new Date())
  const dates = data?.dates ?? Array.from({ length: 7 }, (_, i) => toDateStr(addDays(weekStart, i)))

  function entriesForDate(date: string) {
    const all = data?.entries.filter(e => e.date === date) ?? []
    if (activeFilters.size === 0) return all
    return all.filter(e => {
      if (activeFilters.has('BANHO') && e.hasBanho) return true
      if (activeFilters.has(e.type)) return true
      return false
    })
  }

  function allEntriesForDate(date: string) {
    return data?.entries.filter(e => e.date === date) ?? []
  }

  function dogsForDate(date: string): { dog: RosterDog; alreadyInDate: boolean }[] {
    const inDateIds = new Set(entriesForDate(date).map(e => e.dogId))
    return (data?.allDogs ?? []).map(d => ({ dog: d, alreadyInDate: inDateIds.has(d.id) }))
  }

  const isCurrentWeek = toDateStr(getMonday(new Date())) === weekStartStr

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda Semanal</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatDate(weekStartStr)} — {formatDate(toDateStr(addDays(weekStart, 6)))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'week' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              <CalendarDays className="w-3.5 h-3.5" /> Semana
            </button>
            <button onClick={() => setViewMode('dog')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'dog' ? 'bg-amber-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}>
              <List className="w-3.5 h-3.5" /> Por Cão
            </button>
          </div>
          {viewMode === 'week' && (
            <>
              <button onClick={() => setWeekStart(w => addDays(w, -7))}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="relative" data-week-picker>
                <button
                  onClick={() => setShowWeekPicker(v => !v)}
                  className="flex flex-col items-center px-3 py-1.5 min-w-[120px] rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xs font-bold text-amber-600 tracking-wide">
                    Semana {getWeekNumber(weekStart)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {fmtShort(weekStart)} – {fmtShort(addDays(weekStart, 6))}
                  </span>
                </button>
                {showWeekPicker && (
                  <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden w-52">
                    <div className="max-h-72 overflow-y-auto">
                      {weekOptions.map(({ monday, weekNum }) => {
                        const isCurrent = toDateStr(monday) === weekStartStr
                        const isThisWeek = toDateStr(monday) === toDateStr(getMonday(new Date()))
                        return (
                          <button
                            key={toDateStr(monday)}
                            onClick={() => { setWeekStart(monday); setShowWeekPicker(false) }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-amber-50 transition-colors ${
                              isCurrent ? 'bg-amber-100 font-semibold text-amber-700' : 'text-gray-700'
                            }`}
                          >
                            <span className="font-medium">Sem {weekNum}</span>
                            <span className="text-gray-500">{fmtShort(monday)} – {fmtShort(addDays(monday, 6))}</span>
                            {isThisWeek && <span className="ml-1 text-amber-500">•</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              {!isCurrentWeek && (
                <button onClick={() => setWeekStart(getMonday(new Date()))}
                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium transition-colors">
                  Hoje
                </button>
              )}
              <button onClick={() => setWeekStart(w => addDays(w, 7))}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </>
          )}
        </div>
      </div>

      {error && showError && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="text-amber-500 text-xl mt-0.5">🐕</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{error.message}</p>
                {error.details && <p className="text-xs text-gray-600 mt-1">{error.details}</p>}
                <button
                  onClick={() => setShowError(false)}
                  className="mt-2 text-xs text-amber-600 hover:text-amber-700 font-medium"
                >
                  Entendi
                </button>
              </div>
              <button
                onClick={() => setShowError(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Filtrar:</span>
          {[
            { key: 'CRECHE',    label: '🐾 Creche',     color: 'amber' },
            { key: 'HOTEL',     label: '🏨 Hotel',      color: 'blue' },
            { key: 'AVULSO',    label: '💵 Avulso',     color: 'orange' },
            { key: 'PACOTE',    label: '📦 Pacote',     color: 'green' },
            { key: 'REPOSICAO', label: '🔄 Reposição', color: 'purple' },
            { key: 'BANHO',     label: '🛁 Banho',      color: 'cyan' },
          ].map(({ key, label, color }) => {
            const active = activeFilters.has(key)
            return (
              <button key={key} onClick={() => toggleFilter(key)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                  active
                    ? `bg-${color}-100 border-${color}-400 text-${color}-700`
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {label}
              </button>
            )
          })}
          {activeFilters.size > 0 && (
            <button onClick={() => setActiveFilters(new Set())} className="text-xs text-gray-400 hover:text-gray-600 underline">Limpar</button>
          )}
          <span className="text-xs text-gray-400 ml-auto">💡 Arraste ou clique <strong>+</strong> para adicionar, <strong>×</strong> para remover</span>
        </div>
      )}

      {viewMode === 'dog' && (
        <div className="mb-6 relative max-w-xs" data-dog-search>
          <input
            type="text"
            placeholder="Buscar cão ou tutor..."
            className="input w-full"
            value={dogSearch}
            onChange={e => { setDogSearch(e.target.value); setShowDogSearch(true) }}
            onFocus={() => setShowDogSearch(true)}
          />
          {showDogSearch && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {(data?.allDogs ?? [])
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .filter(d => {
                    const q = dogSearch.toLowerCase()
                    return !q || d.name.toLowerCase().includes(q) || d.ownerName.toLowerCase().includes(q)
                  })
                  .map(d => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setSelectedDogId(d.id)
                        setDogSearch(`${d.name} — ${d.ownerName}`)
                        setShowDogSearch(false)
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-amber-50 transition-colors text-left ${
                        d.id === selectedDogId ? 'bg-amber-100 text-amber-800 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-amber-100 shrink-0 flex items-center justify-center text-xs">
                        {d.photoUrl ? <img src={d.photoUrl} alt={d.name} className="w-full h-full object-cover" /> : '🐶'}
                      </div>
                      <div>
                        <p className="font-medium leading-none">{d.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{d.ownerName}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {viewMode === 'dog' && selectedDogId && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loadingTimeline ? (
            <div className="flex items-center justify-center py-16"><div className="text-4xl animate-bounce">🐾</div></div>
          ) : dogTimeline.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Nenhuma entrada na agenda para este cão</div>
          ) : (() => {
            const todayStr = toDateStr(new Date())
            const past = dogTimeline.filter(e => e.date < todayStr)
            const future = dogTimeline.filter(e => e.date >= todayStr)
            const typeLabel = (t: string) => t === 'CRECHE' ? '🐾 Creche' : t === 'HOTEL' ? '🏨 Hotel' : t === 'AVULSO' ? '💵 Avulso' : t === 'PACOTE' ? '📦 Pacote' : t === 'REPOSICAO' ? '🔄 Reposição' : t
            const presenceBadge = (e: any) => {
              if (e.source === 'PROJECTED') return <span className="text-xs text-gray-400 italic">Previsto</span>
              if (e.date >= todayStr) return <span className="text-xs text-blue-500 font-medium">Agendado</span>
              if (e.present === true) return <span className="text-xs text-green-600 font-semibold">✓ Presente</span>
              if (e.present === false) return <span className="text-xs text-red-500 font-semibold">✗ Faltou</span>
              return <span className="text-xs text-gray-400">—</span>
            }
            const dog = data?.allDogs.find(d => d.id === selectedDogId)
            const totalDays = dogTimeline.length
            const attended = dogTimeline.filter(e => e.present === true).length
            const missed = dogTimeline.filter(e => e.present === false).length
            const upcoming = future.length
            return (
              <div>
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-800">{dog?.name} — Histórico da Agenda</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{dog?.breed} · {dog?.dogStatus}</p>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div><p className="text-lg font-bold text-gray-800">{dogTimeline.filter(e => e.source !== 'PROJECTED').length}</p><p className="text-xs text-gray-500">Na agenda</p></div>
                    <div><p className="text-lg font-bold text-green-600">{attended}</p><p className="text-xs text-gray-500">Presentes</p></div>
                    <div><p className="text-lg font-bold text-red-500">{missed}</p><p className="text-xs text-gray-500">Faltas</p></div>
                    <div><p className="text-lg font-bold text-blue-500">{future.filter(e => e.source !== 'PROJECTED').length}</p><p className="text-xs text-gray-500">Agendados</p></div>
                    <div><p className="text-lg font-bold text-gray-400">{future.filter(e => e.source === 'PROJECTED').length}</p><p className="text-xs text-gray-500">Previstos</p></div>
                  </div>
                </div>
                {future.length > 0 && (
                  <div className="px-6 py-3 border-b border-blue-100 bg-blue-50/40">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Próximos dias</p>
                    <div className="space-y-1">
                      {future.map(e => (
                        <div key={e.id} className={`flex items-center justify-between py-1.5 border-b last:border-0 ${
                          e.source === 'PROJECTED' ? 'border-dashed border-gray-100 opacity-60' : 'border-blue-50'
                        }`}>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm w-28 ${e.source === 'PROJECTED' ? 'font-normal text-gray-500' : 'font-semibold text-gray-800'}`}>
                              {new Date(e.date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'})}
                            </span>
                            <span className="text-xs text-gray-500">{typeLabel(e.type)}</span>
                            {e.isPernoite && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 rounded">🌙 Pernoite</span>}
                          </div>
                          {presenceBadge(e)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {past.length > 0 && (
                  <div className="px-6 py-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Histórico</p>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                      {[...past].reverse().map(e => (
                        <div key={e.id} className={`flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 ${
                          e.present === false ? 'opacity-60' : ''
                        }`}>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-800 w-28">{new Date(e.date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',year:'2-digit'})}</span>
                            <span className="text-xs text-gray-500">{typeLabel(e.type)}</span>
                            {e.isPernoite && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 rounded">🌙</span>}
                          </div>
                          {presenceBadge(e)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {loading && viewMode === 'week' ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-4xl animate-bounce">🐾</div>
        </div>
      ) : viewMode === 'week' ? (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-3 min-w-[1800px] min-h-[500px]">
          {dates.map((date, i) => {
            const dayDate = new Date(date + 'T12:00:00')
            const dayIdx = dayDate.getDay()
            const isToday = date === today
            const entries = entriesForDate(date)
            const isDroppingHere = droppingDate === date
            const isWeekend = dayIdx === 0 || dayIdx === 6

            return (
              <div key={date}
                onDragOver={e => onDragOver(e, date)}
                onDragLeave={onDragLeave}
                onDrop={e => onDrop(e, date)}
                className={`flex flex-col rounded-xl border-2 transition-colors min-h-[400px] ${
                  isDroppingHere
                    ? 'border-amber-400 bg-amber-50'
                    : isToday
                      ? 'border-amber-300 bg-amber-50/60'
                      : isWeekend
                        ? 'border-gray-100 bg-gray-50/50'
                        : 'border-gray-200 bg-white'
                }`}
              >
                {/* Day header */}
                <div className={`px-2 py-2 text-center rounded-t-xl border-b relative ${
                  isToday ? 'bg-amber-500 border-amber-400' : isWeekend ? 'bg-gray-100 border-gray-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className={`text-xs font-semibold ${isToday ? 'text-white' : 'text-gray-500'}`}>
                    {DAYS_PT[dayIdx]}
                  </p>
                  <p className={`text-lg font-bold leading-none ${isToday ? 'text-white' : 'text-gray-800'}`}>
                    {dayDate.getDate()}
                  </p>
                  {(() => {
                    const presentCount = entries.filter(e => e.present).length
                    if (presentCount === 0) return null
                    return (
                      <span className={`text-xs font-medium ${isToday ? 'text-amber-100' : 'text-gray-400'}`}>
                        {presentCount} {presentCount === 1 ? 'presente' : 'presentes'}
                      </span>
                    )
                  })()}
                  {(() => {
                    const all = allEntriesForDate(date)
                    const counts = [
                      { icon: '\ud83d\udc3e', type: 'CRECHE',    label: 'Creche',     n: all.filter(e => e.type === 'CRECHE').length },
                      { icon: '\ud83c\udfe8', type: 'HOTEL',     label: 'Hotel',      n: all.filter(e => e.type === 'HOTEL').length },
                      { icon: '\ud83d\udcb5', type: 'AVULSO',    label: 'Avulso',     n: all.filter(e => e.type === 'AVULSO').length },
                      { icon: '\ud83d\udce6', type: 'PACOTE',    label: 'Pacote',     n: all.filter(e => e.type === 'PACOTE').length },
                      { icon: '\ud83d\udd04', type: 'REPOSICAO', label: 'Reposição', n: all.filter(e => e.type === 'REPOSICAO').length },
                      { icon: '\ud83d\udec1', type: 'BANHO',     label: 'Banho',      n: all.filter(e => e.hasBanho).length },
                    ].filter(c => c.n > 0)
                    if (counts.length === 0) return null
                    return (
                      <div className={`flex flex-wrap justify-center gap-x-1.5 mt-0.5 ${isToday ? 'text-amber-100' : 'text-gray-400'}`}>
                        {counts.map(c => (
                          <span key={c.type} className="text-[10px] cursor-default" title={`${c.n} ${c.n === 1 ? 'cão' : 'cães'} em ${c.label}`}>{c.icon}{c.n}</span>
                        ))}
                      </div>
                    )
                  })()}
                  {date >= today && (
                    <button
                      onClick={() => resetDay(date)}
                      disabled={resettingDay === date}
                      title="Re-semear este dia"
                      className={`absolute top-1 right-1 p-0.5 rounded transition-all ${
                        isToday
                          ? 'text-amber-200 hover:text-white hover:bg-amber-400'
                          : 'text-gray-300 hover:text-gray-500 hover:bg-gray-200'
                      } ${resettingDay === date ? 'animate-spin' : ''}`}
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Dog cards */}
                <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
                  {entries.map(entry => {
                    const isFuture = date > today
                    const pKey = `${entry.dogId}_${date}`
                    const isToggling = togglingPresence === pKey
                    const p = entry.present

                    // Color scheme by modality
                    const borderColor =
                      isHotelEntry(entry) ? 'border-l-blue-500' :
                      isReposicaoEntry(entry) ? 'border-l-purple-500' :
                      entry.type === 'AVULSO' ? 'border-l-orange-500' :
                      entry.type === 'PACOTE' ? 'border-l-emerald-500' :
                      'border-l-amber-500'

                    const bgColor =
                      p === false
                        ? 'bg-red-50/80'
                        : p === true
                          ? isHotelEntry(entry) || isReposicaoEntry(entry)
                            ? 'bg-blue-50/40'
                            : 'bg-green-50/40'
                          : 'bg-white'

                    return (
                    <div
                      key={entry.id}
                      draggable
                      onDragStart={() => onDragStart(entry.dogId, date)}
                      className={`group flex items-center gap-1.5 border border-gray-100 border-l-[3px] ${borderColor} rounded-md px-2 py-1.5 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all ${bgColor}`}
                    >
                      {/* Photo + Name */}
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-amber-100 shrink-0 flex items-center justify-center text-[8px]">
                        {entry.dog.photoUrl
                          ? <img src={entry.dog.photoUrl} alt={entry.dog.name} className="w-full h-full object-cover" />
                          : entry.dog.name[0].toUpperCase()}
                      </div>
                      <Link href={`/dogs/${entry.dogId}`}
                        className="flex-1 min-w-0"
                        onClick={e => e.stopPropagation()}>
                        <p className={`text-xs font-semibold truncate leading-tight ${
                          p === false ? 'text-red-600 line-through' : 'text-gray-800'
                        }`}>{entry.dog.name}</p>
                      </Link>

                      {/* Inline indicators (only when active) */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        {isBolsista(entry) && <span className="text-[9px]" title="Bolsista">🎓</span>}
                        {entry.hasBanho && <span className="text-[9px]" title="Banho agendado">🛁</span>}
                        {entry.isPernoite && <span className="text-[9px]" title="Pernoite">🌙</span>}
                      </div>

                      {/* Presence buttons (always visible for past/today) - ALL dog types */}
                      {!isFuture && (
                        <div className="flex gap-0.5">
                          {/* Present button */}
                          <button
                            onClick={() => markPresent(entry.dogId, date, entry.type)}
                            disabled={isToggling || p === true}
                            title="Marcar presente"
                            className={`p-0.5 rounded shrink-0 transition-all ${
                              p === true
                                ? 'text-green-600 bg-green-100 cursor-default'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-100'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          {/* Absent button */}
                          <button
                            onClick={() => markAbsent(entry.dogId, date, entry.type)}
                            disabled={isToggling || p === false}
                            title="Marcar falta"
                            className={`p-0.5 rounded shrink-0 transition-all ${
                              p === false
                                ? 'text-red-500 bg-red-100 cursor-default'
                                : 'text-gray-400 hover:text-red-500 hover:bg-red-100'
                            }`}
                          >
                            <UserX className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Hover actions */}
                      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => toggleBanho(entry.dogId, date, entry.hasBanho)}
                          className={`p-0.5 rounded transition-all ${
                            entry.hasBanho ? 'text-cyan-600 hover:bg-cyan-100' : 'text-gray-400 hover:text-cyan-500 hover:bg-cyan-50'
                          }`}
                          title={entry.hasBanho ? 'Remover banho' : 'Agendar banho'}
                        >
                          <span className="text-[10px]">🛁</span>
                        </button>
                        {entry.type === 'CRECHE' && (
                          <button
                            onClick={() => togglePernoite(entry.dogId, date, entry.isPernoite)}
                            className={`p-0.5 rounded transition-all ${
                              entry.isPernoite ? 'text-purple-600 hover:bg-purple-100' : 'text-gray-400 hover:text-purple-500 hover:bg-purple-50'
                            }`}
                            title={entry.isPernoite ? 'Remover pernoite' : 'Marcar pernoite'}
                          >
                            <span className="text-[10px]">🌙</span>
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setChangingTypeId(changingTypeId === entry.id ? null : entry.id) }}
                          className="p-0.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                          title="Alterar modalidade"
                        >
                          <GripVertical className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeDog(entry.dogId, date)}
                          className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Remover do dia"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Change type dropdown */}
                      {changingTypeId === entry.id && (
                        <div className="absolute right-1 mt-16 z-50 flex gap-0.5 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
                          {[
                            { type: 'CRECHE', icon: '🐾', bg: 'hover:bg-amber-100' },
                            { type: 'AVULSO', icon: '💵', bg: 'hover:bg-orange-100' },
                            { type: 'PACOTE', icon: '📦', bg: 'hover:bg-green-100' },
                            { type: 'HOTEL', icon: '🏨', bg: 'hover:bg-blue-100' },
                            { type: 'REPOSICAO', icon: '🔄', bg: 'hover:bg-purple-100' },
                          ].map(({ type, icon, bg }) => (
                            <button key={type} onClick={e => { e.stopPropagation(); changeType(entry.dogId, date, type) }}
                              className={`text-xs px-1.5 py-1 rounded ${bg} transition-colors`}
                              title={type}
                            >{icon}</button>
                          ))}
                          <button onClick={e => { e.stopPropagation(); setChangingTypeId(null) }}
                            className="text-xs px-1 py-1 rounded hover:bg-gray-100 text-gray-500">✕</button>
                        </div>
                      )}
                    </div>
                  )})}
                </div>

                {/* Add button */}
                <div className="p-1.5 border-t border-gray-100">
                  {addingToDate === date ? (
                    <div className="space-y-1">
                      {pendingAddDog && pendingAddDog.date === date ? (
                        // Step 2: choose type or package
                        <>
                        {(() => {
                          const dogSaleTypes = suggestedDogSales.get(pendingAddDog!.dogId) ?? []
                          // Map saleType → agenda modalities
                          const showCreche = dogSaleTypes.length === 0 || dogSaleTypes.some(t => t === 'MENSAL' || t === 'AVULSO')
                          const showAvulso = dogSaleTypes.length === 0 || dogSaleTypes.includes('AVULSO')
                          const showHotel = dogSaleTypes.length === 0 || dogSaleTypes.includes('HOTEL')
                          const showPacote = dogSaleTypes.length === 0 || dogSaleTypes.includes('PACOTE') || (dogPackages && dogPackages.length > 0)
                          const showReposicao = true // always available
                          return (
                            <>
                              <p className="text-xs text-gray-500 font-medium px-1">Adicionar como:</p>
                              {showPacote && dogPackages && dogPackages.length > 0 && (
                                <>
                                  <p className="text-xs text-gray-400 font-medium px-1 mt-1">📦 Pacote:</p>
                                  {dogPackages.map((pkg: any) => (
                                    <button
                                      key={pkg.id}
                                      onClick={() => addDog(pendingAddDog!.dogId, date, 'PACOTE', pkg.id)}
                                      className="w-full text-left px-2 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-xs font-medium text-green-700 transition-colors flex items-center justify-between"
                                    >
                                      <span>📦 {pkg.packageType} ({pkg.remainingDays} dias)</span>
                                      <span className="text-xs text-green-600">Expira: {new Date(pkg.expiryDate).toLocaleDateString('pt-BR')}</span>
                                    </button>
                                  ))}
                                </>
                              )}
                              {showCreche && (
                                <button onClick={() => addDog(pendingAddDog!.dogId, date, 'CRECHE')}
                                  className="w-full text-left px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-xs font-medium text-amber-700 transition-colors">
                                  🐾 Creche
                                </button>
                              )}
                              {showAvulso && (
                                <button onClick={() => addDog(pendingAddDog!.dogId, date, 'AVULSO')}
                                  className="w-full text-left px-2 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-xs font-medium text-orange-700 transition-colors">
                                  💵 Avulso
                                </button>
                              )}
                              {showHotel && (
                                <button onClick={() => addDog(pendingAddDog!.dogId, date, 'HOTEL')}
                                  className="w-full text-left px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-xs font-medium text-blue-700 transition-colors">
                                  🏨 Hotel
                                </button>
                              )}
                              {showReposicao && (
                                <button onClick={() => addDog(pendingAddDog!.dogId, date, 'REPOSICAO')}
                                  className="w-full text-left px-2 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-xs font-medium text-purple-700 transition-colors">
                                  🔄 Reposição
                                </button>
                              )}
                              {dogSaleTypes.length > 0 && (
                                <details className="mt-1">
                                  <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600 px-1">+ outras modalidades</summary>
                                  <div className="mt-0.5 space-y-0.5">
                                    {!showCreche && (
                                      <button onClick={() => addDog(pendingAddDog!.dogId, date, 'CRECHE')}
                                        className="w-full text-left px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-amber-50 text-xs font-medium text-gray-600 transition-colors">
                                        🐾 Creche
                                      </button>
                                    )}
                                    {!showAvulso && (
                                      <button onClick={() => addDog(pendingAddDog!.dogId, date, 'AVULSO')}
                                        className="w-full text-left px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-orange-50 text-xs font-medium text-gray-600 transition-colors">
                                        💵 Avulso
                                      </button>
                                    )}
                                    {!showHotel && (
                                      <button onClick={() => addDog(pendingAddDog!.dogId, date, 'HOTEL')}
                                        className="w-full text-left px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-blue-50 text-xs font-medium text-gray-600 transition-colors">
                                        🏨 Hotel
                                      </button>
                                    )}
                                  </div>
                                </details>
                              )}
                              <button onClick={() => {
                                setPendingAddDog(null)
                                setDogPackages(null)
                              }}
                                className="w-full text-xs text-gray-400 hover:text-gray-600 py-0.5">← Voltar</button>
                            </>
                          )
                        })()}
                        </>
                      ) : (
                        // Step 1: choose dog
                        <>
                          <input
                            autoFocus
                            type="text"
                            placeholder="Buscar cão..."
                            value={addSearch}
                            onChange={e => setAddSearch(e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-amber-400 bg-white mb-1"
                          />
                          <div className="max-h-40 overflow-y-auto space-y-0.5">
                            {(() => {
                              const all = dogsForDate(date)
                              const q = addSearch.toLowerCase()
                              const filtered = q
                                ? all.filter(({ dog }) => dog.name.toLowerCase().includes(q) || dog.ownerName.toLowerCase().includes(q))
                                : all
                              const suggested = filtered.filter(({ dog }) => suggestedDogSales.has(dog.id))
                              const others = filtered.filter(({ dog }) => !suggestedDogSales.has(dog.id))
                              const sorted = [...suggested, ...others]
                              if (sorted.length === 0) return <p className="text-xs text-gray-400 text-center py-1">Nenhum encontrado</p>
                              return (
                                <>
                                  {suggested.length > 0 && !q && (
                                    <p className="text-[10px] text-amber-600 font-semibold px-1 pt-0.5">⭐ Com venda ativa este mês</p>
                                  )}
                                  {sorted.map(({ dog, alreadyInDate }, idx) => (
                                    <>
                                      {!q && idx === suggested.length && suggested.length > 0 && (
                                        <p key="sep" className="text-[10px] text-gray-400 px-1 pt-1">Outros cães</p>
                                      )}
                                      <button
                                        key={dog.id}
                                        onClick={() => {
                                          setPendingAddDog({ dogId: dog.id, date })
                                          loadDogPackages(dog.id)
                                        }}
                                        className={`w-full flex items-center gap-1.5 text-left px-2 py-1 rounded-lg text-xs transition-colors ${
                                          suggestedDogSales.has(dog.id)
                                            ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200'
                                            : 'hover:bg-gray-50'
                                        }`}
                                      >
                                        <div className="w-5 h-5 rounded-full overflow-hidden bg-amber-100 shrink-0 flex items-center justify-center text-xs">
                                          {dog.photoUrl ? <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover" /> : '🐶'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <span className="font-medium text-gray-700 truncate">{dog.name}</span>
                                          <span className="text-[10px] text-gray-400 ml-1 truncate">{dog.ownerName}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          {alreadyInDate && <span className="text-[9px] text-blue-500" title="Já agendado neste dia">✓</span>}
                                          {suggestedDogSales.has(dog.id) && <span className="text-[9px] text-amber-500">⭐</span>}
                                        </div>
                                      </button>
                                    </>
                                  ))}
                                </>
                              )
                            })()}
                          </div>
                          <button onClick={() => { setAddingToDate(null); setAddSearch('') }}
                            className="w-full text-xs text-gray-400 hover:text-gray-600 py-0.5">
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingToDate(date); setAddSearch(''); loadSuggestedDogs(date) }}
                      className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-colors text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        </div>
      ) : null}

      {/* Pool of all dogs — only in week view */}
      {viewMode === 'week' && data && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm font-semibold text-gray-600 mb-3">
            Arraste para adicionar a qualquer dia:
          </p>
          <div className="flex flex-wrap gap-2">
            {data.allDogs.map(dog => (
              <div
                key={dog.id}
                draggable
                onDragStart={() => onDragStart(dog.id, null)}
                className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 cursor-grab active:cursor-grabbing hover:border-amber-300 hover:shadow-sm transition-all text-xs"
              >
                <div className="w-5 h-5 rounded-full overflow-hidden bg-amber-100 shrink-0 flex items-center justify-center">
                  {dog.photoUrl ? <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover" /> : '🐶'}
                </div>
                <span className="font-medium text-gray-700">{dog.name}</span>
                {dog.scheduledDays && (
                  <span className="text-gray-400">· {dog.scheduledDays}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
