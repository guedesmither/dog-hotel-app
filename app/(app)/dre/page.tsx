'use client'

import { useEffect, useState, useCallback } from 'react'
import { BarChart3, TrendingDown, Minus, ShoppingBag, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'

interface FinancialEntry {
  id: string
  type: string
  date: string
  amount: number
  account: string
  supplier?: string
  description?: string
  category: string
  period: string
}

interface SalesMonth {
  month: string
  gross: number
  net: number
  received: number
  count: number
}

const OPEX_CATEGORIES = [
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
]

const CAPEX_CATEGORIES = ['OBRA', 'INFRAESTRUTURA']

const CATEGORY_LABELS: Record<string, string> = {
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
  'APORTE NICE': 'Aporte de Capital (NICE)',
  'ADIANTAMENTO SÓCIO': 'Adiantamento de Sócio',
  'ENTRADA CAIXA': 'Entrada de Caixa',
}

function fmtMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function periodLabel(p: string) {
  if (p === 'PRE_INAUGURACAO') return 'Pré-Inauguração'
  const [y, m] = p.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[parseInt(m) - 1]}/${y}`
}

function DrillDown({ entries, colorClass }: { entries: FinancialEntry[], colorClass: string }) {
  if (!entries.length) return <div className="px-10 py-3 text-xs text-gray-400 italic">Nenhum lançamento encontrado.</div>
  return (
    <div className="border-t border-dashed border-gray-200 bg-gray-50">
      <div className={`px-10 py-1.5 grid grid-cols-[80px_1fr_120px_80px_100px] gap-2 text-[10px] font-bold uppercase text-gray-400 border-b border-gray-200`}>
        <span>Data</span><span>Descrição / Fornecedor</span><span>Categoria</span><span>Conta</span><span className="text-right">Valor</span>
      </div>
      {entries.map(e => (
        <div key={e.id} className="px-10 py-1.5 grid grid-cols-[80px_1fr_120px_80px_100px] gap-2 text-xs border-b border-gray-100 hover:bg-white transition-colors items-center">
          <span className="text-gray-400 font-mono">{fmtDate(e.date)}</span>
          <span className="text-gray-700 truncate">{e.description || e.supplier || '—'}{e.supplier && e.description ? <span className="text-gray-400 ml-1">· {e.supplier}</span> : ''}</span>
          <span className="text-gray-500 text-[10px]">{e.category}</span>
          <span className="text-gray-400 font-mono text-[10px]">{e.account}</span>
          <span className={`text-right font-semibold font-mono ${colorClass}`}>{fmtMoney(e.amount)}</span>
        </div>
      ))}
    </div>
  )
}

function DreRow({
  label,
  value,
  valueLabel,
  indent = false,
  bold = false,
  colorClass = 'text-gray-700',
  bgClass = '',
  drillEntries,
  drillKey,
  openDrill,
  onToggle,
}: {
  label: React.ReactNode
  value: number
  valueLabel?: string
  indent?: boolean
  bold?: boolean
  colorClass?: string
  bgClass?: string
  drillEntries?: FinancialEntry[]
  drillKey?: string
  openDrill?: string | null
  onToggle?: (key: string) => void
}) {
  const hasDrill = !!drillEntries && !!drillKey && !!onToggle
  const isOpen = openDrill === drillKey

  return (
    <>
      <div
        className={`flex justify-between items-center ${indent ? 'px-8' : 'px-6'} py-2 ${bgClass} ${hasDrill ? 'cursor-pointer hover:brightness-95 transition-all select-none' : ''}`}
        onClick={() => hasDrill && onToggle!(drillKey!)}
      >
        <div className="flex items-center gap-1.5">
          {hasDrill && (
            isOpen
              ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          )}
          <span className={`text-sm ${bold ? 'font-bold uppercase tracking-wide' : ''} ${colorClass}`}>{label}</span>
        </div>
        <span className={`text-sm ${bold ? 'font-bold text-base' : 'font-medium'} ${colorClass}`}>
          {valueLabel ?? fmtMoney(value)}
        </span>
      </div>
      {hasDrill && isOpen && (
        <DrillDown entries={drillEntries!} colorClass={colorClass} />
      )}
    </>
  )
}

export default function DrePage() {
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [salesByMonth, setSalesByMonth] = useState<SalesMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([])  // vazio = ALL
  const [openDrill, setOpenDrill] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [finRes, salesRes] = await Promise.all([
      fetch('/api/financeiro'),
      fetch('/api/sales/analytics'),
    ])
    const finData = await finRes.json()
    const salesData = await salesRes.json()
    setEntries(Array.isArray(finData) ? finData : [])
    setSalesByMonth(Array.isArray(salesData?.byMonth) ? salesData.byMonth : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleDrill = (key: string) => setOpenDrill(prev => prev === key ? null : key)

  const togglePeriod = (p: string) => {
    setOpenDrill(null)
    setSelectedPeriods(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }
  const selectAll = () => { setSelectedPeriods([]); setOpenDrill(null) }
  const isAll = selectedPeriods.length === 0

  const finPeriods = Array.from(new Set(entries.map(e => e.period))).sort()
  const salesPeriods = salesByMonth.map(s => s.month).sort()
  const allPeriods = Array.from(new Set([...finPeriods, ...salesPeriods])).sort()
  const selectablePeriods = allPeriods.filter(p => p !== 'PRE_INAUGURACAO')

  const activePeriods = isAll ? selectablePeriods : selectedPeriods

  const filteredEntries = isAll
    ? entries.filter(e => e.period !== 'PRE_INAUGURACAO')
    : entries.filter(e => selectedPeriods.includes(e.period))

  const totalReceita = salesByMonth
    .filter(m => activePeriods.includes(m.month))
    .reduce((s, m) => s + m.net, 0)

  const byCategoryEntries: Record<string, FinancialEntry[]> = {}
  for (const e of filteredEntries) {
    if (e.type === 'S') {
      if (!byCategoryEntries[e.category]) byCategoryEntries[e.category] = []
      byCategoryEntries[e.category].push(e)
    }
  }
  const byCategory: Record<string, number> = {}
  for (const [cat, list] of Object.entries(byCategoryEntries)) {
    byCategory[cat] = list.reduce((s, e) => s + e.amount, 0)
  }

  const aporteNiceEntries = filteredEntries.filter(e => e.type === 'E' && e.category === 'APORTE NICE')
  const totalAporteNice = aporteNiceEntries.reduce((s, e) => s + e.amount, 0)
  const entradaCaixaEntries = filteredEntries.filter(e => e.type === 'E' && e.category === 'ENTRADA CAIXA')
  const totalEntradaCaixa = entradaCaixaEntries.reduce((s, e) => s + e.amount, 0)

  const totalOpex = OPEX_CATEGORIES.reduce((s, c) => s + (byCategory[c] || 0), 0)
  const totalCapex = CAPEX_CATEGORIES.reduce((s, c) => s + (byCategory[c] || 0), 0)
  const resultadoOperacional = totalReceita - totalOpex
  const resultadoLiquido = totalReceita - totalOpex - totalCapex

  const salesPeriodData = {
    net: totalReceita,
    received: salesByMonth.filter(m => activePeriods.includes(m.month)).reduce((s, m) => s + m.received, 0),
    count: salesByMonth.filter(m => activePeriods.includes(m.month)).reduce((s, m) => s + m.count, 0),
  }

  const periodRangeLabel = isAll
    ? 'Acumulado (todos os meses)'
    : selectedPeriods.length === 1
      ? periodLabel(selectedPeriods[0])
      : `${periodLabel(selectedPeriods[0])} → ${periodLabel(selectedPeriods[selectedPeriods.length - 1])} (${selectedPeriods.length} meses)`

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
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-gray-500 uppercase mr-1">Período:</span>
          <button
            onClick={selectAll}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${isAll ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Todos
          </button>
          {selectablePeriods.map(p => {
            const active = selectedPeriods.includes(p)
            return (
              <button
                key={p}
                onClick={() => togglePeriod(p)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${
                  active
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
                }`}
              >
                {periodLabel(p)}
              </button>
            )
          })}
        </div>
        {!isAll && selectedPeriods.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-emerald-700 font-medium">✓ {selectedPeriods.length} mês{selectedPeriods.length > 1 ? 'es' : ''} selecionado{selectedPeriods.length > 1 ? 's' : ''}: {selectedPeriods.map(periodLabel).join(', ')}</span>
            <button onClick={selectAll} className="text-xs text-gray-400 hover:text-red-500 underline">limpar</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <div className="text-xs font-bold text-emerald-600 uppercase mb-1 flex items-center justify-center gap-1"><ShoppingBag className="w-3.5 h-3.5" />Receita</div>
              <div className="text-lg font-bold text-emerald-700">{fmtMoney(totalReceita)}</div>
              <div className="text-xs text-emerald-500 mt-0.5">{salesPeriodData.count} venda{salesPeriodData.count !== 1 ? 's' : ''}</div>
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
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">
                DRE — {periodRangeLabel}
              </h2>
              <span className="text-xs text-gray-400 flex items-center gap-1"><ChevronRight className="w-3 h-3" /> clique nas linhas para detalhar</span>
            </div>
            <div className="divide-y divide-gray-100">

              {/* RECEITA OPERACIONAL */}
              <div className="px-6 py-3 bg-emerald-50">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-800 text-sm uppercase tracking-wide">(+) Receita Operacional Bruta</span>
                  <span className="font-bold text-emerald-800 text-base">{fmtMoney(totalReceita)}</span>
                </div>
              </div>
              <div className="px-8 py-2 flex justify-between items-center">
                <span className="text-sm text-gray-500 italic flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" />Vendas (módulo de vendas) — competência
                  <a href="/vendas" className="ml-1 text-emerald-600 hover:underline flex items-center gap-0.5 text-xs"><ExternalLink className="w-3 h-3" />ver vendas</a>
                </span>
                <span className="text-sm font-medium text-emerald-700">{fmtMoney(totalReceita)}</span>
              </div>
              <div className="px-8 py-2 flex justify-between items-center">
                <span className="text-sm text-gray-400 italic">↳ Recebido em caixa</span>
                <span className="text-sm text-gray-500">{fmtMoney(salesPeriodData.received)}</span>
              </div>

              {/* Entrada Caixa — drill */}
              {totalEntradaCaixa > 0 && (
                <DreRow
                  label={<span className="italic text-gray-400">↳ Entradas de caixa registradas (Pix clientes)</span>}
                  value={totalEntradaCaixa}
                  indent
                  colorClass="text-gray-500"
                  drillEntries={entradaCaixaEntries}
                  drillKey="ENTRADA_CAIXA"
                  openDrill={openDrill}
                  onToggle={toggleDrill}
                />
              )}

              {/* DESPESAS OPERACIONAIS */}
              <div className="px-6 py-3 bg-orange-50">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-orange-800 text-sm uppercase tracking-wide">(−) Despesas Operacionais</span>
                  <span className="font-bold text-orange-800 text-base">({fmtMoney(totalOpex)})</span>
                </div>
              </div>
              {OPEX_CATEGORIES.map(cat => {
                const val = byCategory[cat] || 0
                if (!val) return null
                return (
                  <DreRow
                    key={cat}
                    label={CATEGORY_LABELS[cat] || cat}
                    value={val}
                    valueLabel={`(${fmtMoney(val)})`}
                    indent
                    colorClass="text-orange-700"
                    drillEntries={byCategoryEntries[cat] || []}
                    drillKey={`opex_${cat}`}
                    openDrill={openDrill}
                    onToggle={toggleDrill}
                  />
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
              {CAPEX_CATEGORIES.map(cat => {
                const val = byCategory[cat] || 0
                if (!val) return null
                return (
                  <DreRow
                    key={cat}
                    label={CATEGORY_LABELS[cat] || cat}
                    value={val}
                    valueLabel={`(${fmtMoney(val)})`}
                    indent
                    colorClass="text-slate-600"
                    drillEntries={byCategoryEntries[cat] || []}
                    drillKey={`capex_${cat}`}
                    openDrill={openDrill}
                    onToggle={toggleDrill}
                  />
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

              {/* APORTES DE CAPITAL — informativo */}
              {totalAporteNice > 0 && (
                <>
                  <div className="px-6 py-2 bg-violet-50 border-t border-violet-200">
                    <span className="text-xs font-bold text-violet-700 uppercase">Aportes de Capital (informativo — não entra no resultado)</span>
                  </div>
                  <DreRow
                    label="Aporte de Capital (NICE)"
                    value={totalAporteNice}
                    valueLabel={`+${fmtMoney(totalAporteNice)}`}
                    indent
                    colorClass="text-violet-700"
                    bgClass="bg-violet-50/40"
                    drillEntries={aporteNiceEntries}
                    drillKey="APORTE_NICE"
                    openDrill={openDrill}
                    onToggle={toggleDrill}
                  />
                </>
              )}
            </div>
          </div>

          {/* Per-account breakdown */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="font-bold text-gray-800 text-sm">Despesas por Conta</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {['AUÊ', 'SEBÁ', 'VÊ', 'NICE'].map(acc => {
                const accEntries = filteredEntries.filter(e => e.type === 'S' && e.account === acc)
                const saidas = accEntries.reduce((s, e) => s + e.amount, 0)
                const entradas = filteredEntries.filter(e => e.type === 'E' && e.account === acc && e.category === 'APORTE NICE').reduce((s, e) => s + e.amount, 0)
                if (!saidas && !entradas) return null
                const isOpen = openDrill === `acc_${acc}`
                return (
                  <div key={acc}>
                    <div
                      className="px-6 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => saidas > 0 && toggleDrill(`acc_${acc}`)}
                    >
                      <div className="flex items-center gap-1.5">
                        {saidas > 0 && (isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />)}
                        <span className="font-bold text-gray-700 text-sm">{acc}</span>
                      </div>
                      <div className="flex gap-6 text-sm">
                        {entradas > 0 && <span className="text-violet-600 font-medium">aporte +{fmtMoney(entradas)}</span>}
                        {saidas > 0 && <span className="text-red-600 font-medium">−{fmtMoney(saidas)}</span>}
                      </div>
                    </div>
                    {isOpen && saidas > 0 && (
                      <DrillDown entries={accEntries} colorClass="text-red-600" />
                    )}
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
