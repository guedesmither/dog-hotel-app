'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { Calendar, Printer, ArrowLeft } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import PrintModal from '../PrintModal'

export default function HistoricoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="text-4xl animate-bounce">🐕</div></div>}>
      <HistoricoContent />
    </Suspense>
  )
}

interface Product {
  id: string
  name: string
  description: string | null
  category: string
  price: number
}

interface Dog {
  id: string
  name: string
  ownerName: string
  matricula: string | null
  isActive: boolean
}

interface Sale {
  id: string
  saleDate: string
  saleType: string
  basePrice: number
  discount: number | null
  finalPrice: number
  amountReceived: number | null
  paymentStatus: string
  paymentDate: string | null
  paymentMethod: string | null
  paymentFee: number
  notes: string | null
  manualBaixa: boolean
  manualBaixaDate: string | null
  serviceDate: string | null
  isExempt: boolean
  startDate: string | null
  endDate: string | null
  dog: {
    id: string
    name: string
    ownerName: string
    ownerCpf: string | null
    matricula: string | null
    photoUrl: string | null
  } | null
  items: {
    id: string
    quantity: number
    unitPrice: number
    totalPrice: number
    product: Product | null
  }[]
  packages?: {
    id: string
    totalDays: number
    remainingDays: number
    packageType: string
  }[]
  serviceStatus?: string
}

function HistoricoContent() {
  const searchParams = useSearchParams()
  const urlDogId = searchParams.get('dogId')

  const [dogs, setDogs] = useState<Dog[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7))
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDogId, setSelectedDogId] = useState<string>(urlDogId || '')
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)

  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [editAmountReceived, setEditAmountReceived] = useState<string>('')
  const [editPaymentStatus, setEditPaymentStatus] = useState<string>('PAGO')
  const [editPaymentDate, setEditPaymentDate] = useState<string>('')
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('')
  const [editSaleDate, setEditSaleDate] = useState<string>('')
  const [editServiceDate, setEditServiceDate] = useState<string>('')
  const [editStartDate, setEditStartDate] = useState<string>('')
  const [editEndDate, setEditEndDate] = useState<string>('')
  const [editDiscount, setEditDiscount] = useState<string>('')
  const [editNotes, setEditNotes] = useState<string>('')
  const [editBasePrice, setEditBasePrice] = useState<string>('')
  const [editFinalPrice, setEditFinalPrice] = useState<string>('')
  const [printSaleId, setPrintSaleId] = useState<string | undefined>(undefined)
  const [showPrintModal, setShowPrintModal] = useState(false)

  const loadDogs = async () => {
    try {
      const res = await fetch('/api/dogs')
      if (res.ok) setDogs(await res.json())
    } catch {
      toast.error('Erro ao carregar cães')
    }
  }

  const loadSales = async () => {
    try {
      const params = new URLSearchParams()
      const currentYearMonth = new Date().toISOString().slice(0, 7)
      if (startDate && endDate) {
        // date range takes priority over month
      } else if (selectedMonth) {
        params.append('yearMonth', selectedMonth)
      } else {
        params.append('yearMonth', currentYearMonth)
      }
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (statusFilter) {
        if (statusFilter.startsWith('service:')) {
          params.append('serviceStatus', statusFilter.replace('service:', ''))
        } else if (statusFilter.startsWith('type:')) {
          params.append('saleType', statusFilter.replace('type:', ''))
        } else {
          params.append('status', statusFilter)
        }
      }
      if (selectedDogId) params.append('dogId', selectedDogId)
      else if (searchTerm) params.append('search', searchTerm)

      const url = params.toString() ? `/api/sales?${params.toString()}` : '/api/sales'
      const res = await fetch(url)
      if (res.ok) {
        setSales(await res.json())
      } else {
        toast.error(`Erro ao carregar vendas: ${res.status}`)
      }
    } catch (error) {
      toast.error('Erro ao carregar vendas')
    }
  }

  useEffect(() => {
    loadDogs()
    loadSales()
  }, [selectedMonth, startDate, endDate, statusFilter, searchTerm, selectedDogId])

  useEffect(() => {
    if (urlDogId && urlDogId !== selectedDogId) {
      setSelectedDogId(urlDogId)
    }
  }, [urlDogId])

  async function deleteSale(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return
    try {
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Venda excluída com sucesso!')
        loadSales()
      } else {
        toast.error('Erro ao excluir venda')
      }
    } catch {
      toast.error('Erro ao excluir venda')
    }
  }

  async function completeSale(id: string) {
    if (!confirm('Tem certeza que deseja dar baixa manual neste serviço?')) return
    try {
      const res = await fetch(`/api/sales/${id}/complete`, { method: 'POST' })
      if (res.ok) {
        toast.success('Serviço baixado manualmente com sucesso!')
        loadSales()
      } else {
        const errorData = await res.json()
        toast.error(`Erro ao dar baixa: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      toast.error('Erro ao dar baixa no serviço')
    }
  }

  async function undoCompleteSale(id: string) {
    if (!confirm('Desfazer baixa e reabrir este serviço?')) return
    try {
      const res = await fetch(`/api/sales/${id}/complete`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Baixa desfeita — serviço reaberto!')
        loadSales()
      } else {
        const errorData = await res.json()
        toast.error(`Erro ao desfazer baixa: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      toast.error('Erro ao desfazer baixa')
    }
  }

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale)
    setEditAmountReceived((sale.amountReceived ?? '').toString())
    setEditPaymentStatus(sale.paymentStatus)
    setEditPaymentDate(sale.paymentDate ? new Date(sale.paymentDate).toISOString().split('T')[0] : '')
    setEditPaymentMethod(sale.paymentMethod || '')
    setEditSaleDate(sale.saleDate ? new Date(sale.saleDate).toISOString().split('T')[0] : '')
    setEditServiceDate(sale.serviceDate ? new Date(sale.serviceDate).toISOString().split('T')[0] : '')
    setEditStartDate(sale.startDate ? new Date(sale.startDate).toISOString().split('T')[0] : '')
    setEditEndDate(sale.endDate ? new Date(sale.endDate).toISOString().split('T')[0] : '')
    setEditDiscount((sale.discount ?? 0).toString())
    setEditNotes(sale.notes || '')
    setEditBasePrice(sale.basePrice.toString())
    setEditFinalPrice(sale.finalPrice.toString())
  }

  const updateSalePayment = async () => {
    if (!editingSale) return
    try {
      const res = await fetch(`/api/sales/${editingSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountReceived: parseFloat(editAmountReceived) || 0,
          paymentStatus: editPaymentStatus,
          paymentDate: editPaymentDate || null,
          paymentMethod: editPaymentMethod || null,
          saleDate: editSaleDate || null,
          serviceDate: editServiceDate || null,
          startDate: editStartDate || null,
          endDate: editEndDate || null,
          discount: parseFloat(editDiscount) || 0,
          notes: editNotes || null,
          basePrice: parseFloat(editBasePrice) || 0,
          finalPrice: parseFloat(editFinalPrice) || 0,
        }),
      })
      if (res.ok) {
        toast.success('Venda atualizada com sucesso!')
        setEditingSale(null)
        loadSales()
      } else {
        const errorData = await res.json()
        toast.error(`Erro ao atualizar venda: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      toast.error('Erro ao atualizar venda')
    }
  }

  function fmtDate(d: string | Date | null | undefined) {
    if (!d) return ''
    try {
      if (typeof d === 'string' && d.includes('-') && !d.includes('T')) {
        const [year, month, day] = d.split('-').map(Number)
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
      }
      const dateObj = typeof d === 'string' ? parseISO(d) : d
      if (isNaN(dateObj.getTime())) return ''
      return format(dateObj, 'dd/MM/yyyy', { locale: ptBR })
    } catch {
      return ''
    }
  }

  return (
    <div className="p-3 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <Link href="/vendas" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Voltar para Nova Venda">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 md:w-7 md:h-7" /> Histórico de Vendas
          </h1>
        </div>
        <button
          onClick={() => { setPrintSaleId(undefined); setShowPrintModal(true) }}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Printer className="w-4 h-4 text-purple-600" /> Gerar Cobrança
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="month"
              className="input text-sm"
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setStartDate(''); setEndDate('') }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="search"
                className="input text-sm w-48"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setSelectedDogId(''); setSearchDropdownOpen(true) }}
                onFocus={() => setSearchDropdownOpen(true)}
                onBlur={() => setTimeout(() => setSearchDropdownOpen(false), 150)}
                placeholder="Buscar cão/tutor..."
                autoComplete="off"
              />
              {selectedDogId && (
                <button
                  type="button"
                  onClick={() => { setSelectedDogId(''); setSearchTerm('') }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                >×</button>
              )}
              {searchDropdownOpen && !selectedDogId && (() => {
                const term = searchTerm.toLowerCase()
                const matches = dogs.filter(d =>
                  !term ||
                  d.name.toLowerCase().includes(term) ||
                  d.ownerName.toLowerCase().includes(term)
                )
                if (matches.length === 0) return null
                return (
                  <div className="absolute z-50 left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {matches.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-purple-50 flex flex-col border-b border-gray-100 last:border-0"
                        onMouseDown={() => {
                          setSearchTerm(`${d.name} (${d.ownerName})`)
                          setSelectedDogId(d.id)
                          setSearchDropdownOpen(false)
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-gray-800 text-sm">{d.name}</span>
                          {!d.isActive && <span className="text-xs px-1 py-0.5 rounded bg-gray-100 text-gray-400">inativo</span>}
                          {d.matricula && <span className="text-xs text-gray-400">#{d.matricula}</span>}
                        </div>
                        <span className="text-xs text-gray-500">{d.ownerName}</span>
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>
            <select
              className="input text-sm w-40"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <optgroup label="Pagamento">
                <option value="PAGO">✅ Pago</option>
                <option value="PENDENTE">⏳ Pendente</option>
                <option value="AGENDADO">🗓️ Agendado</option>
              </optgroup>
              <optgroup label="Serviço">
                <option value="service:AGENDADO">📌 Serviço Agendado</option>
                <option value="service:ANDAMENTO">🔄 Em Andamento</option>
                <option value="service:OK">✔️ Concluído (OK)</option>
              </optgroup>
              <optgroup label="Tipo">
                <option value="type:MENSAL">📋 Mensalidade</option>
                <option value="type:AVULSO">🎟️ Avulso</option>
                <option value="type:HOTEL">🏨 Hotel</option>
                <option value="type:PACOTE">📦 Pacote</option>
              </optgroup>
            </select>
            <input
              type="date"
              className="input text-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="De"
            />
            <span className="text-gray-500">até</span>
            <input
              type="date"
              className="input text-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Até"
            />
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter(''); setSearchTerm(''); setSelectedDogId('') }}
              className="btn-secondary text-sm px-3"
            >
              Limpar
            </button>
          </div>
        </div>
        <div className="mb-4 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-medium">Total Geral</p>
              <p className="text-lg font-bold text-gray-800">
                R$ {sales.filter(s => s.paymentStatus !== 'CANCELADO' && !s.isExempt).reduce((sum, sale) => sum + sale.finalPrice, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 font-medium">Recebido</p>
              <p className="text-lg font-bold text-green-700">
                R$ {sales.filter(s => s.paymentStatus === 'PAGO').reduce((sum, sale) => sum + (sale.amountReceived ?? 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center bg-indigo-50 rounded-lg p-3">
              <p className="text-xs text-indigo-600 font-medium">Programado (à receber)</p>
              <p className="text-lg font-bold text-indigo-700">
                R$ {sales.filter(s => s.paymentStatus === 'PROGRAMADA' || s.paymentStatus === 'AGENDADO' || (s.serviceStatus === 'AGENDADO' && s.paymentStatus !== 'PAGO')).reduce((sum, sale) => sum + sale.finalPrice, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-center bg-yellow-50 rounded-lg p-3">
              <p className="text-xs text-yellow-600 font-medium">Pendente</p>
              <p className="text-lg font-bold text-yellow-700">
                R$ {sales.filter(s => s.paymentStatus === 'PENDENTE' && s.serviceStatus !== 'AGENDADO').reduce((sum, sale) => sum + sale.finalPrice, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Data</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Itens</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 hidden md:table-cell">Valor Bruto</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 hidden md:table-cell">Desconto</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700">Valor Final</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 hidden sm:table-cell">Valor Pago</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700">Status</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                    Nenhuma venda neste período
                  </td>
                </tr>
              ) : (
                sales.map(sale => (
                  <tr key={sale.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {(() => {
                        const hasPeriod = sale.startDate && (sale.saleType === 'MENSAL' || sale.saleType === 'HOTEL' || sale.saleType === 'PACOTE')
                        if (hasPeriod) {
                          return <span title={`Venda: ${fmtDate(sale.saleDate)} · Vigência: ${fmtDate(sale.startDate)} → ${fmtDate(sale.endDate)}`}>{fmtDate(sale.startDate)}</span>
                        }
                        return fmtDate(sale.saleDate)
                      })()}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                          {sale.dog?.photoUrl
                            ? <img src={sale.dog.photoUrl} alt={sale.dog.name} className="w-full h-full object-cover" />
                            : <span className="text-lg">🐾</span>}
                        </div>
                        <div className="min-w-0">
                          {sale.dog && (
                            <Link href={`/dogs/${sale.dog.id}/resumo`} className="font-bold text-gray-900 text-sm leading-tight hover:text-purple-700 hover:underline">{sale.dog.name}</Link>
                          )}
                          {sale.dog?.ownerName && (
                            <p className="text-xs text-gray-400 mb-1">{sale.dog.ownerName}</p>
                          )}
                          <div className="space-y-0.5">
                            {sale.items.map(item => (
                              <div key={item.id} className="flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  item.product?.category === 'HOTEL' ? 'bg-blue-400' :
                                  item.product?.category === 'CRECHE' ? 'bg-teal-400' :
                                  item.product?.category === 'PACOTE' ? 'bg-purple-400' :
                                  item.product?.category === 'AVULSO' ? 'bg-orange-400' :
                                  item.product?.category === 'SERVICO' ? 'bg-green-400' : 'bg-gray-300'
                                }`} />
                                <span className="text-xs text-gray-600">{item.quantity > 1 ? `${item.quantity}x ` : ''}{item.product?.name || 'Item'}</span>
                              </div>
                            ))}
                          </div>
                          {sale.serviceStatus && (() => {
                              const st = sale.serviceStatus
                              const isXY = /^\d+\/\d+$/.test(st)
                              const colorCls = st === 'OK' ? 'bg-gray-100 text-gray-500'
                                : (st === 'ANDAMENTO' || isXY) ? 'bg-amber-50 text-amber-700'
                                : st === 'AGENDADO' ? 'bg-blue-50 text-blue-700'
                                : 'bg-purple-50 text-purple-700'
                              const label = isXY ? `EM ANDAMENTO (${st})` : st
                              return <span className={`inline-block text-xs font-semibold mt-1 px-1.5 py-0.5 rounded ${colorCls}`}>{label}</span>
                            })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-800 hidden md:table-cell">
                      R$ {sale.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-red-600 hidden md:table-cell">
                      {sale.discount && sale.discount > 0 ? `R$ ${sale.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-800">
                      R$ {sale.finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-green-600 hidden sm:table-cell">
                      R$ {(sale.amountReceived ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {sale.isExempt && (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                            ISENTO
                          </span>
                        )}
                        {(() => {
                          const isPago = sale.paymentStatus === 'PAGO'
                          const isServiceDone = sale.serviceStatus === 'OK' || sale.manualBaixa
                          const isScheduled = sale.paymentStatus === 'AGENDADO' || sale.paymentStatus === 'PROGRAMADA'
                          const effectiveStatus = isPago ? 'PAGO'
                            : (isServiceDone && isScheduled) ? 'PENDENTE'
                            : isScheduled ? 'AGENDADO'
                            : 'PENDENTE'
                          const colorClass = effectiveStatus === 'PAGO' ? 'bg-green-100 text-green-700'
                            : effectiveStatus === 'AGENDADO' ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-yellow-100 text-yellow-700'
                          return (
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                              {effectiveStatus}
                            </span>
                          )
                        })()}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {sale.manualBaixa ? (
                          <button
                            onClick={() => undoCompleteSale(sale.id)}
                            className="text-amber-500 hover:text-amber-700 text-xs font-medium"
                            title="Desfazer baixa manual"
                          >
                            Reabrir
                          </button>
                        ) : (
                          <button
                            onClick={() => completeSale(sale.id)}
                            className="text-green-500 hover:text-green-700 text-xs font-medium"
                          >
                            Baixar
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(sale)}
                          className="text-blue-500 hover:text-blue-700 text-xs"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => { setPrintSaleId(sale.id); setShowPrintModal(true) }}
                          className="text-gray-400 hover:text-gray-600"
                          title="Imprimir recibo / demonstrativo"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSale(sale.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Modal */}
      {showPrintModal && (
        <PrintModal
          sales={sales}
          initialSaleId={printSaleId}
          onClose={() => { setShowPrintModal(false); setPrintSaleId(undefined) }}
        />
      )}

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Editar Pagamento - {editingSale.dog?.name} <span className="text-xs font-normal text-gray-400">#{editingSale.id.slice(-6)}</span></h3>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <label className="label">Valor em Conta</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={editAmountReceived}
                  onChange={(e) => setEditAmountReceived(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={editPaymentStatus}
                  onChange={(e) => setEditPaymentStatus(e.target.value)}
                >
                  <option value="PAGO">PAGO</option>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="PROGRAMADA">PROGRAMADA</option>
                </select>
              </div>
              <div>
                <label className="label">Método de Pagamento</label>
                <input
                  type="text"
                  className="input"
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  placeholder="PIX, Crédito, etc."
                />
              </div>
              <div>
                <label className="label">Data da Venda</label>
                <input
                  type="date"
                  className="input"
                  value={editSaleDate}
                  onChange={(e) => setEditSaleDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Data do Pagamento</label>
                <input
                  type="date"
                  className="input"
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                />
              </div>

              {(() => {
                const cats = editingSale.items.map(i => i.product?.category || '')
                const isBanho = cats.includes('SERVICO') || cats.includes('BANHO')
                const isAvulso = cats.includes('AVULSO') || editingSale.saleType === 'AVULSO'
                const isCreche = cats.includes('CRECHE') && !editingSale.startDate
                if (!isBanho && !isAvulso && !isCreche) return null
                return (
                <div className="space-y-3 pt-3 border-t border-green-200">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">📅 Dia de Execução</p>
                  <div>
                    <input
                      type="date"
                      className="input"
                      value={editServiceDate}
                      onChange={(e) => setEditServiceDate(e.target.value)}
                    />
                  </div>
                </div>
                )
              })()}

              {(() => {
                const cats = editingSale.items.map(i => i.product?.category || '')
                const isHotel = cats.includes('HOTEL') || editingSale.saleType === 'HOTEL'
                const isCreche = cats.includes('CRECHE') || editingSale.saleType === 'MENSAL'
                const isPacote = cats.includes('PACOTE') || editingSale.saleType === 'PACOTE'
                if (!isHotel && !isCreche && !isPacote) return null
                const label = isHotel ? '🏨 Período da Estadia' : isCreche ? '📅 Vigência da Mensalidade' : '📦 Vigência do Pacote'
                return (
                <div className="space-y-3 pt-3 border-t border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{label}</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="label">Início</label>
                      <input
                        type="date"
                        className="input"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="label">Fim</label>
                      <input
                        type="date"
                        className="input"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        min={editStartDate}
                      />
                    </div>
                  </div>
                </div>
                )
              })()}

              <div className="space-y-3 pt-3 border-t border-gray-200">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="label">Valor Bruto</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={editBasePrice}
                      onChange={(e) => setEditBasePrice(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="label">Desconto</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Valor Final</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={editFinalPrice}
                    onChange={(e) => setEditFinalPrice(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <label className="label">Notas</label>
                <textarea
                  className="input"
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Observações da venda..."
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={updateSalePayment}
                  className="btn-primary flex-1"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditingSale(null)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
