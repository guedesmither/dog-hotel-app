'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { History, Search, ChevronDown, ChevronUp, Images } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getTodayString, MEAL_STATUS_COLORS, MOOD_EMOJIS } from '@/lib/utils'

interface Photo { id: string; url: string; caption: string | null }
interface Activity { name: string; participated: boolean }
interface Report {
  id: string
  date: string
  breakfastStatus: string
  lunchStatus: string
  dinnerStatus: string
  mood: string | null
  generalNotes: string | null
  sentToWhatsApp: boolean
  activities: Activity[]
  photos: Photo[]
  dog: { id: string; name: string; breed: string; photoUrl: string | null; ownerName: string }
  author: { name: string }
}

function groupByDate(reports: Report[]): Record<string, Report[]> {
  return reports.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = []
    acc[r.date].push(r)
    return acc
  }, {} as Record<string, Report[]>)
}

const MEAL_DOT: Record<string, string> = {
  PENDING: 'bg-gray-300', ALL: 'bg-green-500', PARTIAL: 'bg-amber-400', REFUSED: 'bg-red-500',
}

export default function HistoricoPage() {
  const { data: session } = useSession()
  const sessionUser = session?.user as { role?: string; tutorDogId?: string } | undefined
  const isTutor = sessionUser?.role === 'TUTOR'
  const tutorDogId = sessionUser?.tutorDogId

  const today = getTodayString()
  const threeMonthsAgo = subMonths(new Date(), 3).toISOString().split('T')[0]

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(today)
  const [search, setSearch] = useState('')
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})
  const [lightbox, setLightbox] = useState<{ url: string; caption: string | null } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const dogParam = isTutor && tutorDogId ? `&dogId=${tutorDogId}` : ''
    const res = await fetch(`/api/reports?dateFrom=${dateFrom}&dateTo=${dateTo}${dogParam}`)
    const data: Report[] = await res.json()
    setReports(data)
    // expand first date by default
    if (data.length > 0) {
      const firstDate = data[0].date
      setExpandedDates({ [firstDate]: true })
    }
    setLoading(false)
  }, [dateFrom, dateTo, isTutor, tutorDogId])

  useEffect(() => { load() }, [load])

  const filtered = search
    ? reports.filter(r =>
        r.dog.name.toLowerCase().includes(search.toLowerCase()) ||
        r.dog.ownerName.toLowerCase().includes(search.toLowerCase())
      )
    : reports

  const grouped = groupByDate(filtered)
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function toggleDate(date: string) {
    setExpandedDates(p => ({ ...p, [date]: !p[date] }))
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-6 h-6 text-amber-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Operações</h1>
          <p className="text-sm text-gray-500">Consulta dos últimos 3 meses com fotos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">De</label>
            <input type="date" className="input" min={threeMonthsAgo} max={dateTo}
              value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Até</label>
            <input type="date" className="input" min={dateFrom} max={today}
              value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          {!isTutor && (
          <div>
            <label className="label">Buscar cão</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input pl-9" placeholder="Nome ou tutor..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
          <span>{filtered.length} relatório{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</span>
          <span>{dates.length} dia{dates.length !== 1 ? 's' : ''} com atividade</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16"><div className="text-4xl animate-bounce">📋</div></div>
      ) : dates.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-gray-600 font-medium">Nenhum relatório encontrado</p>
          <p className="text-gray-400 text-sm mt-1">Ajuste o filtro de datas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dates.map(date => {
            const dayReports = grouped[date]
            const isOpen = !!expandedDates[date]
            const totalPhotos = dayReports.reduce((s, r) => s + r.photos.length, 0)

            return (
              <div key={date} className="card overflow-hidden">
                {/* Date header */}
                <button
                  onClick={() => toggleDate(date)}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, #4D2075, #7B4FA6)' }}>
                      {format(new Date(date + 'T12:00:00'), 'dd')}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 capitalize">
                        {format(new Date(date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {dayReports.length} cão(ões) · {totalPhotos} foto{totalPhotos !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {totalPhotos > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        <Images className="w-3 h-3" /> {totalPhotos}
                      </span>
                    )}
                    {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>

                {/* Reports */}
                {isOpen && (
                  <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                    {dayReports.map(report => (
                      <ReportCard key={report.id} report={report} onPhotoClick={setLightbox} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption || ''} className="w-full rounded-2xl shadow-2xl" />
            {lightbox.caption && <p className="text-white text-center mt-3 text-sm">{lightbox.caption}</p>}
            <button onClick={() => setLightbox(null)} className="block mx-auto mt-4 text-white/70 hover:text-white text-sm">✕ Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ReportCard({ report, onPhotoClick }: {
  report: Report
  onPhotoClick: (p: { url: string; caption: string | null }) => void
}) {
  return (
    <div className="flex gap-3 p-3 bg-gray-50 rounded-xl hover:bg-amber-50/40 transition-colors">
      {/* Avatar */}
      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center font-bold text-amber-700 shrink-0 overflow-hidden">
        {report.dog.photoUrl
          ? <img src={report.dog.photoUrl} className="w-full h-full object-cover" alt="" />
          : report.dog.name[0]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/dogs/${report.dog.id}/report?date=${report.date}`}
              className="font-semibold text-gray-900 hover:text-amber-700 transition-colors">
              {report.dog.name}
            </Link>
            <p className="text-xs text-gray-500">{report.dog.breed} · {report.author.name}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            {[report.breakfastStatus, report.lunchStatus, report.dinnerStatus].map((s, i) => (
              <span key={i} className={`w-2.5 h-2.5 rounded-full ${MEAL_DOT[s] || 'bg-gray-300'}`} title={s} />
            ))}
            {report.mood && <span className="ml-1 text-sm">{MOOD_EMOJIS[report.mood] || ''}</span>}
          </div>
        </div>

        {report.generalNotes && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{report.generalNotes}</p>
        )}

        {/* Fotos */}
        {report.photos.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {report.photos.map(photo => (
              <button
                key={photo.id}
                onClick={() => onPhotoClick(photo)}
                className="w-16 h-16 rounded-lg overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-transform"
              >
                <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {report.activities.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            Atividades: {report.activities.filter(a => a.participated).length}/{report.activities.length} participou
          </p>
        )}
      </div>
    </div>
  )
}
