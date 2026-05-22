'use client'

import { useEffect, useState, useCallback } from 'react'
import { CalendarPlus, CheckCircle2, XCircle, LogIn, RefreshCw, Search, CalendarCheck } from 'lucide-react'
import { format, isPast, isToday, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Dog { id: string; name: string; breed: string; photoUrl: string | null }
interface Stay {
  id: string
  dog: Dog
  room: string | null
  notes: string | null
  scheduledCheckIn: string | null
  scheduledCheckOut: string | null
  createdAt: string
}

// Helper to parse date without timezone issues (YYYY-MM-DD)
function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed in JS Date
}

export default function AgendamentosPage() {
  const [stays, setStays] = useState<Stay[]>([])
  const [allDogs, setAllDogs] = useState<Dog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    dogId: '', room: '', notes: '',
    scheduledCheckIn: '', scheduledCheckOut: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const staysRes = await fetch('/api/stays?scheduled=true')
      if (staysRes.ok) setStays(await staysRes.json())
    } catch {}
    try {
      const dogsRes = await fetch('/api/dogs')
      if (dogsRes.ok) setAllDogs(await dogsRes.json())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.dogId || !form.scheduledCheckIn) {
      toast.error('Selecione o cão e a data de entrada')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/stays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, isScheduled: true }),
      })
      if (!res.ok) throw new Error()
      toast.success('Agendamento criado!')
      setShowForm(false)
      setForm({ dogId: '', room: '', notes: '', scheduledCheckIn: '', scheduledCheckOut: '' })
      load()
    } catch {
      toast.error('Erro ao agendar')
    } finally {
      setSaving(false)
    }
  }

  async function confirmCheckin(stay: Stay) {
    if (!confirm(`Confirmar check-in de ${stay.dog.name} agora?`)) return
    const res = await fetch('/api/stays', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: stay.id, action: 'confirm' }),
    })
    if (res.ok) { toast.success('Check-in realizado!'); load() }
    else toast.error('Erro ao confirmar')
  }

  async function cancelStay(stay: Stay) {
    if (!confirm(`Cancelar agendamento de ${stay.dog.name}?`)) return
    const res = await fetch('/api/stays', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: stay.id, action: 'cancel' }),
    })
    if (res.ok) { toast.success('Agendamento cancelado'); load() }
    else toast.error('Erro ao cancelar')
  }

  const filtered = stays.filter(s =>
    s.dog.name.toLowerCase().includes(search.toLowerCase()) ||
    s.dog.breed.toLowerCase().includes(search.toLowerCase())
  )

  const today = filtered.filter(s => s.scheduledCheckIn && isToday(parseDateOnly(s.scheduledCheckIn)))
  const upcoming = filtered.filter(s => s.scheduledCheckIn && !isToday(parseDateOnly(s.scheduledCheckIn)) && !isPast(parseDateOnly(s.scheduledCheckIn)))
  const overdue = filtered.filter(s => s.scheduledCheckIn && isPast(parseDateOnly(s.scheduledCheckIn)) && !isToday(parseDateOnly(s.scheduledCheckIn)))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarPlus className="w-6 h-6 text-amber-600" />
            Agendamentos
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{stays.length} {stays.length === 1 ? 'agendamento' : 'agendamentos'} {stays.length === 1 ? 'pendente' : 'pendentes'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
            <CalendarPlus className="w-4 h-4" />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="card mb-6 border-amber-200 bg-amber-50/30 animate-slide-down">
          <h2 className="font-semibold text-gray-800 mb-4">📅 Novo Agendamento de Estadia</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Cão *</label>
              <select className="select" value={form.dogId} onChange={e => setForm(p => ({ ...p, dogId: e.target.value }))} required>
                <option value="">Selecione o cão...</option>
                {allDogs.map(d => (
                  <option key={d.id} value={d.id}>{d.name} — {d.breed}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Data de Entrada *</label>
              <input type="date" className="input" value={form.scheduledCheckIn} onChange={e => setForm(p => ({ ...p, scheduledCheckIn: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Data de Saída (previsão)</label>
              <input type="date" className="input" value={form.scheduledCheckOut} onChange={e => setForm(p => ({ ...p, scheduledCheckOut: e.target.value }))} />
            </div>
            <div>
              <label className="label">Quarto / Vaga</label>
              <input type="text" className="input" placeholder="Ex: Quarto 3" value={form.room} onChange={e => setForm(p => ({ ...p, room: e.target.value }))} />
            </div>
            <div>
              <label className="label">Observações</label>
              <input type="text" className="input" placeholder="Notas sobre a estadia" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary text-sm">
                {saving ? 'Salvando...' : '✓ Confirmar Agendamento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Busca */}
      {stays.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar cão..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-16"><div className="text-4xl animate-bounce">📅</div></div>
      ) : stays.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-3">📅</div>
          <p className="text-gray-600 font-medium">Nenhum agendamento pendente</p>
          <p className="text-gray-400 text-sm mt-1">Clique em "Novo Agendamento" para começar</p>
        </div>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && <StayGroup title="⚠️ Atrasados" color="red" stays={overdue} onConfirm={confirmCheckin} onCancel={cancelStay} />}
          {today.length > 0 && <StayGroup title="🟢 Chegam Hoje" color="green" stays={today} onConfirm={confirmCheckin} onCancel={cancelStay} />}
          {upcoming.length > 0 && <StayGroup title="📆 Próximos" color="teal" stays={upcoming} onConfirm={confirmCheckin} onCancel={cancelStay} />}
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8">Nenhum resultado para "{search}"</p>}
        </div>
      )}
    </div>
  )
}

function StayGroup({ title, color, stays, onConfirm, onCancel }: {
  title: string; color: string; stays: Stay[]
  onConfirm: (s: Stay) => void; onCancel: (s: Stay) => void
}) {
  const border = color === 'red' ? 'border-red-200' : color === 'green' ? 'border-green-200' : 'border-amber-200'
  return (
    <div>
      <h2 className="font-semibold text-gray-700 mb-2 text-sm">{title}</h2>
      <div className="space-y-3">
        {stays.map(stay => <StayCard key={stay.id} stay={stay} onConfirm={onConfirm} onCancel={onCancel} borderClass={border} />)}
      </div>
    </div>
  )
}

function StayCard({ stay, onConfirm, onCancel, borderClass }: {
  stay: Stay; borderClass: string
  onConfirm: (s: Stay) => void; onCancel: (s: Stay) => void
}) {
  const checkIn = stay.scheduledCheckIn ? parseDateOnly(stay.scheduledCheckIn) : null
  const checkOut = stay.scheduledCheckOut ? parseDateOnly(stay.scheduledCheckOut) : null
  const daysUntil = checkIn ? differenceInDays(checkIn, new Date()) : null
  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : null

  return (
    <div className={`card border-2 ${borderClass} flex items-center gap-4`}>
      <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-xl font-bold text-amber-700 shrink-0 overflow-hidden">
        {stay.dog.photoUrl ? <img src={stay.dog.photoUrl} className="w-full h-full object-cover" alt="" /> : stay.dog.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900">{stay.dog.name}</p>
        <p className="text-xs text-gray-500">{stay.dog.breed}</p>
        <div className="flex flex-wrap gap-2 mt-1 text-xs">
          {checkIn && (
            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
              Entrada: {format(checkIn, 'dd/MM/yyyy', { locale: ptBR })}
              {daysUntil !== null && daysUntil > 0 && ` (em ${daysUntil}d)`}
              {daysUntil !== null && daysUntil < 0 && ` (${Math.abs(daysUntil)}d atrás)`}
            </span>
          )}
          {checkOut && (
            <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full">
              Saída: {format(checkOut, 'dd/MM/yyyy', { locale: ptBR })}
              {nights !== null && ` (${nights} noite${nights !== 1 ? 's' : ''})`}
            </span>
          )}
          {stay.room && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">🏠 {stay.room}</span>}
          <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">✓ Auto: vai para agenda</span>
        </div>
        {stay.notes && <p className="text-xs text-gray-400 mt-1 truncate">{stay.notes}</p>}
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <button onClick={() => onConfirm(stay)} className="flex items-center gap-1.5 text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
          <LogIn className="w-3.5 h-3.5" /> Check-in
        </button>
        <button onClick={() => onCancel(stay)} className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 px-3 py-1.5 rounded-lg font-medium transition-colors">
          <XCircle className="w-3.5 h-3.5" /> Cancelar
        </button>
      </div>
    </div>
  )
}
