'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDateShort } from '@/lib/utils'

interface Change {
  id: string
  dogId: string
  status: string
  changes: string
  reviewNote: string | null
  createdAt: string
  dog: { id: string; name: string; breed: string; photoUrl: string | null }
  user: { id: string; name: string; email: string }
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome', breed: 'Raça', birthDate: 'Nascimento', color: 'Cor/Pelagem',
  weight: 'Peso', ownerName: 'Tutor', ownerPhone: 'WhatsApp', ownerEmail: 'Email',
  ownerCpf: 'CPF', sex: 'Sexo', castrated: 'Castrado', size: 'Porte', temperament: 'Temperamento',
}

export default function ChangesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const role = (session?.user as { role?: string })?.role || ''

  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (role && role !== 'ADMIN' && role !== 'MANAGER') { router.push('/dashboard'); return }
    if (role === 'ADMIN' || role === 'MANAGER') load()
  }, [role, router, tab])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/changes?status=${tab}`)
    if (res.ok) setChanges(await res.json())
    setLoading(false)
  }

  async function review(id: string, action: 'APPROVE' | 'REJECT') {
    setProcessing(id)
    try {
      const res = await fetch('/api/admin/changes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, reviewNote }),
      })
      if (!res.ok) throw new Error()
      toast.success(action === 'APPROVE' ? 'Alterações aprovadas e aplicadas!' : 'Alteração rejeitada')
      setExpanded(null)
      setReviewNote('')
      await load()
    } catch {
      toast.error('Erro ao processar')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📋 Alterações Pendentes</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === t ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t === 'PENDING' ? '⏳ Pendentes' : t === 'APPROVED' ? '✅ Aprovadas' : '❌ Rejeitadas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="text-4xl animate-bounce">🐾</div></div>
      ) : changes.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-400 text-sm">Nenhuma alteração {tab === 'PENDING' ? 'pendente' : tab === 'APPROVED' ? 'aprovada' : 'rejeitada'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {changes.map((c) => {
            const fields = JSON.parse(c.changes) as Record<string, string>
            const isOpen = expanded === c.id
            return (
              <div key={c.id} className="card">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : c.id)}>
                  {c.dog.photoUrl
                    ? <img src={c.dog.photoUrl} className="w-10 h-10 rounded-xl object-cover" alt={c.dog.name} />
                    : <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">🐶</div>}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{c.dog.name} <span className="text-gray-400 font-normal text-xs">({c.dog.breed})</span></p>
                    <p className="text-xs text-gray-500">Enviado por {c.user.name} · {formatDateShort(c.createdAt.split('T')[0])}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.status === 'PENDING' && <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3" />Pendente</span>}
                    {c.status === 'APPROVED' && <span className="badge bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Aprovada</span>}
                    {c.status === 'REJECTED' && <span className="badge bg-red-100 text-red-600 flex items-center gap-1"><XCircle className="w-3 h-3" />Rejeitada</span>}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Campos alterados</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                      {Object.entries(fields).map(([key, val]) => (
                        <div key={key} className="bg-amber-50 rounded-lg px-3 py-2">
                          <p className="text-xs text-gray-500">{FIELD_LABELS[key] || key}</p>
                          <p className="text-sm font-medium text-gray-800">{String(val) || <span className="text-gray-400 italic">vazio</span>}</p>
                        </div>
                      ))}
                    </div>

                    {c.status === 'PENDING' && (
                      <>
                        <div className="mb-3">
                          <label className="label">Observação (opcional)</label>
                          <input className="input" placeholder="Motivo da rejeição ou comentário..." value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => review(c.id, 'APPROVE')} disabled={!!processing}
                            className="btn-primary flex-1 flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            {processing === c.id ? 'Processando...' : 'Aprovar e Aplicar'}
                          </button>
                          <button onClick={() => review(c.id, 'REJECT')} disabled={!!processing}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                            <XCircle className="w-4 h-4" />
                            Rejeitar
                          </button>
                        </div>
                      </>
                    )}
                    {c.reviewNote && (
                      <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">💬 {c.reviewNote}</p>
                    )}
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
