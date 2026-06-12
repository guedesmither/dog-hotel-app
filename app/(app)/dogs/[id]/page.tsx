'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Phone, Mail, LogOut, CalendarDays, ClipboardList, CheckCircle2, AlertCircle, Clock, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import { formatDateShort, formatDate, MEAL_STATUS_LABELS } from '@/lib/utils'

interface DogDetail {
  id: string
  matricula: string | null
  name: string
  breed: string
  birthDate: string | null
  color: string | null
  weight: number | null
  photoUrl: string | null
  sex: string | null
  castrated: boolean | null
  size: string | null
  temperament: string | null
  ownerName: string
  ownerPhone: string
  ownerEmail: string | null
  ownerCpf: string | null
  feedingType: string | null
  feedingInstructions: string | null
  feedingTimesPerDay: string | null
  feedingGramsPerMeal: string | null
  medications: string | null
  allergies: string | null
  preferredActivities: string | null
  allowPool: boolean | null
  allowPhotos: boolean | null
  serviceType: string | null
  scheduledDays: string | null
  monthlyStartDay: number | null
  notes: string | null
  vetName: string | null
  vetPhone: string | null
  vaccineV10Date: string | null
  vaccineV10Next: string | null
  vaccineRabiesDate: string | null
  vaccineRabiesNext: string | null
  vaccineFluDate: string | null
  vaccineFluNext: string | null
  vaccineGiardiaDate: string | null
  vaccineGiardiaNext: string | null
  giardiaExamNotes: string | null
  vaccineCardUrl: string | null
  isActive: boolean
  stays: Array<{ id: string; active: boolean; room: string | null; checkIn: string; checkOut: string | null }>
  reports: Array<{
    id: string
    date: string
    breakfastStatus: string
    lunchStatus: string
    dinnerStatus: string
    mood: string | null
    generalNotes: string | null
    sentToWhatsApp: boolean
    activities: Array<{ name: string; participated: boolean }>
    photos: Array<{ url: string }>
    author: { name: string }
  }>
}

export default function DogProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || ''
  const [dog, setDog] = useState<DogDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [cycleStats, setCycleStats] = useState<{
    cycleStart: string; cycleEnd: string; cycleLabel: string
    presentDays: number; absentDays: number; upcomingDays: number
    totalExpected: number; totalRosterDays: number
    replacements: Array<{ absentDate: string; status: string; scheduledDate: string | null }>
  } | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/dogs/${params.id}`)
      if (!res.ok) { router.push('/dogs'); return }
      const data = await res.json()
      setDog(data)
      setLoading(false)
    }
    load()
  }, [params.id, router])

  useEffect(() => {
    fetch(`/api/dogs/${params.id}/cycle-stats`)
      .then(r => {
        if (!r.ok) throw new Error(`cycle-stats ${r.status}`)
        return r.json()
      })
      .then(setCycleStats)
      .catch(err => console.error('[cycle-stats]', err))
  }, [params.id])

  async function handleDelete() {
    if (!confirm(`Tem certeza que deseja excluir o cadastro de ${dog?.name}? Esta ação não pode ser desfeita.`)) return
    try {
      const res = await fetch(`/api/dogs/${params.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Cadastro excluído')
      router.push('/dogs')
    } catch {
      toast.error('Erro ao excluir cadastro')
    }
  }

  async function handleCheckout(stayId: string) {
    if (!confirm('Confirmar check-out?')) return
    setCheckingOut(true)
    try {
      await fetch('/api/stays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stayId }),
      })
      toast.success('Check-out realizado!')
      const res = await fetch(`/api/dogs/${params.id}`)
      setDog(await res.json())
    } catch {
      toast.error('Erro ao fazer check-out')
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-4xl animate-bounce">🐾</div>
      </div>
    )
  }

  if (!dog) return null

  const activeStay = dog.stays.find((s) => s.active)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/alimentacao" className="p-2 rounded-lg hover:bg-amber-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">{dog.name}</h1>
        {(role === 'ADMIN' || role === 'MANAGER') && (
          <Link href={`/dogs/${dog.id}/edit`} className="btn-secondary flex items-center gap-2 text-sm">
            <Edit className="w-4 h-4" />
            Editar
          </Link>
        )}
        {role === 'ADMIN' && (
          <button onClick={handleDelete} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 card">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center text-4xl shrink-0 overflow-hidden">
              {dog.photoUrl ? (
                <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover rounded-2xl" />
              ) : '🐶'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">{dog.name}</h2>
                {dog.matricula && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white">{dog.matricula}</span>
                )}
              </div>
              <p className="text-gray-600">{dog.breed}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {dog.color && <span className="badge bg-amber-100 text-amber-700">{dog.color}</span>}
                {dog.weight && <span className="badge bg-gray-100 text-gray-600">{dog.weight} kg</span>}
                {dog.size && <span className="badge bg-purple-50 text-purple-600">{dog.size}</span>}
                {dog.sex && <span className="badge bg-pink-50 text-pink-600">{dog.sex}</span>}
                {dog.castrated !== null && (
                  <span className="badge bg-blue-50 text-blue-600">{dog.castrated ? 'Castrado' : 'Não castrado'}</span>
                )}
                {dog.temperament && <span className="badge bg-orange-50 text-orange-600">{dog.temperament}</span>}
                {dog.birthDate && <span className="badge bg-blue-50 text-blue-600">{formatDateShort(dog.birthDate)}</span>}
                {dog.serviceType && <span className="badge bg-indigo-50 text-indigo-600">{dog.serviceType}</span>}
                {activeStay ? (
                  <span className="badge bg-green-100 text-green-700">✓ Hospedado</span>
                ) : (
                  <span className="badge bg-gray-100 text-gray-500">Fora</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-2 text-sm">Tutor</h3>
          <p className="font-medium text-gray-900">{dog.ownerName}</p>
          <a href={`https://wa.me/${dog.ownerPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-green-600 hover:underline text-sm mt-1">
            <Phone className="w-3.5 h-3.5" />
            {dog.ownerPhone}
          </a>
          {dog.ownerEmail && (
            <a href={`mailto:${dog.ownerEmail}`} className="flex items-center gap-1.5 text-blue-600 hover:underline text-sm mt-1">
              <Mail className="w-3.5 h-3.5" />
              {dog.ownerEmail}
            </a>
          )}
          {dog.ownerCpf && <p className="text-xs text-gray-400 mt-1.5">CPF: {dog.ownerCpf}</p>}
        </div>
      </div>

      {/* Estatísticas de ciclo - ocultas para monitores */}
      {cycleStats && cycleStats.totalRosterDays > 0 && role !== 'MONITOR' && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 text-sm">📅 {cycleStats.cycleLabel}</h3>
            <span className="text-xs text-gray-400">{formatDate(cycleStats.cycleStart)} — {formatDate(cycleStats.cycleEnd)}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-green-50 rounded-lg p-2">
              <p className="text-xl font-bold text-green-700">{cycleStats.presentDays}</p>
              <p className="text-xs text-green-600">Presente</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <p className="text-xl font-bold text-red-600">{cycleStats.absentDays}</p>
              <p className="text-xs text-red-500">Faltou</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-2">
              <p className="text-xl font-bold text-amber-600">{cycleStats.upcomingDays}</p>
              <p className="text-xs text-amber-500">A vir</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="text-xl font-bold text-blue-600">{cycleStats.replacements.length}</p>
              <p className="text-xs text-blue-500">Repos.</p>
            </div>
          </div>
          {cycleStats.totalExpected > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Comparecimento</span>
                <span>{cycleStats.presentDays}/{cycleStats.totalExpected} dias</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.round((cycleStats.presentDays / cycleStats.totalExpected) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeStay && (
        <div className="card mb-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-700">Estadia Ativa</span>
                {activeStay.room && <span className="badge bg-green-100 text-green-700">{activeStay.room}</span>}
              </div>
              <p className="text-sm text-green-600 mt-0.5">Check-in: {formatDate(activeStay.checkIn.split('T')[0])}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/dogs/${dog.id}/report`} className="btn-primary text-sm">
                📝 Relatório de Hoje
              </Link>
              {(role === 'ADMIN' || role === 'MANAGER') && (
                <button onClick={() => handleCheckout(activeStay.id)} disabled={checkingOut} className="btn-danger text-sm flex items-center gap-1">
                  <LogOut className="w-3.5 h-3.5" />
                  Check-out
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {(dog.feedingType || dog.feedingInstructions || dog.feedingTimesPerDay || dog.feedingGramsPerMeal) && (
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-3">🍽️ Alimentação</h3>
            <div className="space-y-1.5 text-sm">
              {dog.feedingType && <p><span className="text-gray-400">Tipo:</span> <span className="text-gray-700 font-medium">{dog.feedingType}</span></p>}
              {dog.feedingTimesPerDay && <p><span className="text-gray-400">Frequência:</span> <span className="text-gray-700 font-medium">{dog.feedingTimesPerDay}</span></p>}
              {dog.feedingGramsPerMeal && <p><span className="text-gray-400">Qtd/refeição:</span> <span className="text-gray-700 font-medium">{dog.feedingGramsPerMeal}</span></p>}
              {dog.feedingInstructions && <p className="text-gray-600 whitespace-pre-line mt-1 border-t border-gray-100 pt-1.5">{dog.feedingInstructions}</p>}
            </div>
          </div>
        )}
        {dog.allergies && (
          <div className="card border-red-100">
            <h3 className="font-semibold text-red-700 mb-2">⚠️ Alergias</h3>
            <p className="text-sm text-red-600">{dog.allergies}</p>
          </div>
        )}
        {dog.medications && (
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-2">💊 Doenças / Medicações</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{dog.medications}</p>
          </div>
        )}
        {dog.preferredActivities && (
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-2">🎮 Brincadeiras Preferidas</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{dog.preferredActivities}</p>
          </div>
        )}
        {(dog.allowPool !== null || dog.allowPhotos !== null) && (
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-2">🛡️ Autorizações</h3>
            <div className="space-y-1 text-sm">
              {dog.allowPool !== null && (
                <p className={dog.allowPool ? 'text-green-600' : 'text-red-500'}>
                  {dog.allowPool ? '✅' : '❌'} Piscina
                </p>
              )}
              {dog.allowPhotos !== null && (
                <p className={dog.allowPhotos ? 'text-green-600' : 'text-red-500'}>
                  {dog.allowPhotos ? '✅' : '❌'} Fotos nas redes sociais
                </p>
              )}
            </div>
          </div>
        )}
        {(dog.serviceType || dog.scheduledDays) && (
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-2">🎯 Serviço</h3>
            {dog.serviceType && <p className="text-sm"><span className="text-gray-400">Tipo:</span> <span className="font-medium text-gray-700">{dog.serviceType}</span></p>}
            {dog.scheduledDays && <p className="text-sm mt-1"><span className="text-gray-400">Dias:</span> <span className="text-gray-700">{dog.scheduledDays}</span></p>}
            {/* Vencimento mensalidade - oculto para monitores */}
            {dog.monthlyStartDay && role !== 'MONITOR' && (
              <p className="text-sm mt-1">
                <span className="text-gray-400">Vencimento mensalidade:</span>{' '}
                <span className="font-medium text-amber-700">todo dia {dog.monthlyStartDay}</span>
              </p>
            )}
          </div>
        )}
        {(dog.vetName || dog.vetPhone) && (
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-2">🩺 Veterinário</h3>
            {dog.vetName && <p className="text-sm text-gray-700 font-medium">{dog.vetName}</p>}
            {dog.vetPhone && (
              <a href={`https://wa.me/${dog.vetPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline">
                {dog.vetPhone}
              </a>
            )}
          </div>
        )}
        {dog.notes && (
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-2">📋 Observações</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{dog.notes}</p>
          </div>
        )}
      </div>

      {/* Vaccines */}
      {(dog.vaccineV10Date || dog.vaccineRabiesDate || dog.vaccineFluDate || dog.vaccineGiardiaDate || dog.giardiaExamNotes || dog.vaccineCardUrl) && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">💉 Prontuário de Vacinas</h3>
            {dog.vaccineCardUrl && (
              <a href={dog.vaccineCardUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                📷 Ver carteira
              </a>
            )}
          </div>
          <div className="space-y-2">
            {([
              { label: 'V10 / V8',             date: dog.vaccineV10Date,      next: dog.vaccineV10Next },
              { label: 'Raiva',                date: dog.vaccineRabiesDate,   next: dog.vaccineRabiesNext },
              { label: 'Gripe (Parainfluenza)',date: dog.vaccineFluDate,      next: dog.vaccineFluNext },
              { label: 'Giardia',             date: dog.vaccineGiardiaDate,  next: dog.vaccineGiardiaNext },
            ] as const).map(({ label, date, next }) => {
              if (!date && !next) return null
              const today = new Date()
              const nextDate = next ? new Date(next) : null
              const daysUntil = nextDate ? Math.ceil((nextDate.getTime() - today.getTime()) / 86400000) : null
              const status = !nextDate ? 'none' : daysUntil! < 0 ? 'overdue' : daysUntil! <= 30 ? 'soon' : 'ok'
              return (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {date && <span>Aplicada: {date.split('-').reverse().join('/')}</span>}
                    {next && <span>Válida até: {next.split('-').reverse().join('/')}</span>}
                    {status === 'ok' && <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Em dia</span>}
                    {status === 'soon' && <span className="flex items-center gap-1 text-amber-600 font-medium"><Clock className="w-3.5 h-3.5" /> Vence em {daysUntil}d</span>}
                    {status === 'overdue' && <span className="flex items-center gap-1 text-red-600 font-medium"><AlertCircle className="w-3.5 h-3.5" /> Vencida</span>}
                  </div>
                </div>
              )
            })}
            {dog.giardiaExamNotes && !dog.vaccineGiardiaDate && (
              <div className="pt-2">
                <p className="text-xs text-blue-600 font-medium">🔬 Acompanhamento de exames (Giardia):</p>
                <p className="text-sm text-gray-600 mt-0.5">{dog.giardiaExamNotes}</p>
              </div>
            )}
            {dog.vaccineCardUrl && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <a href={dog.vaccineCardUrl} target="_blank" rel="noopener noreferrer">
                  <img src={dog.vaccineCardUrl} className="max-h-40 rounded-xl border border-gray-200 object-contain" alt="Carteira de vacinação" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {dog.reports.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Histórico de Relatórios
          </h3>
          <div className="space-y-2">
            {dog.reports.map((report) => (
              <Link
                key={report.id}
                href={`/dogs/${dog.id}/report?date=${report.date}`}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-amber-50 rounded-lg transition-colors"
              >
                <div>
                  <span className="font-medium text-gray-800">{formatDate(report.date)}</span>
                  <span className="text-xs text-gray-500 ml-2">por {report.author.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[report.breakfastStatus, report.lunchStatus, report.dinnerStatus].map((s, i) => (
                      <span key={i} className={`w-2 h-2 rounded-full ${s === 'ALL' ? 'bg-green-500' : s === 'PARTIAL' ? 'bg-amber-400' : s === 'REFUSED' ? 'bg-red-500' : 'bg-gray-300'}`} />
                    ))}
                  </div>
                  {report.photos.length > 0 && <span className="text-xs text-gray-500">📸 {report.photos.length}</span>}
                  {report.sentToWhatsApp && <span className="text-xs text-green-600">✓ WA</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
