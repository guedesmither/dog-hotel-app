'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarCheck, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Search } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatDateShort } from '@/lib/utils'

interface DayEntry { date: string; type: string; present: boolean | null }

interface Plan {
  kind: 'MENSAL' | 'PACOTE'
  id: string
  start: string
  end: string
  acquired: number | null
  present: number
  absent: number
  scheduled: number
  unmarked: number
  absentLost: number
  balance: number | null
  days: DayEntry[]
}

interface ReplacementRow {
  id: string
  absentDate: string
  billingMonthEnd: string
  scheduledDate: string | null
  status: 'PENDING' | 'SCHEDULED' | 'DONE' | 'EXPIRED'
}

interface DogRow {
  dog: { id: string; name: string; photoUrl: string | null; serviceType: string | null; scheduledDays: string | null }
  plans: Plan[]
  replacements: ReplacementRow[]
}

type Filter = 'TODOS' | 'MENSAL' | 'PACOTE' | 'REPOSICAO'

const STATUS_LABEL: Record<ReplacementRow['status'], { label: string; cls: string }> = {
  PENDING: { label: 'Pendente', cls: 'bg-amber-100 text-amber-800' },
  SCHEDULED: { label: 'Agendada', cls: 'bg-purple-100 text-purple-800' },
  DONE: { label: 'Realizada', cls: 'bg-green-100 text-green-800' },
  EXPIRED: { label: 'Perdida', cls: 'bg-gray-200 text-gray-600' },
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function shiftMonth(date: string, delta: number) {
  const d = new Date(date + 'T12:00:00')
  d.setMonth(d.getMonth() + delta)
  return d.toISOString().split('T')[0]
}

function fmtDay(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

function agendaHref(date: string) {
  return `/agenda?date=${date}`
}

function ProgressBar({ plan }: { plan: Plan }) {
  const total = plan.acquired ?? Math.max(plan.present + plan.scheduled + plan.unmarked + plan.absentLost, 1)
  const pct = (n: number) => `${Math.min(100, (n / Math.max(total, 1)) * 100)}%`
  return (
    <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden flex">
      <div className="bg-green-500" style={{ width: pct(plan.present) }} title={`${plan.present} presença(s)`} />
      <div className="bg-gray-400" style={{ width: pct(plan.unmarked) }} title={`${plan.unmarked} sem marcação`} />
      <div className="bg-red-400" style={{ width: pct(plan.absentLost) }} title={`${plan.absentLost} falta(s) sem reposição`} />
      <div className="bg-blue-400" style={{ width: pct(plan.scheduled) }} title={`${plan.scheduled} agendado(s)`} />
    </div>
  )
}

function Stat({ label, value, cls = 'text-gray-800' }: { label: string; value: number | string; cls?: string }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold leading-tight ${cls}`}>{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  )
}

function dayChipClass(d: DayEntry) {
  if (d.present === true) return 'bg-green-50 border-green-300 text-green-800'
  if (d.present === false) return 'bg-red-50 border-red-300 text-red-700 line-through'
  if (d.date < todayStr()) return 'bg-gray-50 border-gray-300 text-gray-600'
  return 'bg-blue-50 border-blue-300 text-blue-800'
}

export default function PresencasPage() {
  const [ref, setRef] = useState(todayStr())
  const [rows, setRows] = useState<DogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('TODOS')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [dateInputs, setDateInputs] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`/api/presencas?ref=${ref}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setRows(json.dogs)
    } catch {
      toast.error('Erro ao carregar presenças')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [ref])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const onFocus = () => load(true)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  async function updateReplacement(id: string, body: Record<string, unknown>, success: string) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/replacements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success(success)
      setDateInputs(prev => { const n = { ...prev }; delete n[id]; return n })
      await load(true)
    } catch {
      toast.error('Não foi possível salvar')
    } finally {
      setSavingId(null)
    }
  }

  function toggle(dogId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(dogId)) next.delete(dogId)
      else next.add(dogId)
      return next
    })
  }

  const pendingCount = (r: DogRow) => r.replacements.filter(x => x.status === 'PENDING').length

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter(r => !q || r.dog.name.toLowerCase().includes(q))
      .filter(r => {
        if (filter === 'MENSAL') return r.plans.some(p => p.kind === 'MENSAL')
        if (filter === 'PACOTE') return r.plans.some(p => p.kind === 'PACOTE')
        if (filter === 'REPOSICAO') return r.replacements.some(x => x.status === 'PENDING' || x.status === 'SCHEDULED')
        return true
      })
  }, [rows, search, filter])

  const totalPending = rows.reduce((s, r) => s + pendingCount(r), 0)
  const totalScheduled = rows.reduce((s, r) => s + r.replacements.filter(x => x.status === 'SCHEDULED').length, 0)
  const refLabel = new Date(ref + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-teal-600" /> Presenças
          </h1>
          <p className="text-sm text-gray-500">Dias adquiridos x consumidos e reposições. Tudo aqui reflete direto na agenda.</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setRef(r => shiftMonth(r, -1))} className="p-2 rounded-lg hover:bg-gray-100" title="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input type="date" value={ref} onChange={e => e.target.value && setRef(e.target.value)}
            className="input py-1.5 text-sm w-40" title="Data de referência" />
          <button onClick={() => setRef(r => shiftMonth(r, 1))} className="p-2 rounded-lg hover:bg-gray-100" title="Próximo mês">
            <ChevronRight className="w-4 h-4" />
          </button>
          {ref !== todayStr() && (
            <button onClick={() => setRef(todayStr())} className="text-xs px-2 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100">Hoje</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="card py-3 text-center"><p className="text-xl font-bold">{rows.length}</p><p className="text-xs text-gray-500">cães com plano em {refLabel}</p></div>
        <button onClick={() => setFilter('REPOSICAO')} className="card py-3 text-center hover:ring-2 hover:ring-amber-200">
          <p className="text-xl font-bold text-amber-600">{totalPending}</p><p className="text-xs text-gray-500">reposições pendentes</p>
        </button>
        <button onClick={() => setFilter('REPOSICAO')} className="card py-3 text-center hover:ring-2 hover:ring-purple-200">
          <p className="text-xl font-bold text-purple-600">{totalScheduled}</p><p className="text-xs text-gray-500">reposições agendadas</p>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cão..." className="input pl-9 py-2 text-sm w-full" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {([
            ['TODOS', 'Todos'],
            ['MENSAL', 'Mensal'],
            ['PACOTE', 'Pacote'],
            ['REPOSICAO', 'Com reposição'],
          ] as [Filter, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`text-xs px-3 py-2 rounded-lg font-medium ${filter === key ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 mb-3">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Presença</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400" /> Sem marcação</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400" /> Falta sem reposição</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400" /> Agendado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border" /> Saldo livre</span>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Carregando...</p>
      ) : visible.length === 0 ? (
        <p className="text-center text-gray-400 py-12">Nenhum cão encontrado.</p>
      ) : (
        <div className="space-y-3">
          {visible.map(row => {
            const isOpen = expanded.has(row.dog.id)
            const pending = pendingCount(row)
            const openReplacements = row.replacements.filter(r => r.status === 'PENDING' || r.status === 'SCHEDULED')
            const closedReplacements = row.replacements.filter(r => r.status === 'DONE' || r.status === 'EXPIRED')
            return (
              <div key={row.dog.id} className="card p-0 overflow-hidden">
                <button onClick={() => toggle(row.dog.id)} className="w-full text-left p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-xl overflow-hidden shrink-0">
                      {row.dog.photoUrl ? <img src={row.dog.photoUrl} alt={row.dog.name} className="w-full h-full object-cover" /> : '🐶'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{row.dog.name}</p>
                        {row.plans.map(p => (
                          <span key={p.id} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.kind === 'MENSAL' ? 'bg-teal-100 text-teal-800' : 'bg-orange-100 text-orange-800'}`}>
                            {p.kind === 'MENSAL' ? 'Mensal' : 'Pacote'}
                          </span>
                        ))}
                        {pending > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {pending} reposição{pending > 1 ? 'ões' : ''} pendente{pending > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {row.dog.scheduledDays && <p className="text-xs text-gray-500 truncate">{row.dog.scheduledDays}</p>}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>

                  {row.plans.map(p => (
                    <div key={p.id} className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{p.kind === 'MENSAL' ? 'Período' : 'Validade'}: {formatDateShort(p.start)} – {formatDateShort(p.end)}</span>
                        <span className="font-medium text-gray-700">
                          {p.present} de {p.acquired ?? '∞'} dia(s) usados
                        </span>
                      </div>
                      <ProgressBar plan={p} />
                      <div className="grid grid-cols-5 gap-1 mt-2">
                        <Stat label="Adquiridos" value={p.acquired ?? '∞'} />
                        <Stat label="Presenças" value={p.present} cls="text-green-600" />
                        <Stat label="Faltas" value={p.absent} cls="text-red-500" />
                        <Stat label="Agendados" value={p.scheduled} cls="text-blue-600" />
                        <Stat label="Saldo" value={p.balance ?? '∞'} cls={p.balance !== null && p.balance < 0 ? 'text-red-600' : 'text-teal-700'} />
                      </div>
                    </div>
                  ))}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/60 p-4 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">Reposições</h3>
                        <Link href={`/agenda?dog=${row.dog.id}`} className="text-xs text-teal-700 hover:underline flex items-center gap-1">
                          Ver cão na agenda <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      {openReplacements.length === 0 && closedReplacements.length === 0 && (
                        <p className="text-xs text-gray-400">Nenhuma reposição. Faltas marcadas na agenda aparecem aqui.</p>
                      )}
                      <div className="space-y-2">
                        {openReplacements.map(r => {
                          const overdue = r.status === 'PENDING' && r.billingMonthEnd < todayStr()
                          const inputValue = dateInputs[r.id] ?? r.scheduledDate ?? ''
                          const busy = savingId === r.id
                          return (
                            <div key={r.id} className={`rounded-lg border bg-white p-3 flex flex-col md:flex-row md:items-center gap-2 ${overdue ? 'border-red-200' : 'border-gray-200'}`}>
                              <div className="flex-1 text-sm">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_LABEL[r.status].cls}`}>{STATUS_LABEL[r.status].label}</span>
                                  <span className="text-gray-800">Falta em <b>{fmtDay(r.absentDate)}</b></span>
                                  {r.scheduledDate && (
                                    <Link href={agendaHref(r.scheduledDate)} className="text-purple-700 hover:underline">
                                      → reposição em <b>{fmtDay(r.scheduledDate)}</b>
                                    </Link>
                                  )}
                                </div>
                                <p className={`text-xs mt-0.5 ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                  Prazo: {formatDateShort(r.billingMonthEnd)}{overdue ? ' (vencido)' : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                <input type="date" value={inputValue} min={r.absentDate}
                                  onChange={e => setDateInputs(prev => ({ ...prev, [r.id]: e.target.value }))}
                                  className="input py-1 text-xs w-36" />
                                <button disabled={!inputValue || inputValue === r.scheduledDate || busy}
                                  onClick={() => updateReplacement(r.id, { scheduledDate: inputValue }, r.scheduledDate ? 'Reposição remarcada na agenda' : 'Reposição agendada na agenda')}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white font-semibold disabled:opacity-40 hover:bg-purple-700">
                                  {r.scheduledDate ? 'Remarcar' : 'Agendar'}
                                </button>
                                {r.status === 'SCHEDULED' && (
                                  <>
                                    <button disabled={busy} onClick={() => updateReplacement(r.id, { status: 'DONE' }, 'Reposição marcada como realizada')}
                                      className="text-xs px-2 py-1.5 rounded-lg bg-green-100 text-green-800 hover:bg-green-200">Realizada</button>
                                    <button disabled={busy} onClick={() => updateReplacement(r.id, { scheduledDate: null }, 'Reposição desmarcada da agenda')}
                                      className="text-xs px-2 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Desmarcar</button>
                                  </>
                                )}
                                <button disabled={busy}
                                  onClick={() => { if (confirm('Marcar esta reposição como perdida?')) updateReplacement(r.id, { status: 'EXPIRED' }, 'Reposição marcada como perdida') }}
                                  className="text-xs px-2 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100">Perdida</button>
                              </div>
                            </div>
                          )
                        })}
                        {closedReplacements.map(r => (
                          <div key={r.id} className="rounded-lg border border-gray-100 bg-white/70 p-2 px-3 flex items-center gap-2 text-xs text-gray-600">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_LABEL[r.status].cls}`}>{STATUS_LABEL[r.status].label}</span>
                            <span className="flex-1">
                              Falta em {fmtDay(r.absentDate)}{r.scheduledDate ? ` → reposição em ${fmtDay(r.scheduledDate)}` : ''}
                            </span>
                            <button disabled={savingId === r.id}
                              onClick={() => updateReplacement(r.id, { status: 'PENDING' }, 'Reposição reativada')}
                              className="px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-600">↺ Reativar</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {row.plans.map(p => (
                      <div key={p.id}>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                          Dias {p.kind === 'MENSAL' ? 'do período' : 'do pacote'} ({p.days.length})
                          <span className="font-normal text-xs text-gray-400 ml-2">clique para ajustar na agenda</span>
                        </h3>
                        {p.days.length === 0 ? (
                          <p className="text-xs text-gray-400">Nenhum dia na agenda.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {p.days.map(d => (
                              <Link key={d.date} href={agendaHref(d.date)}
                                className={`text-xs px-2 py-1 rounded-lg border hover:shadow-sm ${dayChipClass(d)}`}
                                title={d.present === true ? 'Presente' : d.present === false ? 'Faltou' : d.date < todayStr() ? 'Sem marcação' : 'Agendado'}>
                                {d.type === 'REPOSICAO' && '🔄 '}{fmtDay(d.date)}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
