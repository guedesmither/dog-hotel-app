'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LogIn, LogOut, PlusCircle, CalendarPlus, XCircle, Camera, Heart, Package } from 'lucide-react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { formatDateShort } from '@/lib/utils'
import { format, differenceInDays, isToday, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface StayPhoto {
  id: string
  url: string
  type: string
  caption: string | null
}

interface StayItem {
  id: string
  active: boolean
  isScheduled: boolean
  room: string | null
  notes: string | null
  checkIn: string
  checkOut: string | null
  scheduledCheckIn: string | null
  scheduledCheckOut: string | null
  checkInHealthNotes: string | null
  checkInBelongings: string | null
  checkOutHealthNotes: string | null
  checkOutBelongings: string | null
  photos: StayPhoto[]
  dog: { id: string; name: string; breed: string; ownerName: string; photoUrl: string | null }
}

const EMPTY_CHECKIN = { dogId: '', room: '', notes: '', checkInHealthNotes: '', checkInBelongings: '' }
const EMPTY_CHECKOUT = { checkOutHealthNotes: '', checkOutBelongings: '' }

interface DogOption {
  id: string
  name: string
  breed: string
}

function StaysPageInner() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || ''
  const searchParams = useSearchParams()
  const preselectedDogId = searchParams.get('dogId')

  const [activeStays, setActiveStays] = useState<StayItem[]>([])
  const [scheduledStays, setScheduledStays] = useState<StayItem[]>([])
  const [allDogs, setAllDogs] = useState<DogOption[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'active' | 'scheduled'>('active')
  const [showForm, setShowForm] = useState(!!preselectedDogId)
  const [checkInForm, setCheckInForm] = useState({ ...EMPTY_CHECKIN, dogId: preselectedDogId || '' })
  const [checkoutModal, setCheckoutModal] = useState<StayItem | null>(null)
  const [checkoutForm, setCheckoutForm] = useState(EMPTY_CHECKOUT)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [pendingCheckInPhotos, setPendingCheckInPhotos] = useState<File[]>([])
  const checkInPhotoRef = useRef<HTMLInputElement>(null)
  const checkOutPhotoRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const [activeRes, scheduledRes, dogsRes] = await Promise.all([
        fetch('/api/stays?active=true'),
        fetch('/api/stays?scheduled=true'),
        fetch('/api/dogs'),
      ])
      if (activeRes.ok) setActiveStays(await activeRes.json())
      if (scheduledRes.ok) setScheduledStays(await scheduledRes.json())
      if (dogsRes.ok) setAllDogs(await dogsRes.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault()
    if (!checkInForm.dogId) { toast.error('Selecione um cão'); return }
    try {
      const res = await fetch('/api/stays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkInForm),
      })
      if (!res.ok) throw new Error()
      const newStay = await res.json()
      if (pendingCheckInPhotos.length > 0) {
        setUploadingPhoto(true)
        await Promise.all(pendingCheckInPhotos.map((file) => uploadStayPhoto(newStay.id, 'CHECKIN', file)))
        setUploadingPhoto(false)
      }
      toast.success('Check-in realizado!')
      setShowForm(false)
      setCheckInForm({ ...EMPTY_CHECKIN })
      setPendingCheckInPhotos([])
      load()
    } catch { toast.error('Erro ao fazer check-in') }
  }

  async function handleCheckOut(e: React.FormEvent) {
    e.preventDefault()
    if (!checkoutModal) return
    try {
      await fetch('/api/stays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: checkoutModal.id, ...checkoutForm }),
      })
      toast.success('Check-out realizado!')
      setCheckoutModal(null)
      setCheckoutForm(EMPTY_CHECKOUT)
      load()
    } catch { toast.error('Erro ao fazer check-out') }
  }

  async function uploadStayPhoto(stayId: string, type: 'CHECKIN' | 'CHECKOUT', file: File) {
    if (file.size > 5 * 1024 * 1024) { toast.error('Foto muito grande (máx 5MB)'); return }
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      fd.append('type', type)
      const res = await fetch(`/api/stays/${stayId}/photos`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      toast.success('Foto adicionada!')
      load()
    } catch { toast.error('Erro ao enviar foto') }
    finally { setUploadingPhoto(false) }
  }

  async function deleteStayPhoto(stayId: string, photoId: string) {
    try {
      await fetch(`/api/stays/${stayId}/photos?photoId=${photoId}`, { method: 'DELETE' })
      load()
    } catch { toast.error('Erro ao remover foto') }
  }

  async function handleConfirmScheduled(stay: StayItem) {
    if (!confirm(`Confirmar check-in de ${stay.dog.name} agora?`)) return
    try {
      await fetch('/api/stays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stay.id, action: 'confirm' }),
      })
      toast.success('Check-in realizado!')
      load()
    } catch { toast.error('Erro ao confirmar') }
  }

  async function handleCancelScheduled(stay: StayItem) {
    if (!confirm(`Cancelar agendamento de ${stay.dog.name}?`)) return
    try {
      await fetch('/api/stays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stay.id, action: 'cancel' }),
      })
      toast.success('Agendamento cancelado')
      load()
    } catch { toast.error('Erro ao cancelar') }
  }

  const canManage = role === 'ADMIN' || role === 'MANAGER'
  const dogsWithActiveStay = activeStays.map((s) => s.dog.id)
  const availableDogs = allDogs.filter((d) => !dogsWithActiveStay.includes(d.id))

  if (loading) {
    return <div className="flex items-center justify-center min-h-64"><div className="text-4xl animate-bounce">🐾</div></div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estadias</h1>
        {canManage && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <LogIn className="w-4 h-4" /> Check-in
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
        <button
          onClick={() => setTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'active' ? 'bg-white shadow-sm text-amber-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <LogIn className="w-4 h-4" />
          Ativas
          {activeStays.length > 0 && <span className="bg-green-100 text-green-700 text-xs px-1.5 rounded-full">{activeStays.length}</span>}
        </button>
        <button
          onClick={() => setTab('scheduled')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'scheduled' ? 'bg-white shadow-sm text-amber-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <CalendarPlus className="w-4 h-4" />
          Programadas
          {scheduledStays.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-1.5 rounded-full">{scheduledStays.length}</span>}
        </button>
      </div>

      {/* Check-in form */}
      {showForm && canManage && tab === 'active' && (
        <div className="card mb-6 border-amber-200 bg-amber-50/30">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <LogIn className="w-4 h-4 text-amber-600" /> Novo Check-in
          </h2>
          <form onSubmit={handleCheckIn} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Cão *</label>
                <select className="select" value={checkInForm.dogId}
                  onChange={(e) => setCheckInForm((p) => ({ ...p, dogId: e.target.value }))} required>
                  <option value="">Selecione um cão...</option>
                  {availableDogs.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.breed}</option>)}
                </select>
                {availableDogs.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Todos os cães já têm estadia ativa. <Link href="/dogs/new" className="underline">Cadastrar novo</Link></p>
                )}
              </div>
              <div>
                <label className="label">Quarto / Baia</label>
                <input className="input" placeholder="Ex: Suite 2" value={checkInForm.room}
                  onChange={(e) => setCheckInForm((p) => ({ ...p, room: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-400" /> Observações de Saúde</label>
                <textarea className="textarea" rows={3}
                  placeholder="Ferimentos, alergias visíveis, estado geral, comportamento na chegada..."
                  value={checkInForm.checkInHealthNotes}
                  onChange={(e) => setCheckInForm((p) => ({ ...p, checkInHealthNotes: e.target.value }))} />
              </div>
              <div>
                <label className="label flex items-center gap-1"><Package className="w-3.5 h-3.5 text-blue-400" /> Pertences</label>
                <textarea className="textarea" rows={3}
                  placeholder="Coleira, cama, brinquedos, ração, medicamentos, roupinha..."
                  value={checkInForm.checkInBelongings}
                  onChange={(e) => setCheckInForm((p) => ({ ...p, checkInBelongings: e.target.value }))} />
              </div>
            </div>

            {/* Photos */}
            <div>
              <label className="label flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Fotos (ferimentos, pertences, estado geral)</label>
              <input
                ref={checkInPhotoRef}
                type="file" accept="image/*" capture="environment" className="hidden" multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setPendingCheckInPhotos((prev) => [...prev, ...files])
                  if (checkInPhotoRef.current) checkInPhotoRef.current.value = ''
                }}
              />
              {pendingCheckInPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {pendingCheckInPhotos.map((file, i) => (
                    <div key={i} className="relative group">
                      <img src={URL.createObjectURL(file)} className="w-16 h-16 rounded-xl object-cover border-2 border-amber-200" alt="" />
                      <button type="button"
                        onClick={() => setPendingCheckInPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => checkInPhotoRef.current?.click()}
                className="btn-secondary text-sm flex items-center gap-2 w-full justify-center">
                <Camera className="w-4 h-4" />
                {pendingCheckInPhotos.length > 0 ? `${pendingCheckInPhotos.length} foto(s) — Adicionar mais` : 'Tirar / Adicionar Foto'}
              </button>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={uploadingPhoto} className="btn-primary flex items-center gap-2">
                <LogIn className="w-4 h-4" /> {uploadingPhoto ? 'Enviando fotos...' : 'Confirmar Check-in'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setPendingCheckInPhotos([]) }} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Active stays */}
      {tab === 'active' && (
        activeStays.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">🏠</div>
            <h3 className="font-semibold text-gray-700">Nenhum cão hospedado agora</h3>
            {canManage && (
              <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2 mt-4">
                <PlusCircle className="w-4 h-4" /> Fazer Check-in
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeStays.map((stay) => (
              <div key={stay.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center font-bold text-amber-700 shrink-0 overflow-hidden">
                      {stay.dog.photoUrl ? <img src={stay.dog.photoUrl} className="w-full h-full object-cover" alt="" /> : stay.dog.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{stay.dog.name}</h3>
                        <span className="badge bg-green-100 text-green-700">Hospedado</span>
                      </div>
                      <p className="text-sm text-gray-500">{stay.dog.breed}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Tutor: {stay.dog.ownerName}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1"><LogIn className="w-3 h-3 text-green-500" />{formatDateShort(stay.checkIn.split('T')[0])}</span>
                        {stay.room && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{stay.room}</span>}
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <button onClick={() => { setCheckoutModal(stay); setCheckoutForm(EMPTY_CHECKOUT) }}
                      className="text-xs text-red-600 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors shrink-0">
                      <LogOut className="w-3.5 h-3.5" /> Check-out
                    </button>
                  )}
                </div>
                {/* Check-in info if filled */}
                {(stay.checkInHealthNotes || stay.checkInBelongings || stay.photos.filter(p => p.type === 'CHECKIN').length > 0) && (
                  <div className="mt-2 space-y-1">
                    {stay.checkInHealthNotes && (
                      <p className="text-xs text-gray-500 flex gap-1"><Heart className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" /><span>{stay.checkInHealthNotes}</span></p>
                    )}
                    {stay.checkInBelongings && (
                      <p className="text-xs text-gray-500 flex gap-1"><Package className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" /><span>{stay.checkInBelongings}</span></p>
                    )}
                    {stay.photos.filter(p => p.type === 'CHECKIN').length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {stay.photos.filter(p => p.type === 'CHECKIN').map(ph => (
                          <img key={ph.id} src={ph.url} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  <Link href={`/dogs/${stay.dog.id}/report`} className="btn-primary text-sm flex-1 text-center block">📝 Relatório de Hoje</Link>
                  <input type="file" accept="image/*" className="hidden" ref={el => { if (el) el.dataset.stayid = stay.id }} onChange={async (e) => { if (e.target.files?.[0]) await uploadStayPhoto(stay.id, 'CHECKIN', e.target.files[0]) }} />
                  <button
                    onClick={() => { const el = document.querySelector<HTMLInputElement>(`input[data-stayid="${stay.id}"]`); el?.click() }}
                    disabled={uploadingPhoto}
                    className="text-xs border border-gray-200 text-gray-500 hover:bg-amber-50 hover:border-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                    <Camera className="w-3.5 h-3.5" /> Foto
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Scheduled stays */}
      {tab === 'scheduled' && (
        scheduledStays.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="font-semibold text-gray-700">Nenhuma estadia programada</h3>
            <Link href="/agendamentos" className="btn-primary inline-flex items-center gap-2 mt-4">
              <CalendarPlus className="w-4 h-4" /> Criar Agendamento
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scheduledStays.map((stay) => {
              const checkIn = stay.scheduledCheckIn ? new Date(stay.scheduledCheckIn) : null
              const checkOut = stay.scheduledCheckOut ? new Date(stay.scheduledCheckOut) : null
              const daysUntil = checkIn ? differenceInDays(checkIn, new Date()) : null
              const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : null
              const isOverdue = checkIn && isPast(checkIn) && !isToday(checkIn)
              const isArriving = checkIn && isToday(checkIn)

              return (
                <div key={stay.id} className={`card hover:shadow-md transition-shadow border-2 ${isOverdue ? 'border-red-200' : isArriving ? 'border-green-200' : 'border-amber-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center font-bold text-amber-700 shrink-0 overflow-hidden">
                        {stay.dog.photoUrl ? <img src={stay.dog.photoUrl} className="w-full h-full object-cover" alt="" /> : stay.dog.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900">{stay.dog.name}</h3>
                          {isOverdue && <span className="badge bg-red-100 text-red-700">Atrasado</span>}
                          {isArriving && <span className="badge bg-green-100 text-green-700">Chega hoje</span>}
                          {!isOverdue && !isArriving && <span className="badge bg-amber-100 text-amber-700">Agendado</span>}
                        </div>
                        <p className="text-sm text-gray-500">{stay.dog.breed}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5 text-xs">
                          {checkIn && (
                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <LogIn className="w-3 h-3" />
                              {format(checkIn, 'dd/MM/yyyy', { locale: ptBR })}
                              {daysUntil !== null && daysUntil > 0 && ` · em ${daysUntil}d`}
                              {daysUntil !== null && daysUntil < 0 && ` · ${Math.abs(daysUntil)}d atrás`}
                            </span>
                          )}
                          {checkOut && (
                            <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <LogOut className="w-3 h-3" />
                              {format(checkOut, 'dd/MM/yyyy', { locale: ptBR })}
                              {nights !== null && ` · ${nights}n`}
                            </span>
                          )}
                          {stay.room && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">🏠 {stay.room}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                      <button onClick={() => handleConfirmScheduled(stay)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg font-medium transition-colors">
                        <LogIn className="w-3.5 h-3.5" /> Confirmar Check-in
                      </button>
                      <button onClick={() => handleCancelScheduled(stay)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 px-3 py-2 rounded-lg font-medium transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}
      {/* Checkout modal */}
      {checkoutModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <LogOut className="w-5 h-5 text-red-500" />
                  Check-out — {checkoutModal.dog.name}
                </h2>
                <button onClick={() => setCheckoutModal(null)} className="p-2 rounded-lg hover:bg-gray-100">
                  <XCircle className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCheckOut} className="space-y-4">
                <div>
                  <label className="label flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-400" /> Estado de Saúde na Saída</label>
                  <textarea className="textarea" rows={3}
                    placeholder="Ferimentos, alergias, comportamento na saída, observações gerais..."
                    value={checkoutForm.checkOutHealthNotes}
                    onChange={(e) => setCheckoutForm(p => ({ ...p, checkOutHealthNotes: e.target.value }))} />
                </div>

                <div>
                  <label className="label flex items-center gap-1"><Package className="w-3.5 h-3.5 text-blue-400" /> Pertences Devolvidos</label>
                  <textarea className="textarea" rows={2}
                    placeholder="Coleira, cama, brinquedos, medicamentos restantes..."
                    value={checkoutForm.checkOutBelongings}
                    onChange={(e) => setCheckoutForm(p => ({ ...p, checkOutBelongings: e.target.value }))} />
                </div>

                {/* Check-in info for reference */}
                {(checkoutModal.checkInHealthNotes || checkoutModal.checkInBelongings) && (
                  <div className="p-3 bg-amber-50 rounded-xl text-xs space-y-1">
                    <p className="font-medium text-amber-700">📋 Registrado no check-in:</p>
                    {checkoutModal.checkInHealthNotes && <p className="text-gray-600">🩺 {checkoutModal.checkInHealthNotes}</p>}
                    {checkoutModal.checkInBelongings && <p className="text-gray-600">📦 {checkoutModal.checkInBelongings}</p>}
                  </div>
                )}

                {/* Photos section */}
                <div>
                  <label className="label flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Fotos de Saída</label>
                  <input
                    ref={checkOutPhotoRef}
                    type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={async (e) => { if (e.target.files?.[0]) await uploadStayPhoto(checkoutModal.id, 'CHECKOUT', e.target.files[0]) }}
                  />
                  {checkoutModal.photos.filter(p => p.type === 'CHECKOUT').length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {checkoutModal.photos.filter(p => p.type === 'CHECKOUT').map(ph => (
                        <div key={ph.id} className="relative group">
                          <img src={ph.url} className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                          <button type="button" onClick={() => deleteStayPhoto(checkoutModal.id, ph.id)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => checkOutPhotoRef.current?.click()} disabled={uploadingPhoto}
                    className="btn-secondary text-sm flex items-center gap-2 w-full justify-center">
                    <Camera className="w-4 h-4" />
                    {uploadingPhoto ? 'Enviando...' : 'Tirar / Adicionar Foto'}
                  </button>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="submit" className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <LogOut className="w-4 h-4" /> Confirmar Check-out
                  </button>
                  <button type="button" onClick={() => setCheckoutModal(null)} className="btn-secondary">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function StaysPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="text-4xl animate-bounce">🐾</div></div>}>
      <StaysPageInner />
    </Suspense>
  )
}
