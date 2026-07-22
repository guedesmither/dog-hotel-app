'use client'

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Search, Filter, X, Check, TrendingDown, TrendingUp, ReceiptText, Upload } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = [
  'OBRA',
  'INFRAESTRUTURA',
  'ALUGUEL',
  'FOLHA SALARIAL',
  'PROLABORE',
  'COMUNICAÇÃO E MARKETING',
  'CONTABILIDADE',
  'ÁGUA',
  'ENERGIA ELÉTRICA',
  'INTERNET',
  'MATERIAL LIMPEZA',
  'IMPOSTO IPTU',
  'ASSOCIAÇÃO',
  'TAXA JUNTA COMERCIAL',
  'TAXA BOMBEIROS',
  'SISTEMA CARTÃO',
  'APORTE NICE',
  'ADIANTAMENTO SÓCIO',
  'ENTRADA CAIXA',
  'OUTROS',
]

const ACCOUNTS = ['SEBÁ', 'VÊ', 'AUÊ', 'NICE']

interface FinancialEntry {
  id: string
  type: string
  date: string
  amount: number
  account: string
  supplier: string | null
  description: string | null
  category: string
  period: string
  notes: string | null
}

const EMPTY_FORM = {
  type: 'S',
  date: new Date().toISOString().split('T')[0],
  amount: '',
  account: 'AUÊ',
  supplier: '',
  description: '',
  category: 'INFRAESTRUTURA',
  notes: '',
}

function fmtDate(iso: string) {
  const d = iso.split('T')[0].split('-')
  return `${d[2]}/${d[1]}/${d[0]}`
}

function fmtMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function periodLabel(p: string) {
  if (p === 'PRE_INAUGURACAO') return 'Pré-Inauguração'
  const [y, m] = p.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[parseInt(m) - 1]}/${y}`
}

export default function LancamentosPage() {
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [search, setSearch] = useState('')
  const [seedLoading, setSeedLoading] = useState(false)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterPeriod) params.set('period', filterPeriod)
    if (filterType) params.set('type', filterType)
    const res = await fetch(`/api/financeiro?${params}`)
    const data = await res.json()
    setEntries(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [filterPeriod, filterType])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const openNew = () => {
    setEditId(null)
    setForm({ ...EMPTY_FORM })
    setShowForm(true)
  }

  const openEdit = (e: FinancialEntry) => {
    setEditId(e.id)
    setForm({
      type: e.type,
      date: e.date.split('T')[0],
      amount: String(e.amount),
      account: e.account,
      supplier: e.supplier || '',
      description: e.description || '',
      category: e.category,
      notes: e.notes || '',
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.amount || !form.date || !form.account || !form.category) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }
    setSaving(true)
    try {
      const url = editId ? `/api/financeiro/${editId}` : '/api/financeiro'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast.success(editId ? 'Lançamento atualizado!' : 'Lançamento criado!')
      setShowForm(false)
      setEditId(null)
      fetchEntries()
    } catch {
      toast.error('Erro ao salvar lançamento.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este lançamento?')) return
    await fetch(`/api/financeiro/${id}`, { method: 'DELETE' })
    toast.success('Lançamento excluído.')
    fetchEntries()
  }

  const handleSeed = async () => {
    if (!confirm('Importar todos os dados históricos? Isso só funciona se não houver registros ainda.')) return
    setSeedLoading(true)
    const res = await fetch('/api/financeiro/seed', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Erro ao importar.')
    } else {
      toast.success(`${data.imported} lançamentos importados!`)
      fetchEntries()
    }
    setSeedLoading(false)
  }

  const filtered = entries.filter(e => {
    if (filterCategory && e.category !== filterCategory) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !(e.supplier || '').toLowerCase().includes(q) &&
        !(e.description || '').toLowerCase().includes(q) &&
        !e.category.toLowerCase().includes(q) &&
        !e.account.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const totalEntradas = filtered.filter(e => e.type === 'E').reduce((s, e) => s + e.amount, 0)
  const totalSaidas = filtered.filter(e => e.type === 'S').reduce((s, e) => s + e.amount, 0)
  const saldo = totalEntradas - totalSaidas

  const periods = Array.from(new Set(entries.map(e => e.period))).sort().reverse()

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ReceiptText className="w-7 h-7 text-emerald-600" />
            Lançamentos Financeiros
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro de despesas e receitas</p>
        </div>
        <div className="flex gap-2">
          <Link href="/relatorio?section=dre" className="px-4 py-2 rounded-lg border border-emerald-600 text-emerald-700 text-sm font-medium hover:bg-emerald-50 transition-colors">
            Ver DRE
          </Link>
          <Link href="/lancamentos/importar" className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4" /> Importar Extrato
          </Link>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold uppercase mb-1">
            <TrendingUp className="w-4 h-4" /> Entradas
          </div>
          <div className="text-xl font-bold text-emerald-700">{fmtMoney(totalEntradas)}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700 text-xs font-semibold uppercase mb-1">
            <TrendingDown className="w-4 h-4" /> Saídas
          </div>
          <div className="text-xl font-bold text-red-700">{fmtMoney(totalSaidas)}</div>
        </div>
        <div className={`border rounded-xl p-4 ${saldo >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className={`flex items-center gap-2 text-xs font-semibold uppercase mb-1 ${saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            Saldo
          </div>
          <div className={`text-xl font-bold ${saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmtMoney(saldo)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Período</label>
          <select
            className="border rounded-lg px-3 py-1.5 text-sm min-w-[160px]"
            value={filterPeriod}
            onChange={e => setFilterPeriod(e.target.value)}
          >
            <option value="">Todos</option>
            {periods.map(p => (
              <option key={p} value={p}>{periodLabel(p)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo</label>
          <select
            className="border rounded-lg px-3 py-1.5 text-sm"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="E">Entradas</option>
            <option value="S">Saídas</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Categoria</label>
          <select
            className="border rounded-lg px-3 py-1.5 text-sm min-w-[200px]"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">Todas</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="border rounded-lg pl-9 pr-3 py-1.5 text-sm w-full"
              placeholder="Fornecedor, categoria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        {entries.length === 0 && (
          <button
            onClick={handleSeed}
            disabled={seedLoading}
            className="px-4 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {seedLoading ? 'Importando...' : '📥 Importar Histórico'}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Fornecedor / O quê</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Conta</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Período</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Valor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhum lançamento encontrado.</td></tr>
              ) : filtered.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(e.date)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${e.type === 'E' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {e.type === 'E' ? 'ENTRADA' : 'SAÍDA'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 font-medium">{e.category}</td>
                  <td className="px-4 py-2.5 text-gray-600">
                    <div>{e.supplier || '—'}</div>
                    {e.description && <div className="text-xs text-gray-400">{e.description}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">{e.account}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{periodLabel(e.period)}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${e.type === 'E' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {e.type === 'S' ? '− ' : '+ '}{fmtMoney(e.amount)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-right">
            {filtered.length} lançamento{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-800 text-lg">{editId ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Type */}
              <div className="flex gap-3">
                <button
                  onClick={() => setForm(f => ({ ...f, type: 'S' }))}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-colors ${form.type === 'S' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  📤 SAÍDA
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, type: 'E' }))}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-colors ${form.type === 'E' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  📥 ENTRADA
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Data *</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Valor (R$) *</label>
                  <input type="number" step="0.01" min="0" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0,00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Conta *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))}>
                    {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Categoria *</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Fornecedor / Onde</label>
                <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Leroy Merlin, ENEL..." value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Descrição / O quê</label>
                <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Material de construção, Salário..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Observações</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {form.date && (() => {
                const fd = new Date(form.date + 'T12:00:00Z')
                const per = fd < new Date('2026-02-07T12:00:00Z')
                  ? 'PRE_INAUGURACAO'
                  : `${fd.getUTCFullYear()}-${String(fd.getUTCMonth() + 1).padStart(2, '0')}`
                return <p className="text-xs text-gray-400">Período: <strong>{periodLabel(per)}</strong></p>
              })()}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                <Check className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
