'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, DollarSign, AlertTriangle, Package, CalendarDays, Dog } from 'lucide-react'

interface DogInfo {
  id: string
  name: string
  ownerName: string
  ownerPhone: string | null
  ownerCpf: string | null
  matricula: string | null
  breed: string | null
  photoUrl: string | null
  isActive: boolean
}

interface SaleItem {
  product: { name: string; category: string } | null
  quantity: number
  unitPrice: number
}

interface Sale {
  id: string
  saleDate: string
  saleType: string
  finalPrice: number
  basePrice: number
  discount: number | null
  amountReceived: number | null
  paymentStatus: string
  paymentMethod: string | null
  isExempt: boolean
  notes: string | null
  startDate: string | null
  endDate: string | null
  serviceDate: string | null
  items: SaleItem[]
}

interface Replacement {
  id: string
  absentDate: string
  scheduledDate: string | null
  status: string
  billingMonthEnd: string
}

interface PkgItem {
  id: string
  packageType: string
  totalDays: number
  remainingDays: number
  isActive: boolean
  createdAt: string
}

interface RosterEntry {
  id: string
  date: string
  type: string
  present: boolean | null
}

interface Summary {
  dog: DogInfo
  sales: Sale[]
  replacements: Replacement[]
  packages: PkgItem[]
  rosterRecent: RosterEntry[]
  stats: {
    totalSpent: number
    totalPaid: number
    totalPending: number
    salesCount: number
    pendingReplacements: number
  }
}

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

export default function DogResumoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'vendas' | 'reposicoes' | 'pacotes' | 'presenca'>('vendas')

  useEffect(() => {
    fetch(`/api/dogs/${id}/summary`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>
  if (!data?.dog) return <div className="p-8 text-center text-red-500">Cão não encontrado.</div>

  const { dog, sales, replacements, packages, rosterRecent, stats } = data

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-3">
          {dog.photoUrl ? (
            <img src={dog.photoUrl} alt={dog.name} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center">
              <Dog className="w-7 h-7 text-purple-500" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-800">{dog.name}</h1>
            <p className="text-sm text-gray-500">{dog.ownerName}{dog.ownerPhone ? ` · ${dog.ownerPhone}` : ''}</p>
            {dog.matricula && <p className="text-xs text-gray-400">Matrícula: {dog.matricula}</p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-gray-500 mb-1">Total Gasto</p>
          <p className="font-bold text-gray-800">{fmt(stats.totalSpent)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100 shadow-sm text-center">
          <p className="text-xs text-green-600 mb-1">Total Pago</p>
          <p className="font-bold text-green-700">{fmt(stats.totalPaid)}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100 shadow-sm text-center">
          <p className="text-xs text-yellow-600 mb-1">Pendente</p>
          <p className="font-bold text-yellow-700">{fmt(stats.totalPending)}</p>
        </div>
        <div className={`rounded-xl p-4 border shadow-sm text-center ${stats.pendingReplacements > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
          <p className={`text-xs mb-1 ${stats.pendingReplacements > 0 ? 'text-red-600' : 'text-gray-500'}`}>Reposições Pend.</p>
          <p className={`font-bold ${stats.pendingReplacements > 0 ? 'text-red-700' : 'text-gray-700'}`}>{stats.pendingReplacements}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'vendas', label: `Vendas (${stats.salesCount})`, icon: <DollarSign className="w-4 h-4" /> },
          { key: 'reposicoes', label: `Reposições (${replacements.length})`, icon: <AlertTriangle className="w-4 h-4" /> },
          { key: 'pacotes', label: `Pacotes (${packages.length})`, icon: <Package className="w-4 h-4" /> },
          { key: 'presenca', label: `Presenças`, icon: <CalendarDays className="w-4 h-4" /> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab: Vendas */}
      {tab === 'vendas' && (
        <div className="space-y-3">
          {sales.length === 0 && <p className="text-gray-400 text-center py-8">Nenhuma venda encontrada.</p>}
          {sales.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-xs text-gray-400">{fmtDate(s.saleDate)}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{s.saleType}</span>
                  {s.isExempt && <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">ISENTO</span>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.paymentStatus === 'PAGO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {s.paymentStatus}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-1">
                {s.items.map((it, i) => (
                  <span key={i}>{it.product?.name ?? 'Produto'}{i < s.items.length - 1 ? ', ' : ''}</span>
                ))}
              </div>
              {(s.startDate || s.endDate || s.serviceDate) && (
                <p className="text-xs text-blue-600">
                  {s.serviceDate ? `Dia: ${fmtDate(s.serviceDate)}` : `${fmtDate(s.startDate)} → ${fmtDate(s.endDate)}`}
                </p>
              )}
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                {s.discount && s.discount > 0 ? <span>Bruto: {fmt(s.basePrice)} · Desc: {fmt(s.discount)}</span> : null}
                <span className="font-semibold text-gray-800">Final: {fmt(s.finalPrice)}</span>
                {s.amountReceived != null && <span className="text-green-700">Pago: {fmt(s.amountReceived)}</span>}
                {s.paymentMethod && <span>{s.paymentMethod}</span>}
              </div>
              {s.notes && <p className="text-xs text-gray-400 mt-1 italic">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Reposições */}
      {tab === 'reposicoes' && (
        <div className="overflow-x-auto">
          {replacements.length === 0 && <p className="text-gray-400 text-center py-8">Nenhuma reposição.</p>}
          {replacements.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600">Data Falta</th>
                  <th className="px-3 py-2 text-left text-gray-600">Mês Cobrado</th>
                  <th className="px-3 py-2 text-left text-gray-600">Reposição</th>
                  <th className="px-3 py-2 text-left text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {replacements.map(r => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{r.absentDate}</td>
                    <td className="px-3 py-2">{r.billingMonthEnd}</td>
                    <td className="px-3 py-2">{r.scheduledDate ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Pacotes */}
      {tab === 'pacotes' && (
        <div className="space-y-3">
          {packages.length === 0 && <p className="text-gray-400 text-center py-8">Nenhum pacote.</p>}
          {packages.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{p.packageType}</p>
                <p className="text-xs text-gray-400">Criado: {fmtDate(p.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-700">{p.totalDays - p.remainingDays}/{p.totalDays}</p>
                <p className="text-xs text-gray-500">dias usados</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.isActive ? 'Ativo' : 'Encerrado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Presenças */}
      {tab === 'presenca' && (
        <div className="overflow-x-auto">
          {rosterRecent.length === 0 && <p className="text-gray-400 text-center py-8">Nenhuma presença registrada.</p>}
          {rosterRecent.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600">Data</th>
                  <th className="px-3 py-2 text-left text-gray-600">Tipo</th>
                  <th className="px-3 py-2 text-center text-gray-600">Presente</th>
                </tr>
              </thead>
              <tbody>
                {rosterRecent.map(r => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2">{r.type}</td>
                    <td className="px-3 py-2 text-center">
                      {r.present == null ? '—' : r.present ? '✅' : '❌'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
