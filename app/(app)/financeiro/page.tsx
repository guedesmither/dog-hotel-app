'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { RefreshCw, DollarSign, TrendingUp, Users, Calendar, Save, Edit2, Pencil, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface PriceEntry {
  id: string
  yearMonth: string
  frequencyDays: number
  isHalfDay: boolean
  monthlyPrice: number
  dailyPrice?: number
}

interface DogFinancial {
  dog: {
    id: string
    name: string
    ownerName: string
    matricula: string | null
    enrollmentDate: string | null
    frequencyDays: number | null
    isHalfDay: boolean
    scheduledDays: string | null
  }
  pricing: {
    basePrice: number           // Preço de tabela
    agreedPrice: number | null  // Valor acordado
    discountPercent: number
    discountAmount: number
    finalPrice: number
    dailyRate: number
  }
  monthStats: {
    daysScheduled: number
    daysPresent: number
    extraDays: number
  }
}

interface FinancialData {
  yearMonth: string
  dogs: DogFinancial[]
  totals: {
    totalDogs: number
    totalBaseValue: number
    totalDiscounts: number
    totalFinalValue: number
  }
}

const FREQUENCY_LABELS: Record<number, string> = {
  1: '1 dia/semana',
  2: '2 dias/semana',
  3: '3 dias/semana',
  4: '4 dias/semana',
  5: '5 dias/semana',
  6: '6 dias/semana',
}

export default function FinanceiroPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'prices' | 'dogs'>('overview')
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [prices, setPrices] = useState<PriceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceForm, setPriceForm] = useState({ frequencyDays: 2, monthlyPrice: 0, isHalfDay: false })
  
  // Inline editing for agreed price
  const [editingDogId, setEditingDogId] = useState<string | null>(null)
  const [editAgreedPrice, setEditAgreedPrice] = useState<string>('')

  const loadFinancial = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/financial?yearMonth=${selectedMonth}`)
      if (res.ok) setFinancialData(await res.json())
    } catch { toast.error('Erro ao carregar dados financeiros') }
  }, [selectedMonth])

  const loadPrices = useCallback(async () => {
    try {
      const res = await fetch(`/api/prices?yearMonth=${selectedMonth}`)
      if (res.ok) setPrices(await res.json())
    } catch { toast.error('Erro ao carregar tabela de preços') }
    finally { setLoading(false) }
  }, [selectedMonth])

  useEffect(() => {
    loadFinancial()
    loadPrices()
  }, [loadFinancial, loadPrices])

  async function savePrice() {
    try {
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yearMonth: selectedMonth,
          frequencyDays: priceForm.frequencyDays,
          monthlyPrice: priceForm.monthlyPrice,
          isHalfDay: priceForm.isHalfDay,
        }),
      })
      if (res.ok) {
        toast.success('Preço salvo!')
        setEditingPrice(null)
        loadPrices()
      } else {
        toast.error('Erro ao salvar')
      }
    } catch {
      toast.error('Erro ao salvar')
    }
  }

  async function saveDogAgreedPrice(dogId: string) {
    try {
      const price = parseFloat(editAgreedPrice)
      if (isNaN(price) || price < 0) {
        toast.error('Preço inválido')
        return
      }
      
      const res = await fetch(`/api/dogs/${dogId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreedPrice: price }),
      })
      
      if (res.ok) {
        toast.success('Preço acordado atualizado!')
        setEditingDogId(null)
        loadFinancial() // Reload to see updated discount
      } else {
        toast.error('Erro ao atualizar')
      }
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  function startEditingDog(dog: DogFinancial) {
    setEditingDogId(dog.dog.id)
    setEditAgreedPrice(dog.pricing.agreedPrice?.toString() || dog.pricing.basePrice.toString())
  }

  function cancelEditDog() {
    setEditingDogId(null)
    setEditAgreedPrice('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-4xl animate-bounce">💰</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Financeiro</h1>
          <p className="text-sm text-gray-500">Gestão de valores e faturamento</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input text-sm"
          />
          <button onClick={() => { loadFinancial(); loadPrices(); }} className="btn-secondary flex items-center gap-2 shrink-0">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
        {[
          { key: 'overview', label: 'Visão Geral', icon: TrendingUp },
          { key: 'prices', label: 'Tabela de Preços', icon: DollarSign },
          { key: 'dogs', label: 'Cães', icon: Users },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.key ? 'bg-white shadow-sm text-amber-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && financialData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card text-center py-6">
              <p className="text-4xl font-bold text-gray-700">{financialData.totals.totalDogs}</p>
              <p className="text-xs text-gray-500 mt-1">Cães ativos</p>
            </div>
            <div className="card text-center py-6 bg-amber-50">
              <p className="text-4xl font-bold text-amber-600">
                R$ {financialData.totals.totalBaseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Valor base mensal</p>
            </div>
            <div className="card text-center py-6 bg-red-50">
              <p className="text-4xl font-bold text-red-500">
                R$ {financialData.totals.totalDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total descontos</p>
            </div>
            <div className="card text-center py-6 bg-green-50">
              <p className="text-4xl font-bold text-green-600">
                R$ {financialData.totals.totalFinalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Valor final</p>
            </div>
          </div>

          {/* Dogs Table */}
          <div className="card overflow-hidden">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" /> Detalhamento por Cão
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Cão</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Tutor</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Frequência</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Valor Base</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Desconto</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Valor Final</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Dias Presente</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {financialData.dogs.map(d => (
                    <tr key={d.dog.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3">
                        <Link href={`/dogs/${d.dog.id}/edit`} className="font-medium text-amber-700 hover:underline">
                          {d.dog.name}
                        </Link>
                        {d.dog.matricula && <span className="text-xs text-gray-400 ml-2">({d.dog.matricula})</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{d.dog.ownerName}</td>
                      <td className="px-4 py-3 text-center">
                        {d.dog.frequencyDays ? FREQUENCY_LABELS[d.dog.frequencyDays] : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        R$ {d.pricing.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-red-500">
                        {d.pricing.discountAmount > 0 && (
                          <span>
                            -R$ {d.pricing.discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            {d.pricing.discountPercent > 0 && <span className="text-xs ml-1">({Math.round(d.pricing.discountPercent * 100) / 100}%)</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        {editingDogId === d.dog.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              step="0.01"
                              value={editAgreedPrice}
                              onChange={(e) => setEditAgreedPrice(e.target.value)}
                              className="w-24 px-2 py-1 text-right text-sm border rounded"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveDogAgreedPrice(d.dog.id)
                                if (e.key === 'Escape') cancelEditDog()
                              }}
                            />
                            <button
                              onClick={() => saveDogAgreedPrice(d.dog.id)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="Salvar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditDog}
                              className="p-1 text-red-500 hover:bg-red-100 rounded"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span>R$ {d.pricing.finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <button
                              onClick={() => startEditingDog(d)}
                              className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Editar preço acordado"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          d.monthStats.daysPresent >= d.monthStats.daysScheduled 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          {d.monthStats.daysPresent}/{d.monthStats.daysScheduled}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Prices Tab */}
      {activeTab === 'prices' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> Tabela de Preços - {selectedMonth}
            </h3>
            <button
              onClick={() => {
                setEditingPrice('new')
                setPriceForm({ frequencyDays: 2, monthlyPrice: 0, isHalfDay: false })
              }}
              className="btn-primary text-sm"
            >
              + Adicionar Preço
            </button>
          </div>

          {editingPrice === 'new' && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs">Frequência (dias/semana)</label>
                  <select
                    className="select"
                    value={priceForm.frequencyDays}
                    onChange={(e) => setPriceForm(p => ({ ...p, frequencyDays: parseInt(e.target.value) }))}
                  >
                    <option value={1}>1 dia</option>
                    <option value={2}>2 dias</option>
                    <option value={3}>3 dias</option>
                    <option value={4}>4 dias</option>
                    <option value={5}>5 dias</option>
                    <option value={6}>6 dias</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Valor Mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={priceForm.monthlyPrice || ''}
                    onChange={(e) => setPriceForm(p => ({ ...p, monthlyPrice: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="label text-xs">Tipo</label>
                  <select
                    className="select"
                    value={priceForm.isHalfDay ? 'half' : 'full'}
                    onChange={(e) => setPriceForm(p => ({ ...p, isHalfDay: e.target.value === 'half' }))}
                  >
                    <option value="full">Período Integral</option>
                    <option value="half">Meio Período</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={savePrice} className="btn-primary text-sm flex items-center gap-2">
                  <Save className="w-4 h-4" /> Salvar
                </button>
                <button onClick={() => setEditingPrice(null)} className="btn-secondary text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Período Integral */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Período Integral</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map(freq => {
                const price = prices.find(p => p.frequencyDays === freq && !p.isHalfDay)
                return (
                  <div key={`full-${freq}`} className={`p-4 rounded-lg text-center ${price ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <p className="text-sm text-gray-500 mb-1">{FREQUENCY_LABELS[freq]}</p>
                    {price ? (
                      <>
                        <p className="text-2xl font-bold text-amber-700">
                          R$ {price.monthlyPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-400">/mês</p>
                      </>
                    ) : (
                      <p className="text-lg text-gray-400">-</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Meio Período */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Meio Período</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map(freq => {
                const price = prices.find(p => p.frequencyDays === freq && p.isHalfDay)
                return (
                  <div key={`half-${freq}`} className={`p-4 rounded-lg text-center ${price ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <p className="text-sm text-gray-500 mb-1">{FREQUENCY_LABELS[freq]}</p>
                    {price ? (
                      <>
                        <p className="text-2xl font-bold text-blue-700">
                          R$ {price.monthlyPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-400">/mês</p>
                      </>
                    ) : (
                      <p className="text-lg text-gray-400">-</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Dogs Tab */}
      {activeTab === 'dogs' && financialData && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Todos os Cães
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {financialData.dogs.map(d => (
              <div key={d.dog.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/dogs/${d.dog.id}/edit`} className="font-medium text-amber-700 hover:underline">
                      {d.dog.name}
                    </Link>
                    <p className="text-xs text-gray-500">{d.dog.ownerName}</p>
                  </div>
                  <span className="text-xs bg-white px-2 py-1 rounded">
                    {d.dog.frequencyDays ? FREQUENCY_LABELS[d.dog.frequencyDays] : 'Avulso'}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Valor mensal:</span>
                    <span className="font-semibold">R$ {d.pricing.finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {d.pricing.discountAmount > 0 && (
                    <p className="text-xs text-red-500 text-right">
                      Desconto: R$ {d.pricing.discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
