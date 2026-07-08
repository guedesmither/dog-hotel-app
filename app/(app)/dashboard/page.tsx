'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Dog, ClipboardList, CheckCircle2, Clock, AlertCircle, UserX, UserCheck, RefreshCw, CalendarCheck, ChevronLeft, ChevronRight, LayoutGrid, List, Camera, X, Upload, BellRing, Pencil } from 'lucide-react'
import { formatDate, getTodayString, MEAL_STATUS_COLORS, MOOD_EMOJIS } from '@/lib/utils'
import { toast } from 'react-hot-toast'


interface RenewalItem {
  id: string
  dogId: string
  dog: { id: string; name: string; photoUrl: string | null; ownerName: string | null }
  endDate: string
  daysUntilExpiry: number
  isOverdue: boolean
  finalPrice: number
  basePrice: number
  discount: number
  items: Array<{ product: { id: string; name: string } | null }>
  suggestedStart: string
  suggestedEnd: string
}

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
    afternoonSnackStatus: string
    dinnerStatus: string
    mood: string | null
    sentToWhatsApp: boolean
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
  const userRole = (session?.user as { role?: string })?.role || ''
  const isMonitor = userRole === 'MONITOR'
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
  
  // Check-in modal state
  const [renewals, setRenewals] = useState<RenewalItem[]>([])
  const [selectedRenewals, setSelectedRenewals] = useState<Set<string>>(new Set())
  const [renewingLoading, setRenewingLoading] = useState(false)
  const [dismissedRenewals, setDismissedRenewals] = useState<Set<string>>(new Set())
  const [editingDates, setEditingDates] = useState<Record<string, { start: string; end: string }>>({})

  async function loadRenewals() {
    try {
      const res = await fetch('/api/sales/renewals?days=10')
      if (res.ok) setRenewals(await res.json())
    } catch {}
  }

  async function programRenewals() {
    if (selectedRenewals.size === 0) return
    setRenewingLoading(true)
    try {
      const items = Array.from(selectedRenewals).map(id => {
        const r = renewals.find(x => x.id === id)!
        return { saleId: id, start: r.suggestedStart, end: r.suggestedEnd }
      })
      const res = await fetch('/api/sales/renewals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (res.ok) {
        const { created } = await res.json()
        toast.success(`${created} mensalidade${created > 1 ? 's' : ''} programada${created > 1 ? 's' : ''}!`)
        setSelectedRenewals(new Set())
        loadRenewals()
      }
    } finally {
      setRenewingLoading(false)
    }
  }

  const [checkInModal, setCheckInModal] = useState<{ open: boolean; dogId: string; dogName: string } | null>(null)
  const [checkInNotes, setCheckInNotes] = useState('')
  const [checkInPhotos, setCheckInPhotos] = useState<Array<{ file: File; preview: string }>>([])
  const [uploadingCheckIn, setUploadingCheckIn] = useState(false)

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
      await loadDay(true)
      await loadReplacements()
    } finally {
      setTogglingAbsent(null)
    }
  }

  async function markPresent(dogId: string, dogName: string) {
    // Open check-in modal with photo option
    setCheckInModal({ open: true, dogId, dogName })
  }

  async function completeCheckIn() {
    if (!checkInModal) return
    setUploadingCheckIn(true)
    try {
      // 1. Mark present
      await fetch('/api/roster/presence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogId: checkInModal.dogId, date: today, present: true }),
      })
      
      // 2. If photos exist, upload them
      if (checkInPhotos.length > 0 || checkInNotes.trim()) {
        const formData = new FormData()
        formData.append('dogId', checkInModal.dogId)
        formData.append('date', today)
        formData.append('notes', checkInNotes)
        checkInPhotos.forEach((photo, idx) => {
          formData.append(`photo${idx}`, photo.file)
        })
        
        await fetch('/api/checkin/photos', {
          method: 'POST',
          body: formData,
        })
      }
      
      setCheckInModal(null)
      setCheckInNotes('')
      setCheckInPhotos([])
      await loadDay(true)
    } finally {
      setUploadingCheckIn(false)
    }
  }

  function handleCheckInPhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        setCheckInPhotos(prev => [...prev, { file, preview: event.target?.result as string }])
      }
      reader.readAsDataURL(file)
    })
  }

  function removeCheckInPhoto(index: number) {
    setCheckInPhotos(prev => prev.filter((_, i) => i !== index))
  }

  useEffect(() => {
    const u = session?.user as { role?: string; tutorDogId?: string } | undefined
    if (u?.role === 'TUTOR') {
      if (u.tutorDogId) router.replace(`/dogs/${u.tutorDogId}`)
      return
    }
  }, [session, router])

  const [expiredReplacements, setExpiredReplacements] = useState<ReplacementItem[]>([])
  const [expandedDogs, setExpandedDogs] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDate, setEditingDate] = useState<string>('')
  const [doneReplacements, setDoneReplacements] = useState<ReplacementItem[]>([])

  function toggleDogExpand(dogId: string) {
    setExpandedDogs(prev => {
      const next = new Set(prev)
      if (next.has(dogId)) next.delete(dogId)
      else next.add(dogId)
      return next
    })
  }

  useEffect(() => {
    fetch('/api/replacements?status=PENDING')
      .then(r => r.json()).then(setReplacements).catch(() => {})
    fetch('/api/replacements?status=SCHEDULED')
      .then(r => r.json()).then((d: ReplacementItem[]) => setReplacements(prev => [
        ...prev.filter(r => r.status !== 'SCHEDULED'), ...d
      ])).catch(() => {})
    fetch('/api/replacements?status=EXPIRED')
      .then(r => r.json()).then(setExpiredReplacements).catch(() => {})
    fetch('/api/replacements?status=DONE')
      .then(r => r.json()).then(setDoneReplacements).catch(() => {})
  }, [])

  async function loadReplacements() {
    const [p, s, e, d] = await Promise.all([
      fetch('/api/replacements?status=PENDING').then(r => r.json()),
      fetch('/api/replacements?status=SCHEDULED').then(r => r.json()),
      fetch('/api/replacements?status=EXPIRED').then(r => r.json()),
      fetch('/api/replacements?status=DONE').then(r => r.json()),
    ])
    setReplacements([...p, ...s])
    setExpiredReplacements(e)
    setDoneReplacements(d)
  }

  async function markExpired(id: string) {
    await fetch(`/api/replacements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'EXPIRED' }),
    })
    await loadReplacements()
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

  async function reactivateReplacement(id: string) {
    await fetch(`/api/replacements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PENDING', scheduledDate: null }),
    })
    await loadReplacements()
    toast.success('Reposição reativada!')
  }

  function startEditing(id: string, currentDate: string) {
    setEditingId(id)
    setEditingDate(currentDate)
  }

  async function saveEditedDate(id: string) {
    if (!editingDate) return
    setSchedulingId(id)
    try {
      await fetch(`/api/replacements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: editingDate }),
      })
      await loadReplacements()
      setEditingId(null)
      setEditingDate('')
      toast.success('Data da reposição atualizada!')
    } finally {
      setSchedulingId(null)
    }
  }

  function cancelEditing() {
    setEditingId(null)
    setEditingDate('')
  }

  async function loadDay(silent = false) {
    if (!silent) setLoading(true)
    try {
      const [dogsRes, rosterRes] = await Promise.all([
        fetch('/api/dogs?active=true'),
        fetch(`/api/roster?date=${today}`),
      ])
      const allDogs: DogWithStay[] = await dogsRes.json()
      const entries: any[] = await rosterRes.json()
      setRosterEntries(entries)
      const rosterIds = new Set(entries.map((e: any) => e.dogId || e.dog?.id))
      const todayDogs = allDogs.filter(d => rosterIds.has(d.id))
      setDogs(todayDogs)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { loadDay() }, [today])
  useEffect(() => { if (!isMonitor) loadRenewals() }, [])
  
  // Reload when window gains focus (returning from report page)
  useEffect(() => {
    const handleFocus = () => {
      loadDay(true) // silent reload
      if (!isMonitor) loadReplacements()
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [today, isMonitor])

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
            <span
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium min-w-[110px] text-center border ${
                isToday ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              {formatDate(today)}
            </span>
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
                              <div className="flex items-center gap-1.5">
                                <Link href={`/dogs/${dog.id}`} className="font-semibold text-gray-800 hover:underline">{dog.name}</Link>
                                {report && !isAbsent && (
                                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">📋</span>
                                )}
                                {report?.sentToWhatsApp && !isAbsent && (
                                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">📤</span>
                                )}
                              </div>
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
                                : <span className="text-xs text-amber-500 font-medium">⏳ Pendente</span>
                          }
                        </td>
                        <td className="px-3 py-2 text-center">
                          {report && !isAbsent ? (
                            <div className="flex gap-1 justify-center">
                              <MealDot status={report.breakfastStatus} />
                              <MealDot status={report.lunchStatus} />
                              <MealDot status={report.afternoonSnackStatus} />
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
                            {!isAbsent && present !== true && (
                              <button
                                onClick={() => markPresent(dog.id, dog.name)}
                                disabled={togglingAbsent === dog.id}
                                className="text-xs bg-green-100 text-green-700 hover:bg-green-200 py-1 px-2 rounded font-medium"
                                title="Confirmar presença"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!isAbsent && (
                              <Link href={`/dogs/${dog.id}/report`} className="text-xs bg-amber-600 hover:bg-amber-700 text-white py-1 px-2 rounded font-medium">📝</Link>
                            )}
                            <button
                              onClick={() => toggleAbsent(dog.id, isAbsent)}
                              disabled={togglingAbsent === dog.id}
                              className={`text-xs py-1 px-2 rounded font-medium ${
                                isAbsent ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                              title={isAbsent ? 'Desfazer ausência' : 'Marcar ausente'}
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
              const rosterEntry = rosterEntries.find((e: any) => (e.dogId || e.dog?.id) === dog.id)
              const present = rosterEntry?.present

              return (
                <div key={dog.id} className={`card hover:shadow-md transition-shadow ${isAbsent ? 'opacity-60 bg-gray-50' : present === true ? 'border-green-200' : ''}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                      {dog.photoUrl ? (
                        <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        '🐶'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">{dog.name}</h3>
                        {isAbsent ? (
                          <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-medium">Ausente</span>
                        ) : present === true ? (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">✓ Presente</span>
                        ) : present === false ? (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">✗ Faltou</span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded font-medium">⏳ Pendente</span>
                        )}
                        {hasReport && !isAbsent && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">📋 Relatório</span>
                        )}
                        {report?.sentToWhatsApp && !isAbsent && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">📤 WhatsApp</span>
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
                          <MealDot status={report.afternoonSnackStatus} />
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

                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 flex-wrap">
                    {!isAbsent && present !== true && (
                      <button
                        onClick={() => markPresent(dog.id, dog.name)}
                        disabled={togglingAbsent === dog.id}
                        className="flex-1 min-w-[80px] text-center text-xs bg-green-100 hover:bg-green-200 text-green-700 py-2 px-3 rounded-lg font-medium transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5 inline mr-1" /> Confirmar Presença
                      </button>
                    )}
                    {!isAbsent && (
                      <Link
                        href={`/dogs/${dog.id}/report`}
                        className={`text-center text-xs bg-amber-600 hover:bg-amber-700 text-white py-2 px-3 rounded-lg font-medium transition-colors ${present === true ? 'flex-1' : 'flex-1'}`}
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
      {/* SCHEDULED REPLACEMENTS — Quick View */}
      {!isMonitor && (() => {
        const scheduled = replacements.filter(r => r.status === 'SCHEDULED')
        if (scheduled.length === 0) return null
        // Sort by scheduledDate
        scheduled.sort((a, b) => (a.scheduledDate || '').localeCompare(b.scheduledDate || ''))
        return (
          <div className="mt-8">
            <details className="rounded-xl border-2 border-green-200 bg-green-50 overflow-hidden" open>
              <summary className="flex items-center justify-between px-4 py-3 bg-green-100 border-b border-green-200 cursor-pointer select-none">
                <h2 className="font-bold text-green-800 flex items-center gap-2 text-sm">
                  <CalendarCheck className="w-4 h-4" />
                  Reposições Agendadas
                  <span className="bg-green-200 text-green-700 text-xs px-2 py-0.5 rounded-full">{scheduled.length}</span>
                </h2>
                <span className="text-xs text-green-600">Clique para recolher</span>
              </summary>
              <div className="bg-white">
                {scheduled.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-2 border-b border-gray-100 last:border-0 hover:bg-green-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        {r.dog.photoUrl ? <img src={r.dog.photoUrl} alt={r.dog.name} className="w-full h-full object-cover" /> : '🐶'}
                      </div>
                      <Link href={`/dogs/${r.dog.id}`} className="font-semibold text-gray-800 text-sm hover:underline">{r.dog.name}</Link>
                      <span className="text-xs text-gray-500">Ausente: {formatDate(r.absentDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-green-700">📅 {formatDate(r.scheduledDate || '')}</span>
                      <button
                        onClick={() => startEditing(r.id, r.scheduledDate || '')}
                        className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-600 hover:bg-blue-200"
                        title="Editar data"
                      >
                        <Pencil className="w-3 h-3 inline" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )
      })()}

      {/* REPLACEMENTS SECTION — grouped by dog */}
      {!isMonitor && replacements.length > 0 && (() => {
        // Group by dog
        const grouped = replacements.reduce((acc, r) => {
          if (!acc[r.dog.id]) acc[r.dog.id] = { dog: r.dog, items: [] }
          acc[r.dog.id].items.push(r)
          return acc
        }, {} as Record<string, { dog: ReplacementItem['dog']; items: ReplacementItem[] }>)
        const groups = Object.values(grouped)
        // Sort: overdue first, then pending, then scheduled
        groups.sort((a, b) => {
          const score = (items: ReplacementItem[]) => {
            if (items.some(i => i.billingMonthEnd < today)) return 0
            if (items.some(i => i.status === 'PENDING')) return 1
            return 2
          }
          return score(a.items) - score(b.items)
        })
        const overdueCount = replacements.filter(r => r.billingMonthEnd < today).length
        const scheduledCount = replacements.filter(r => r.status === 'SCHEDULED').length
        const pendingCount = replacements.filter(r => r.status === 'PENDING' && r.billingMonthEnd >= today).length
        return (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-orange-500" />
                Reposições
                <span className="text-sm font-normal text-gray-400">({groups.length} {groups.length === 1 ? 'cão' : 'cães'})</span>
              </h2>
              <div className="flex gap-2 text-xs">
                {overdueCount > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{overdueCount} vencida{overdueCount > 1 ? 's' : ''}</span>}
                {pendingCount > 0 && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>}
                {scheduledCount > 0 && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{scheduledCount} agendada{scheduledCount > 1 ? 's' : ''}</span>}
              </div>
            </div>
            <div className="space-y-2">
              {groups.map(({ dog, items }) => {
                const isExpanded = expandedDogs.has(dog.id)
                const hasOverdue = items.some(i => i.billingMonthEnd < today)
                const hasScheduled = items.every(i => i.status === 'SCHEDULED')
                const pendingItems = items.filter(i => i.status === 'PENDING')
                const scheduledItems = items.filter(i => i.status === 'SCHEDULED')
                const borderClass = hasOverdue ? 'border-red-200' : hasScheduled ? 'border-green-200' : 'border-orange-200'
                const bgClass = hasOverdue ? 'bg-red-50' : hasScheduled ? 'bg-green-50' : 'bg-orange-50'
                return (
                  <div key={dog.id} className={`rounded-xl border-2 overflow-hidden ${borderClass}`}>
                    {/* Dog header — click to expand */}
                    <button
                      onClick={() => toggleDogExpand(dog.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 ${bgClass} hover:brightness-95 transition-all text-left`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg shrink-0 overflow-hidden border border-white/60">
                        {dog.photoUrl ? <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover rounded-xl" /> : '🐶'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/dogs/${dog.id}`} onClick={e => e.stopPropagation()} className="font-bold text-gray-800 text-sm hover:underline">{dog.name}</Link>
                          {hasOverdue && <span className="text-[10px] bg-red-200 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">Vencida</span>}
                          {hasScheduled && !hasOverdue && <span className="text-[10px] bg-green-200 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">Agendada</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {items.length} reposição{items.length > 1 ? 'ões' : ''}
                          {pendingItems.length > 0 && ` · ${pendingItems.length} pendente${pendingItems.length > 1 ? 's' : ''}`}
                          {scheduledItems.length > 0 && ` · ${scheduledItems.length} agendada${scheduledItems.length > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Drilldown — list of reposições */}
                    {isExpanded && (
                      <div className="divide-y divide-gray-100 bg-white">
                        {items.map((r) => {
                          const isOverdue = r.billingMonthEnd < today
                          const inputDate = schedulingDate[r.id] || ''
                          return (
                            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                    r.status === 'SCHEDULED' ? 'bg-green-100 text-green-700'
                                    : isOverdue ? 'bg-red-100 text-red-700'
                                    : 'bg-orange-100 text-orange-700'
                                  }`}>
                                    {r.status === 'SCHEDULED' ? '📅 Agendada' : isOverdue ? '🔴 Vencida' : '⏳ Pendente'}
                                  </span>
                                  <span className="text-xs text-gray-600">Ausente em <strong>{formatDate(r.absentDate)}</strong></span>
                                  <span className="text-xs text-gray-400">prazo até <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>{formatDate(r.billingMonthEnd)}</span></span>
                                </div>
                                {r.status === 'SCHEDULED' && r.scheduledDate && (
                                  <p className="text-xs text-green-700 flex items-center gap-1 mt-1">
                                    <CalendarCheck className="w-3 h-3" /> Agendada para {formatDate(r.scheduledDate)}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {r.status !== 'SCHEDULED' ? (
                                  <>
                                    <input
                                      type="date"
                                      value={inputDate}
                                      min={today}
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
                                    {isOverdue && (
                                      <button
                                        onClick={() => markExpired(r.id)}
                                        title="Marcar como perdida (exceção)"
                                        className="text-xs px-2 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                                      >
                                        Arquivar
                                      </button>
                                    )}
                                  </>
                                ) : editingId === r.id ? (
                                  <>
                                    <input
                                      type="date"
                                      value={editingDate}
                                      min={today}
                                      onChange={(e) => setEditingDate(e.target.value)}
                                      className="input text-xs py-1 px-2 w-36"
                                    />
                                    <button
                                      onClick={() => saveEditedDate(r.id)}
                                      disabled={!editingDate || schedulingId === r.id}
                                      className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40"
                                    >
                                      Salvar
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="text-xs px-2 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => markDone(r.id)}
                                      className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700"
                                    >
                                      ✓ Realizada
                                    </button>
                                    <button
                                      onClick={() => startEditing(r.id, r.scheduledDate || '')}
                                      title="Editar data da reposição"
                                      className="text-xs px-2 py-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center gap-1"
                                    >
                                      <Pencil className="w-3 h-3" /> Editar
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* DONE REPLACEMENTS - Collapsible */}
      {!isMonitor && doneReplacements.length > 0 && (() => {
        const doneGroups = Object.entries(
          doneReplacements.reduce((acc, r) => {
            const key = r.dog.id
            if (!acc[key]) acc[key] = { dog: r.dog, items: [] }
            acc[key].items.push(r)
            return acc
          }, {} as Record<string, { dog: ReplacementItem['dog']; items: ReplacementItem[] }>)
        ).sort((a, b) => a[1].dog.name.localeCompare(b[1].dog.name))
        return (
          <div className="mt-8">
            <details className="rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden">
              <summary className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200 cursor-pointer select-none">
                <h2 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Reposições Realizadas
                  <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{doneReplacements.length}</span>
                </h2>
                <span className="text-xs text-gray-400">Clique para expandir</span>
              </summary>
              <div className="divide-y divide-gray-100 bg-white">
                {doneGroups.map(([_, { dog, items }]) => (
                  <div key={dog.id} className="px-4 py-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        {dog.photoUrl ? <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover" /> : '🐶'}
                      </div>
                      <Link href={`/dogs/${dog.id}`} className="font-bold text-gray-800 text-sm hover:underline">{dog.name}</Link>
                      <span className="text-xs text-gray-400">{items.length} realizada{items.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-2 ml-11">
                      {items.map(r => (
                        <div key={r.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="text-green-600 font-medium">✓</span>
                            <span>Ausente: {formatDate(r.absentDate)}</span>
                            <span className="text-gray-300">|</span>
                            <span>Reposição: {r.scheduledDate ? formatDate(r.scheduledDate) : '—'}</span>
                          </div>
                          <button
                            onClick={() => reactivateReplacement(r.id)}
                            disabled={schedulingId === r.id}
                            className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                            title="Reativar esta reposição"
                          >
                            {schedulingId === r.id ? '...' : '↺ Reativar'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )
      })()}

      {/* RENEWALS PANEL */}
      {!isMonitor && renewals.length > 0 && (
        <div className="mt-8">
          <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-purple-100 border-b border-purple-200">
              <h2 className="font-bold text-purple-800 flex items-center gap-2 text-sm">
                <BellRing className="w-4 h-4" />
                Mensalidades a Renovar
                <span className="bg-purple-200 text-purple-700 text-xs px-2 py-0.5 rounded-full">{renewals.length}</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedRenewals(
                    selectedRenewals.size === renewals.length ? new Set() : new Set(renewals.map(r => r.id))
                  )}
                  className="text-xs text-purple-600 hover:text-purple-800 font-medium underline"
                >
                  {selectedRenewals.size === renewals.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
                <button
                  onClick={programRenewals}
                  disabled={selectedRenewals.size === 0 || renewingLoading}
                  className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 text-white font-semibold disabled:opacity-40 hover:bg-purple-700 transition-colors"
                >
                  {renewingLoading ? 'Programando...' : `Programar ${selectedRenewals.size > 0 ? `(${selectedRenewals.size})` : ''}`}
                </button>
              </div>
            </div>
            <div className="divide-y divide-purple-100">
              {renewals.filter(r => !dismissedRenewals.has(r.id)).map(r => {
                const isEditing = !!editingDates[r.id]
                const dates = editingDates[r.id] || { start: r.suggestedStart, end: r.suggestedEnd }
                return (
                  <div key={r.id} className="px-4 py-3 hover:bg-purple-50/60">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedRenewals.has(r.id)}
                        onChange={() => {
                          const s = new Set(selectedRenewals)
                          s.has(r.id) ? s.delete(r.id) : s.add(r.id)
                          setSelectedRenewals(s)
                        }}
                        className="w-4 h-4 accent-purple-600 shrink-0"
                      />
                      <div className="w-8 h-8 rounded-lg bg-white border border-purple-200 flex items-center justify-center overflow-hidden shrink-0">
                        {r.dog.photoUrl ? <img src={r.dog.photoUrl} alt={r.dog.name} className="w-full h-full object-cover" /> : '🐶'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800 text-sm">{r.dog.name}</span>
                          {r.isOverdue
                            ? <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">Vencida há {Math.abs(r.daysUntilExpiry)}d</span>
                            : <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Vence em {r.daysUntilExpiry}d</span>
                          }
                        </div>
                        <p className="text-xs text-gray-500">
                          {r.items[0]?.product?.name} · até {new Date(r.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          {' · '}R$ {r.finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {!isEditing && (
                          <p className="text-xs text-purple-600 font-medium">
                            Próximo: {new Date(dates.start + 'T12:00:00').toLocaleDateString('pt-BR')} → {new Date(dates.end + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            if (isEditing) {
                              const e = { ...editingDates }
                              delete e[r.id]
                              setEditingDates(e)
                            } else {
                              setEditingDates(prev => ({ ...prev, [r.id]: { start: r.suggestedStart, end: r.suggestedEnd } }))
                            }
                          }}
                          className="text-xs px-2 py-1 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium"
                        >
                          {isEditing ? 'Cancelar' : '✏️'}
                        </button>
                        <button
                          onClick={() => {
                            const s = new Set(dismissedRenewals)
                            s.add(r.id)
                            setDismissedRenewals(s)
                            const sel = new Set(selectedRenewals)
                            sel.delete(r.id)
                            setSelectedRenewals(sel)
                          }}
                          className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 font-medium"
                          title="Ignorar este alerta"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {isEditing && (
                      <div className="mt-2 ml-7 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">Vigência:</span>
                        <input
                          type="date"
                          value={dates.start}
                          onChange={e => setEditingDates(prev => ({ ...prev, [r.id]: { ...prev[r.id], start: e.target.value } }))}
                          className="input text-xs py-1 px-2 h-7 w-36"
                        />
                        <span className="text-xs text-gray-400">→</span>
                        <input
                          type="date"
                          value={dates.end}
                          min={dates.start}
                          onChange={e => setEditingDates(prev => ({ ...prev, [r.id]: { ...prev[r.id], end: e.target.value } }))}
                          className="input text-xs py-1 px-2 h-7 w-36"
                        />
                        <button
                          onClick={() => {
                            setRenewals(prev => prev.map(x => x.id === r.id ? { ...x, suggestedStart: dates.start, suggestedEnd: dates.end } : x))
                            const e = { ...editingDates }
                            delete e[r.id]
                            setEditingDates(e)
                          }}
                          className="text-xs px-2 py-1 rounded-lg bg-purple-600 text-white hover:bg-purple-700 font-medium"
                        >
                          Confirmar
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* EXPIRED REPLACEMENTS SECTION */}
      {expiredReplacements.length > 0 && (
        <div className="mt-6">
          <details>
            <summary className="text-sm font-semibold text-gray-400 cursor-pointer flex items-center gap-2 list-none">
              <AlertCircle className="w-4 h-4 text-gray-400" />
              Reposições Perdidas ({expiredReplacements.length})
              <span className="text-xs font-normal text-gray-400 ml-1">— clique para ver</span>
            </summary>
            <div className="space-y-2 mt-3">
              {expiredReplacements.map((r) => (
                <div key={r.id} className="card flex flex-col sm:flex-row sm:items-center gap-3 border-gray-200 bg-gray-50 opacity-70">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-lg shrink-0 overflow-hidden border border-gray-100">
                      {r.dog.photoUrl
                        ? <img src={r.dog.photoUrl} alt={r.dog.name} className="w-full h-full object-cover rounded-xl" />
                        : '🐶'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-600 text-sm">{r.dog.name}</p>
                      <p className="text-xs text-gray-400">
                        Ausente em {formatDate(r.absentDate)} · prazo era {formatDate(r.billingMonthEnd)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => markDone(r.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 shrink-0"
                  >
                    Reativar
                  </button>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* CHECK-IN MODAL */}
      {checkInModal?.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Check-in: {checkInModal.dogName}</h3>
                <button
                  onClick={() => setCheckInModal(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                Confirme a presença do cão. Fotos são opcionais — use para documentar qualquer observação importante na entrada (ex: arranhão, comportamento, etc).
              </p>

              {/* Photo Upload */}
              <div className="mb-4">
                <label className="label flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Fotos de Check-in (opcional)
                </label>
                
                {/* Photo Preview Grid */}
                {checkInPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {checkInPhotos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                        <img src={photo.preview} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeCheckInPhoto(idx)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Photo Buttons */}
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleCheckInPhotoSelect}
                      multiple
                    />
                    <span className="btn-secondary flex items-center justify-center gap-2 w-full text-xs">
                      <Camera className="w-4 h-4" /> Câmera
                    </span>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCheckInPhotoSelect}
                      multiple
                    />
                    <span className="btn-secondary flex items-center justify-center gap-2 w-full text-xs">
                      <Upload className="w-4 h-4" /> Galeria
                    </span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="label">Observações na entrada (opcional)</label>
                <textarea
                  className="input min-h-[80px] text-sm"
                  placeholder="Ex: Cão chegou com arranhão na pata esquerda, está mais quieto que o normal..."
                  value={checkInNotes}
                  onChange={(e) => setCheckInNotes(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setCheckInModal(null)}
                  className="btn-secondary flex-1"
                  disabled={uploadingCheckIn}
                >
                  Cancelar
                </button>
                <button
                  onClick={completeCheckIn}
                  disabled={uploadingCheckIn}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {uploadingCheckIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" /> Confirmar Check-in
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
