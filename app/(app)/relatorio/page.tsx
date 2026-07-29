'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RefreshCw, TrendingUp, DollarSign, Users, Package, Tag, Award, BarChart2, Calendar, Building2, FileSpreadsheet, LayoutGrid } from 'lucide-react'
import toast from 'react-hot-toast'
import DiarioSection from './sections/DiarioSection'
import FrequenciaSection from './sections/FrequenciaSection'
import ExecutivoSection from './sections/ExecutivoSection'
import DreSection from './sections/DreSection'
import InvestimentoSection from './sections/InvestimentoSection'

const R$ = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })
const pct = (v: number, total: number) => total > 0 ? Math.round((v / total) * 100) : 0

interface FrequencyMonth {
  month: string
  billedRevenue: number
  payingDogDays: number
  revenuePerPayingDogDay: number
}

interface AnalyticsData {
  summary: {
    totalGross: number; totalDiscount: number; totalNet: number
    totalReceived: number; totalProgrammed: number; totalPending: number
    salesCount: number; salesWithDiscount: number; salesWithoutDiscount: number
  }
  byMonth: { month: string; gross: number; discount: number; net: number; received: number; count: number }[]
  byDay:   { date: string; gross: number; net: number; received: number; count: number }[]
  byCategory: { category: string; gross: number; net: number; discount: number; qty: number }[]
  byProduct:  { productId: string; productName: string; category: string; gross: number; net: number; qty: number }[]
  byDog: {
    dogId: string; dogName: string; ownerName: string
    totalGross: number; totalDiscount: number; totalNet: number; totalReceived: number
    salesCount: number; daysAttended: number; scheduledInPeriod: number; dailyNet: number; dailyReceived: number
  }[]
  byTutor: { ownerName: string; totalNet: number; totalReceived: number; dogs: number; salesCount: number }[]
}

const MONTH_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
function fmtMonth(m: string) {
  const [y, mo] = m.split('-')
  return `${MONTH_PT[parseInt(mo) - 1]}/${y.slice(2)}`
}
function fmtDay(d: string) {
  const [, mo, dy] = d.split('-')
  return `${dy}/${mo}`
}

type Tab = 'resumo' | 'periodo' | 'caes' | 'produtos' | 'tutores' | 'vendasPorCao'
type Section = 'financeiro' | 'diario' | 'frequencia' | 'executivo' | 'dre' | 'investimento'

function Bar({ value, max, color = 'bg-amber-400' }: { value: number; max: number; color?: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct(value, max)}%` }} />
    </div>
  )
}

// Wrap in Suspense because RelatorioContent reads the ?section= query param
export default function RelatorioPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="text-4xl animate-bounce">📊</div></div>}>
      <RelatorioContent />
    </Suspense>
  )
}

function RelatorioContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const section = (searchParams.get('section') as Section) || 'financeiro'
  const setSection = (s: Section) => router.push(s === 'financeiro' ? '/relatorio' : `/relatorio?section=${s}`, { scroll: false })

  const [tab, setTab]         = useState<Tab>('resumo')
  const [data, setData]       = useState<AnalyticsData | null>(null)
  const [frequencyMonths, setFrequencyMonths] = useState<FrequencyMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [yearMonth, setYearMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [allTime, setAllTime] = useState(false)
  const [dogSort, setDogSort] = useState<'totalNet' | 'dailyNet' | 'daysAttended'>('totalNet')
  const [periodView, setPeriodView] = useState<'month' | 'day'>('month')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = allTime ? '' : `?yearMonth=${yearMonth}`
      const [res, frequencyRes] = await Promise.all([
        fetch(`/api/sales/analytics${qs}`),
        fetch('/api/reports/frequency'),
      ])
      if (res.ok) setData(await res.json())
      else toast.error('Erro ao carregar dados')
      if (frequencyRes.ok) {
        const frequencyData = await frequencyRes.json()
        setFrequencyMonths(frequencyData.monthly || [])
      }
    } catch { toast.error('Erro ao carregar dados') }
    finally { setLoading(false) }
  }, [yearMonth, allTime])

  useEffect(() => { if (section === 'financeiro') load() }, [load, section])

  const s = data?.summary
  const frequencyMonth = frequencyMonths.find(month => month.month === (allTime ? new Date().toISOString().slice(0, 7) : yearMonth))

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'resumo',       label: 'Resumo',       icon: BarChart2 },
    { key: 'periodo',      label: 'Período',      icon: TrendingUp },
    { key: 'caes',         label: 'Cães',         icon: Award },
    { key: 'vendasPorCao', label: 'Vendas por Cão', icon: DollarSign },
    { key: 'produtos',     label: 'Produtos',     icon: Package },
    { key: 'tutores',      label: 'Tutores',      icon: Users },
  ]

  const sections: { key: Section; label: string; icon: any }[] = [
    { key: 'financeiro',  label: 'Financeiro',  icon: LayoutGrid },
    { key: 'diario',      label: 'Diário',       icon: Calendar },
    { key: 'frequencia',  label: 'Frequência',   icon: Users },
    { key: 'executivo',   label: 'Executivo',    icon: Building2 },
    { key: 'dre',         label: 'DRE',          icon: FileSpreadsheet },
    { key: 'investimento', label: 'Investimento', icon: TrendingUp },
  ]

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-5">
      {/* Page header + top-level section switcher — one place for every report */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 Relatórios</h1>
        <p className="text-sm text-gray-500">Todos os indicadores do negócio, em um único lugar</p>
      </div>

      <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-xl overflow-x-auto shadow-sm">
        {sections.map(sec => {
          const Icon = sec.icon
          return (
            <button key={sec.key} onClick={() => setSection(sec.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                section === sec.key ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'
              }`}>
              <Icon className="w-4 h-4" />{sec.label}
            </button>
          )
        })}
      </div>

      {section === 'diario' && <DiarioSection />}
      {section === 'frequencia' && <FrequenciaSection />}
      {section === 'executivo' && <ExecutivoSection />}
      {section === 'dre' && <DreSection />}
      {section === 'investimento' && <InvestimentoSection />}

      {section === 'financeiro' && (
      <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Dashboard Financeiro</h2>
          <p className="text-sm text-gray-500">Análise de vendas e receita</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={allTime} onChange={e => setAllTime(e.target.checked)} className="rounded" />
            Todo o período
          </label>
          {!allTime && (
            <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)} className="input text-sm" />
          )}
          <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-1.5 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.key ? 'bg-white shadow-sm text-amber-700' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-4xl animate-bounce">💰</div>
        </div>
      ) : !data ? null : (
        <>
          {/* ── RESUMO ─────────────────────────────────────────────────────── */}
          {tab === 'resumo' && s && (
            <div className="space-y-5">
              {/* KPI row 1 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Faturamento Bruto', value: R$(s.totalGross),     color: 'text-gray-800',   bg: 'bg-gray-50' },
                  { label: 'Descontos',         value: R$(s.totalDiscount),  color: 'text-red-600',    bg: 'bg-red-50' },
                  { label: 'Faturamento Líq.',  value: R$(s.totalNet),       color: 'text-amber-700',  bg: 'bg-amber-50' },
                  { label: 'Recebido',          value: R$(s.totalReceived),  color: 'text-green-700',  bg: 'bg-green-50' },
                  { label: 'Programado',        value: R$(s.totalProgrammed),color: 'text-indigo-700', bg: 'bg-indigo-50' },
                  { label: 'Pendente',          value: R$(s.totalPending),   color: 'text-yellow-700', bg: 'bg-yellow-50' },
                ].map(c => (
                  <div key={c.label} className={`card ${c.bg} text-center py-4`}>
                    <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
                  </div>
                ))}
              </div>

              {/* KPI row 2 — discount & count */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="card text-center py-4">
                  <p className="text-2xl font-bold text-gray-700">{s.salesCount}</p>
                  <p className="text-xs text-gray-500">Total de vendas</p>
                </div>
                <div className="card text-center py-4">
                  <p className="text-2xl font-bold text-red-500">{s.salesWithDiscount}</p>
                  <p className="text-xs text-gray-500">Vendas com desconto</p>
                </div>
                <div className="card text-center py-4">
                  <p className="text-2xl font-bold text-gray-400">{s.salesWithoutDiscount}</p>
                  <p className="text-xs text-gray-500">Sem desconto</p>
                </div>
                <div className="card text-center py-4">
                  <p className="text-2xl font-bold text-amber-600">
                    {s.totalNet > 0 ? (s.totalDiscount / s.totalGross * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-xs text-gray-500">Taxa de desconto</p>
                </div>
                <div className="card bg-teal-50 border-teal-200 text-center py-4">
                  <p className="text-2xl font-bold text-teal-700">{frequencyMonth ? R$(frequencyMonth.revenuePerPayingDogDay) : '—'}</p>
                  <p className="text-xs text-teal-700">Receita por cão-dia</p>
                  {frequencyMonth && <p className="mt-0.5 text-[10px] text-teal-600">{frequencyMonth.payingDogDays} cão-dias</p>}
                </div>
              </div>

              {/* Status breakdown bar */}
              <div className="card space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Composição do Faturamento</h3>
                {[
                  { label: 'Recebido',   value: s.totalReceived,   color: 'bg-green-500',  text: 'text-green-700' },
                  { label: 'Programado', value: s.totalProgrammed, color: 'bg-indigo-400', text: 'text-indigo-700' },
                  { label: 'Pendente',   value: s.totalPending,    color: 'bg-yellow-400', text: 'text-yellow-700' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-gray-600 shrink-0">{r.label}</span>
                    <div className="flex-1"><Bar value={r.value} max={s.totalNet} color={r.color} /></div>
                    <span className={`text-xs font-semibold w-28 text-right ${r.text}`}>{R$(r.value)}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{pct(r.value, s.totalNet)}%</span>
                  </div>
                ))}
              </div>

              {/* Top 5 dogs quick preview */}
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Award className="w-4 h-4" /> Top 5 Cães por Receita</h3>
                <div className="space-y-2">
                  {data.byDog.slice(0, 5).map((d, i) => (
                    <div key={d.dogId} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-800 truncate">{d.dogName} <span className="text-gray-400 font-normal text-xs">· {d.ownerName}</span></span>
                          <span className="text-sm font-bold text-amber-700 shrink-0">{R$(d.totalNet)}</span>
                        </div>
                        <Bar value={d.totalNet} max={data.byDog[0]?.totalNet || 1} color="bg-amber-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PERÍODO ────────────────────────────────────────────────────── */}
          {tab === 'periodo' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {(['month', 'day'] as const).map(v => (
                  <button key={v} onClick={() => setPeriodView(v)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${periodView === v ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {v === 'month' ? 'Por Mês' : 'Por Dia'}
                  </button>
                ))}
              </div>

              {periodView === 'month' && (
                <>
                {/* Growth indicator */}
                {(() => {
                  const months = data.byMonth
                  if (months.length < 2) return null
                  const current = months[months.length - 1]
                  const previous = months[months.length - 2]
                  const growth = previous.net > 0 ? ((current.net - previous.net) / previous.net) * 100 : 0
                  const isPositive = growth >= 0
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className={`card flex items-center gap-3 ${isPositive ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className={`p-3 rounded-full ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          <TrendingUp className={`w-6 h-6 ${isPositive ? '' : 'rotate-180'}`} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">vs Mês Anterior</p>
                          <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{growth.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="card bg-amber-50 border-amber-200 flex items-center gap-3">
                        <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                          <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Mês Atual</p>
                          <p className="text-2xl font-bold text-amber-700">{R$(current.net)}</p>
                        </div>
                      </div>
                      <div className="card bg-gray-50 border-gray-200 flex items-center gap-3">
                        <div className="p-3 rounded-full bg-gray-200 text-gray-600">
                          <BarChart2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Média Mensal</p>
                          <p className="text-2xl font-bold text-gray-700">
                            {R$(months.reduce((a, m) => a + m.net, 0) / months.length)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* AI Projection Card */}
                {(() => {
                  const months = data.byMonth
                  if (months.length < 3) return null
                  // Linear regression for trend
                  const n = months.length
                  const x = months.map((_, i) => i)
                  const y = months.map(m => m.net)
                  const sumX = x.reduce((a, b) => a + b, 0)
                  const sumY = y.reduce((a, b) => a + b, 0)
                  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
                  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0)
                  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
                  const intercept = (sumY - slope * sumX) / n
                  const nextMonthValue = slope * n + intercept
                  const current = months[months.length - 1]
                  const projectedGrowth = current.net > 0 ? ((nextMonthValue - current.net) / current.net) * 100 : 0
                  const confidence = Math.min(95, Math.max(60, 100 - Math.abs(slope) / (current.net || 1) * 100))
                  return (
                    <div className="card bg-indigo-50 border-indigo-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-indigo-600 font-medium">Projeção IA (Tendência)</p>
                          <p className="text-2xl font-bold text-indigo-700">
                            {R$(Math.max(0, nextMonthValue))}
                          </p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className={`text-sm font-medium ${projectedGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {projectedGrowth >= 0 ? '+' : ''}{projectedGrowth.toFixed(1)}% est.
                          </p>
                          <p className="text-xs text-gray-500">confiança: {confidence.toFixed(0)}%</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">
                        Baseado em {n} meses de histórico • Tendência {slope > 0 ? 'de crescimento' : slope < 0 ? 'de queda' : 'estável'}
                      </p>
                    </div>
                  )
                })()}

                <div className="card overflow-x-auto">
                  <h3 className="font-semibold text-gray-800 mb-4">Receita por Mês</h3>
                  {(() => {
                    const months = data.byMonth
                    if (months.length === 0) return null
                    const W = 600; const H = 160; const PAD = 8
                    const maxNet = Math.max(...months.map(x => x.net), 1)
                    const xPos = (i: number) => PAD + (i / Math.max(months.length - 1, 1)) * (W - PAD * 2)
                    const yPos = (v: number) => H - PAD - (v / maxNet) * (H - PAD * 2)
                    // Trend line (linear regression)
                    const n = months.length
                    const xs = months.map((_, i) => i)
                    const ys = months.map(m => m.net)
                    const sumX = xs.reduce((a, b) => a + b, 0)
                    const sumY = ys.reduce((a, b) => a + b, 0)
                    const sumXY = xs.reduce((acc, xi, i) => acc + xi * ys[i], 0)
                    const sumXX = xs.reduce((acc, xi) => acc + xi * xi, 0)
                    const denom = n * sumXX - sumX * sumX
                    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0
                    const intercept = (sumY - slope * sumX) / n
                    const trendY = months.map((_, i) => slope * i + intercept)
                    const netPoints = months.map((m, i) => `${xPos(i)},${yPos(m.net)}`).join(' ')
                    const receivedPoints = months.map((m, i) => `${xPos(i)},${yPos(m.received)}`).join(' ')
                    const trendPoints = trendY.map((v, i) => `${xPos(i)},${yPos(Math.max(0, v))}`).join(' ')
                    return (
                      <>
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
                          {/* Grid lines */}
                          {[0.25, 0.5, 0.75, 1].map(f => (
                            <line key={f} x1={PAD} x2={W - PAD} y1={yPos(maxNet * f)} y2={yPos(maxNet * f)}
                              stroke="#f3f4f6" strokeWidth="1" />
                          ))}
                          {/* Received area fill */}
                          <polyline points={receivedPoints} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
                          {/* Net revenue line */}
                          <polyline points={netPoints} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                          {/* Trend line */}
                          {n >= 3 && <polyline points={trendPoints} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />}
                          {/* Dots for net */}
                          {months.map((m, i) => (
                            <circle key={i} cx={xPos(i)} cy={yPos(m.net)} r="3" fill="#f59e0b" stroke="white" strokeWidth="1.5">
                              <title>{fmtMonth(m.month)}: {R$(m.net)}</title>
                            </circle>
                          ))}
                          {/* Month labels */}
                          {months.map((m, i) => (
                            <text key={i} x={xPos(i)} y={H - 1} textAnchor="middle" fontSize="9" fill="#9ca3af">{fmtMonth(m.month)}</text>
                          ))}
                        </svg>
                        <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
                          <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-amber-400 rounded" /><span className="text-xs text-gray-500">Líquido</span></div>
                          <div className="flex items-center gap-1.5"><div className="w-5 h-0.5 bg-emerald-500 rounded" /><span className="text-xs text-gray-500">Recebido</span></div>
                          {n >= 3 && <div className="flex items-center gap-1.5"><svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 3" /></svg><span className="text-xs text-gray-500">Tendência</span></div>}
                          <span className="text-xs text-gray-400">{months.length} meses</span>
                        </div>
                      </>
                    )
                  })()}
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Mês','Bruto','Desconto','Líquido','Recebido','Vendas','vs Anterior'].map(h => (
                          <th key={h} className="px-3 py-2 text-right first:text-left font-medium text-gray-600 text-xs">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.byMonth.map((m, idx) => {
                        const prevMonth = idx > 0 ? data.byMonth[idx - 1] : null
                        const growth = prevMonth && prevMonth.net > 0 ? ((m.net - prevMonth.net) / prevMonth.net) * 100 : 0
                        return (
                          <tr key={m.month} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-700">{fmtMonth(m.month)}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{R$(m.gross)}</td>
                            <td className="px-3 py-2 text-right text-red-500">{m.discount > 0 ? `-${R$(m.discount)}` : '—'}</td>
                            <td className="px-3 py-2 text-right font-semibold text-amber-700">{R$(m.net)}</td>
                            <td className="px-3 py-2 text-right text-green-600">{R$(m.received)}</td>
                            <td className="px-3 py-2 text-right text-gray-500">{m.count}</td>
                            <td className="px-3 py-2 text-right">
                              {prevMonth ? (
                                <span className={`text-xs font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>)}

              {periodView === 'day' && (
                <div className="card overflow-x-auto">
                  <h3 className="font-semibold text-gray-800 mb-4">Receita por Dia</h3>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Dia','Bruto','Líquido','Recebido','Vendas','% Recebido'].map(h => (
                          <th key={h} className="px-3 py-2 text-right first:text-left font-medium text-gray-600 text-xs">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.byDay.slice().reverse().map(d => (
                        <tr key={d.date} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-700">{fmtDay(d.date)}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{R$(d.gross)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-amber-700">{R$(d.net)}</td>
                          <td className="px-3 py-2 text-right text-green-600">{R$(d.received)}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{d.count}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-gray-500">{pct(d.received, d.net)}%</span>
                              <div className="w-16"><Bar value={d.received} max={d.net} color="bg-green-400" /></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── CÃES ───────────────────────────────────────────────────────── */}
          {tab === 'caes' && (
            <div className="card overflow-x-auto space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Award className="w-4 h-4" /> Ranking de Cães</h3>
                <div className="flex gap-1">
                  {([
                    { key: 'totalNet',     label: 'Total' },
                    { key: 'dailyNet',     label: 'Valor/Dia' },
                    { key: 'daysAttended', label: 'Dias' },
                  ] as const).map(o => (
                    <button key={o.key} onClick={() => setDogSort(o.key)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${dogSort === o.key ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400">
                💡 <strong>Líq./Dia</strong>: total líquido ÷ dias que a mensalidade contemplou no mês (agenda do cão). Fallback: dias com presença.
              </p>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['#','Cão','Tutor','Total Bruto','Desconto','Total Líq.','Recebido','Dias','Líq./Dia','Rec./Dia'].map(h => (
                      <th key={h} className="px-2 py-2 text-right first:text-left second:text-left font-medium text-gray-600 text-xs whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...data.byDog].sort((a, b) => b[dogSort] - a[dogSort]).map((d, i) => (
                    <tr key={d.dogId} className={`hover:bg-amber-50 ${i === 0 ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-2 py-2 text-gray-400 font-bold">{i + 1}</td>
                      <td className="px-2 py-2 font-medium text-gray-800 whitespace-nowrap">{d.dogName}</td>
                      <td className="px-2 py-2 text-gray-500 text-xs whitespace-nowrap">{d.ownerName}</td>
                      <td className="px-2 py-2 text-right text-gray-600">{R$(d.totalGross)}</td>
                      <td className="px-2 py-2 text-right text-red-400 text-xs">{d.totalDiscount > 0 ? `-${R$(d.totalDiscount)}` : '—'}</td>
                      <td className="px-2 py-2 text-right font-semibold text-amber-700">{R$(d.totalNet)}</td>
                      <td className="px-2 py-2 text-right text-green-600">{R$(d.totalReceived)}</td>
                      <td className="px-2 py-2 text-right text-gray-500" title={d.scheduledInPeriod > 0 ? `${d.scheduledInPeriod} dias agendados no período` : undefined}>
                        {d.daysAttended}
                        {d.scheduledInPeriod > 0 && d.scheduledInPeriod !== d.daysAttended && (
                          <span className="text-gray-300 text-xs ml-1">/{d.scheduledInPeriod}</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-indigo-600"
                        title={d.scheduledInPeriod > 0 ? `${R$(d.totalNet)} ÷ ${d.scheduledInPeriod} dias agendados` : d.daysAttended > 0 ? `${R$(d.totalNet)} ÷ ${d.daysAttended} dias com presença` : undefined}>
                        {d.dailyNet > 0 ? R$(d.dailyNet) : '—'}
                      </td>
                      <td className="px-2 py-2 text-right text-green-500">{d.dailyReceived > 0 ? R$(d.dailyReceived) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── VENDAS POR CÃO ─────────────────────────────────────────────── */}
          {tab === 'vendasPorCao' && (
            <div className="space-y-4">
              <div className="card overflow-x-auto">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Vendas Detalhadas por Cão</h3>
                <div className="space-y-4">
                  {data.byDog.map(d => (
                    <div key={d.dogId} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-semibold text-gray-800">{d.dogName}</span>
                          <span className="text-sm text-gray-500">• {d.ownerName}</span>
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{d.salesCount} vendas</span>
                        </div>
                        <a
                          href={`/vendas/historico?dogId=${d.dogId}`}
                          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                        >
                          Ver vendas <span className="text-xs">→</span>
                        </a>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-500">Total Líquido</p>
                          <p className="font-semibold text-amber-700">{R$(d.totalNet)}</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-500">Recebido</p>
                          <p className="font-semibold text-green-600">{R$(d.totalReceived)}</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-500">Desconto</p>
                          <p className="font-semibold text-red-500">{d.totalDiscount > 0 ? `-${R$(d.totalDiscount)}` : '—'}</p>
                        </div>
                        <div className="bg-gray-50 rounded p-2">
                          <p className="text-xs text-gray-500">Valor/Dia</p>
                          <p className="font-semibold text-indigo-600">{d.dailyNet > 0 ? R$(d.dailyNet) : '—'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PRODUTOS ───────────────────────────────────────────────────── */}
          {tab === 'produtos' && (
            <div className="space-y-4">
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Tag className="w-4 h-4" /> Por Categoria</h3>
                <div className="space-y-2">
                  {data.byCategory.map(c => (
                    <div key={c.category} className="flex items-center gap-3">
                      <span className="w-28 text-xs text-gray-700 font-medium truncate">{c.category}</span>
                      <div className="flex-1"><Bar value={c.net} max={data.byCategory[0]?.net || 1} color="bg-amber-400" /></div>
                      <span className="text-xs font-semibold text-amber-700 w-28 text-right">{R$(c.net)}</span>
                      <span className="text-xs text-gray-400 w-8 text-right">{c.qty}×</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card overflow-x-auto">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> Por Produto</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Produto','Categoria','Qtd','Bruto','Líquido'].map(h => (
                        <th key={h} className="px-3 py-2 text-right first:text-left font-medium text-gray-600 text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.byProduct.map(p => (
                      <tr key={p.productId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">{p.productName}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{p.category}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{p.qty}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{R$(p.gross)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-amber-700">{R$(p.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TUTORES ────────────────────────────────────────────────────── */}
          {tab === 'tutores' && (
            <div className="card overflow-x-auto">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> Ranking de Tutores</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['#','Tutor','Cães','Vendas','Total Líq.','Recebido','% Recebido'].map(h => (
                      <th key={h} className="px-3 py-2 text-right first:text-left font-medium text-gray-600 text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.byTutor.map((t, i) => (
                    <tr key={t.ownerName} className={`hover:bg-gray-50 ${i === 0 ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-3 py-2 text-gray-400 font-bold">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{t.ownerName}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{t.dogs}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{t.salesCount}</td>
                      <td className="px-3 py-2 text-right font-semibold text-amber-700">{R$(t.totalNet)}</td>
                      <td className="px-3 py-2 text-right text-green-600">{R$(t.totalReceived)}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-gray-500">{pct(t.totalReceived, t.totalNet)}%</span>
                          <div className="w-16"><Bar value={t.totalReceived} max={t.totalNet} color="bg-green-400" /></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      </>
      )}
    </div>
  )
}
