'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart3, TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface FinancialEntry {
  id: string
  type: string
  date: string
  amount: number
  account: string
  category: string
  period: string
}

// DRE structure — Brazilian standard
const DRE_STRUCTURE = [
  {
    group: 'RECEITA BRUTA',
    type: 'E',
    categories: ['APORTE SÓCIOS'],
    label: '(+) Receita Operacional Bruta',
    isTotal: false,
  },
  {
    group: 'DESPESAS OPERACIONAIS',
    type: 'S',
    categories: [
      'FOLHA SALARIAL',
      'PROLABORE',
      'ALUGUEL',
      'ÁGUA',
      'ENERGIA ELÉTRICA',
      'INTERNET',
      'CONTABILIDADE',
      'COMUNICAÇÃO E MARKETING',
      'MATERIAL LIMPEZA',
      'IMPOSTO IPTU',
      'ASSOCIAÇÃO',
      'TAXA JUNTA COMERCIAL',
      'TAXA BOMBEIROS',
      'SISTEMA CARTÃO',
      'OUTROS',
    ],
    label: '(−) Despesas Operacionais',
    isTotal: false,
  },
  {
    group: 'INVESTIMENTO / ESTRUTURA',
    type: 'S',
    categories: ['OBRA', 'INFRAESTRUTURA'],
    label: '(−) Investimentos em Estrutura',
    isTotal: false,
  },
]

const GROUP_DETAIL_LABELS: Record<string, string> = {
  'FOLHA SALARIAL': 'Folha Salarial',
  'PROLABORE': 'Pró-labore',
  'ALUGUEL': 'Aluguel',
  'ÁGUA': 'Água (SABESP)',
  'ENERGIA ELÉTRICA': 'Energia Elétrica',
  'INTERNET': 'Internet / Telefone',
  'CONTABILIDADE': 'Contabilidade',
  'COMUNICAÇÃO E MARKETING': 'Comunicação e Marketing',
  'MATERIAL LIMPEZA': 'Material de Limpeza',
  'IMPOSTO IPTU': 'IPTU',
  'ASSOCIAÇÃO': 'Associação',
  'TAXA JUNTA COMERCIAL': 'Junta Comercial / Taxas',
  'TAXA BOMBEIROS': 'Bombeiros / AVCB',
  'SISTEMA CARTÃO': 'Sistema de Cartão',
  'OUTROS': 'Outros',
  'OBRA': 'Obra / Construção',
  'INFRAESTRUTURA': 'Infraestrutura / Equipamentos',
  'APORTE SÓCIOS': 'Aporte dos Sócios',
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

export default function DrePage() {
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('ALL')

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/financeiro')
    const data = await res.json()
    setEntries(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const periods = Array.from(new Set(entries.map(e => e.period))).sort()

  const filtered = selectedPeriod === 'ALL' ? entries : entries.filter(e => e.period === selectedPeriod)

  // Compute totals per category
  const byCategory: Record<string, number> = {}
  for (const e of filtered) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
  }

  // Group totals
  const groupTotals: Record<string, number> = {}
  for (const grp of DRE_STRUCTURE) {
    groupTotals[grp.group] = grp.categories.reduce((s, c) => s + (byCategory[c] || 0), 0)
  }

  const totalReceita = groupTotals['RECEITA BRUTA'] || 0
  const totalOpex = groupTotals['DESPESAS OPERACIONAIS'] || 0
  const totalCapex = groupTotals['INVESTIMENTO / ESTRUTURA'] || 0
  const resultadoOperacional = totalReceita - totalOpex
  const resultadoLiquido = totalReceita - totalOpex - totalCapex

  // Uncategorized
  const allKnownCats = DRE_STRUCTURE.flatMap(g => g.categories)
  const uncategorized = Object.entries(byCategory).filter(([c]) => !allKnownCats.includes(c))

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            DRE — Demonstrativo de Resultado
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">AU-Ê Petcare · Inauguração: 07/02/2026</p>
        </div>
        <a href="/lancamentos" className="px-4 py-2 rounded-lg border border-emerald-600 text-emerald-700 text-sm font-medium hover:bg-emerald-50 transition-colors w-fit">
          ← Lançamentos
        </a>
      </div>

      {/* Period selector */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-gray-500 uppercase mr-1">Período:</span>
        <button
          onClick={() => setSelectedPeriod('ALL')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${selectedPeriod === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Acumulado Total
        </button>
        {periods.map(p => (
          <button
            key={p}
            onClick={() => setSelectedPeriod(p)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${selectedPeriod === p ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {periodLabel(p)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <div className="text-xs font-bold text-emerald-600 uppercase mb-1 flex items-center justify-center gap-1"><TrendingUp className="w-3.5 h-3.5" />Aportes</div>
              <div className="text-lg font-bold text-emerald-700">{fmtMoney(totalReceita)}</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
              <div className="text-xs font-bold text-orange-600 uppercase mb-1 flex items-center justify-center gap-1"><TrendingDown className="w-3.5 h-3.5" />Desp. Oper.</div>
              <div className="text-lg font-bold text-orange-700">{fmtMoney(totalOpex)}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-xs font-bold text-slate-600 uppercase mb-1 flex items-center justify-center gap-1"><TrendingDown className="w-3.5 h-3.5" />Investimento</div>
              <div className="text-lg font-bold text-slate-700">{fmtMoney(totalCapex)}</div>
            </div>
            <div className={`border rounded-xl p-4 text-center ${resultadoLiquido >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
              <div className={`text-xs font-bold uppercase mb-1 flex items-center justify-center gap-1 ${resultadoLiquido >= 0 ? 'text-blue-600' : 'text-red-600'}`}><Minus className="w-3.5 h-3.5" />Resultado</div>
              <div className={`text-lg font-bold ${resultadoLiquido >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtMoney(resultadoLiquido)}</div>
            </div>
          </div>

          {/* DRE Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="font-bold text-gray-800">
                DRE — {selectedPeriod === 'ALL' ? 'Acumulado Total' : periodLabel(selectedPeriod)}
              </h2>
            </div>
            <div className="divide-y divide-gray-100">

              {/* RECEITA */}
              <div className="px-6 py-3 bg-emerald-50">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-800 text-sm uppercase tracking-wide">Aportes / Entradas</span>
                  <span className="font-bold text-emerald-800 text-base">{fmtMoney(totalReceita)}</span>
                </div>
              </div>
              {DRE_STRUCTURE[0].categories.map(cat => (
                <div key={cat} className="px-8 py-2 flex justify-between items-center">
                  <span className="text-sm text-gray-600">{GROUP_DETAIL_LABELS[cat] || cat}</span>
                  <span className="text-sm font-medium text-emerald-700">{fmtMoney(byCategory[cat] || 0)}</span>
                </div>
              ))}

              {/* DESPESAS OPERACIONAIS */}
              <div className="px-6 py-3 bg-orange-50 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-orange-800 text-sm uppercase tracking-wide">(−) Despesas Operacionais</span>
                  <span className="font-bold text-orange-800 text-base">({fmtMoney(totalOpex)})</span>
                </div>
              </div>
              {DRE_STRUCTURE[1].categories.map(cat => {
                const val = byCategory[cat] || 0
                if (!val) return null
                return (
                  <div key={cat} className="px-8 py-2 flex justify-between items-center">
                    <span className="text-sm text-gray-600">{GROUP_DETAIL_LABELS[cat] || cat}</span>
                    <span className="text-sm font-medium text-orange-700">({fmtMoney(val)})</span>
                  </div>
                )
              })}

              {/* RESULTADO OPERACIONAL */}
              <div className={`px-6 py-3 border-t-2 border-gray-300 ${resultadoOperacional >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                <div className="flex justify-between items-center">
                  <span className={`font-bold text-sm uppercase tracking-wide ${resultadoOperacional >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                    (=) Resultado Operacional (EBITDA)
                  </span>
                  <span className={`font-bold text-base ${resultadoOperacional >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                    {fmtMoney(resultadoOperacional)}
                  </span>
                </div>
              </div>

              {/* INVESTIMENTOS */}
              <div className="px-6 py-3 bg-slate-50">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 text-sm uppercase tracking-wide">(−) Investimentos em Estrutura</span>
                  <span className="font-bold text-slate-700 text-base">({fmtMoney(totalCapex)})</span>
                </div>
              </div>
              {DRE_STRUCTURE[2].categories.map(cat => {
                const val = byCategory[cat] || 0
                if (!val) return null
                return (
                  <div key={cat} className="px-8 py-2 flex justify-between items-center">
                    <span className="text-sm text-gray-600">{GROUP_DETAIL_LABELS[cat] || cat}</span>
                    <span className="text-sm font-medium text-slate-600">({fmtMoney(val)})</span>
                  </div>
                )
              })}

              {/* RESULTADO LÍQUIDO */}
              <div className={`px-6 py-4 border-t-4 ${resultadoLiquido >= 0 ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'}`}>
                <div className="flex justify-between items-center">
                  <span className={`font-extrabold text-base uppercase tracking-wide ${resultadoLiquido >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                    (=) Resultado Líquido do Período
                  </span>
                  <span className={`font-extrabold text-xl ${resultadoLiquido >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                    {fmtMoney(resultadoLiquido)}
                  </span>
                </div>
              </div>

              {/* Uncategorized */}
              {uncategorized.length > 0 && (
                <>
                  <div className="px-6 py-2 bg-yellow-50 border-t border-yellow-200">
                    <span className="text-xs font-bold text-yellow-700 uppercase">Categorias não mapeadas na DRE</span>
                  </div>
                  {uncategorized.map(([cat, val]) => (
                    <div key={cat} className="px-8 py-2 flex justify-between items-center">
                      <span className="text-sm text-yellow-700">{cat}</span>
                      <span className="text-sm font-medium text-yellow-700">{fmtMoney(val)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Per-account breakdown */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="font-bold text-gray-800 text-sm">Saídas por Conta</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {['AUÊ', 'SEBÁ', 'VÊ', 'NICE'].map(acc => {
                const saidas = filtered.filter(e => e.type === 'S' && e.account === acc).reduce((s, e) => s + e.amount, 0)
                const entradas = filtered.filter(e => e.type === 'E' && e.account === acc).reduce((s, e) => s + e.amount, 0)
                if (!saidas && !entradas) return null
                return (
                  <div key={acc} className="px-6 py-3 flex justify-between items-center">
                    <span className="font-bold text-gray-700 text-sm">{acc}</span>
                    <div className="flex gap-6 text-sm">
                      {entradas > 0 && <span className="text-emerald-600 font-medium">+{fmtMoney(entradas)}</span>}
                      {saidas > 0 && <span className="text-red-600 font-medium">−{fmtMoney(saidas)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
