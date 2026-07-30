'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Dog, Building2, Package, Sparkles, CalendarDays, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'

interface CrecheDog {
  id: string
  name: string
  ownerName: string
  amount: number
  billingDay: number
  lastSaleDate: string
  paymentStatus: string | null
}

interface ForecastData {
  month: string
  monthLabel: string
  daysInMonth: number
  todayDay: number
  totals: { creche: number; hotel: number; pacote: number; servicos: number; total: number }
  atualTotal: number
  categories: {
    hotel: { lastMonth: number; avgGrowthPct: number; forecast: number }
    pacote: { lastMonth: number; avgGrowthPct: number; forecast: number }
    servicos: { lastMonth: number; avgGrowthPct: number; forecast: number }
  }
  prevMonths: { key: string; label: string; total: number }[]
  chart: { day: number; forecast: number; atual: number | null; prev1: number | null; prev2: number | null; prev3: number | null }[]
  crecheDogs: CrecheDog[]
  staleDogs: { id: string; name: string; ownerName: string; lastSaleDate: string; amount: number }[]
}

const R$ = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtK = (v: number) => v >= 1000 ? `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k` : `R$ ${Math.round(v)}`
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

const STATUS_STYLE: Record<string, string> = {
  PAGO: 'bg-emerald-100 text-emerald-700',
  PENDENTE: 'bg-amber-100 text-amber-700',
  AGENDADO: 'bg-blue-100 text-blue-700',
  PROGRAMADA: 'bg-indigo-100 text-indigo-700',
}

const PREV_COLORS = ['#94a3b8', '#cbd5e1', '#e2e8f0']

export default function ForecastSection() {
  const [data, setData] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [visiblePrevs, setVisiblePrevs] = useState<Set<number>>(new Set([0]))

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/sales/forecast')
      if (res.ok) setData(await res.json())
      else toast.error('Erro ao carregar forecast')
    } catch { toast.error('Erro ao carregar forecast') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function togglePrev(idx: number) {
    setVisiblePrevs(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm">Calculando previsão...</p>
      </div>
    </div>
  )
  if (!data) return null

  const t = data.totals
  const cats = [
    { key: 'creche', label: 'Creche (mensalistas)', value: t.creche, icon: Dog, color: 'text-amber-600 bg-amber-100', bar: 'bg-amber-400', detail: `${data.crecheDogs.length} cães projetados` },
    { key: 'hotel', label: 'Hotel', value: t.hotel, icon: Building2, color: 'text-blue-600 bg-blue-100', bar: 'bg-blue-400', growth: data.categories.hotel.avgGrowthPct, detail: `mês anterior: ${R$(data.categories.hotel.lastMonth)}` },
    { key: 'pacote', label: 'Pacotes', value: t.pacote, icon: Package, color: 'text-emerald-600 bg-emerald-100', bar: 'bg-emerald-400', growth: data.categories.pacote.avgGrowthPct, detail: `mês anterior: ${R$(data.categories.pacote.lastMonth)}` },
    { key: 'servicos', label: 'Serviços & Avulsos', value: t.servicos, icon: Sparkles, color: 'text-violet-600 bg-violet-100', bar: 'bg-violet-400', growth: data.categories.servicos.avgGrowthPct, detail: `mês anterior: ${R$(data.categories.servicos.lastMonth)}` },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-violet-600" />
            Forecast — {data.monthLabel}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Previsão de vendas do mês com base em mensalistas e tendência recente</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-1.5 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-2xl border p-4 bg-violet-50 border-violet-200 text-violet-700 col-span-2 md:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">Forecast Total</div>
          <div className="text-2xl font-extrabold leading-none">{R$(t.total)}</div>
          <div className="text-xs opacity-60 mt-1.5">realizado até hoje: {R$(data.atualTotal)}</div>
        </div>
        {cats.map(c => (
          <div key={c.key} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.color}`}><c.icon className="w-4 h-4" /></span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{c.label}</span>
            </div>
            <div className="text-lg font-extrabold text-gray-800 leading-none">{R$(c.value)}</div>
            <div className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
              {c.growth !== undefined && (
                <span className={`inline-flex items-center gap-0.5 font-semibold ${c.growth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {c.growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {c.growth >= 0 ? '+' : ''}{c.growth.toFixed(1)}%
                </span>
              )}
              <span className="truncate">{c.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Composição */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
          {cats.map(c => (
            <div key={c.key} className={`${c.bar} transition-all`} style={{ width: `${t.total > 0 ? (c.value / t.total) * 100 : 0}%` }} title={`${c.label}: ${R$(c.value)}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3">
          {cats.map(c => (
            <div key={c.key} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`w-2.5 h-2.5 rounded-full ${c.bar}`} />
              {c.label} <strong className="text-gray-800">{t.total > 0 ? Math.round((c.value / t.total) * 100) : 0}%</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico acumulado diário */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-violet-600" /> Acumulado Diário do Mês</h3>
            <p className="text-xs text-gray-400">Forecast vs realizado vs meses anteriores (acumulado crescente)</p>
          </div>
          <div className="flex gap-1.5">
            {data.prevMonths.map((m, i) => (
              <button key={m.key} onClick={() => togglePrev(i)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                  visiblePrevs.has(i) ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data.chart} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }}
              interval={Math.floor(data.daysInMonth / 15)} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={fmtK} width={64} />
            <Tooltip
              formatter={(value: any, name: any) => [R$(Number(value)), name]}
              labelFormatter={(d: any) => `Dia ${d} de ${data.monthLabel}`}
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine x={data.todayDay} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'hoje', position: 'top', fontSize: 10, fill: '#f59e0b' }} />
            {visiblePrevs.has(2) && <Line type="monotone" dataKey="prev3" name={data.prevMonths[2]?.label} stroke={PREV_COLORS[2]} strokeWidth={1.5} dot={false} />}
            {visiblePrevs.has(1) && <Line type="monotone" dataKey="prev2" name={data.prevMonths[1]?.label} stroke={PREV_COLORS[1]} strokeWidth={1.5} dot={false} />}
            {visiblePrevs.has(0) && <Line type="monotone" dataKey="prev1" name={data.prevMonths[0]?.label} stroke={PREV_COLORS[0]} strokeWidth={2} dot={false} />}
            <Line type="monotone" dataKey="atual" name={`Realizado ${data.monthLabel}`} stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} connectNulls={false} />
            <Line type="monotone" dataKey="forecast" name={`Forecast ${data.monthLabel}`} stroke="#7c3aed" strokeWidth={2.5} strokeDasharray="6 3" dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detalhe dos mensalistas */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Dog className="w-4 h-4 text-amber-600" /> Mensalistas Projetados</h3>
            <p className="text-xs text-gray-400">Última mensalidade registrada de cada cão, posicionada no dia típico de cobrança</p>
          </div>
          <span className="text-sm font-bold text-amber-700">{R$(t.creche)}</span>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white shadow-sm">
              <tr className="border-b border-gray-100 text-gray-400 text-xs font-semibold uppercase">
                <th className="px-6 py-2 text-left">Cão</th>
                <th className="px-3 py-2 text-left">Tutor</th>
                <th className="px-3 py-2 text-center">Dia cobrança</th>
                <th className="px-3 py-2 text-center">Última venda</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-6 py-2 text-right">Valor projetado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.crecheDogs.map(d => (
                <tr key={d.id} className="hover:bg-amber-50/50 transition-colors">
                  <td className="px-6 py-2 font-medium text-gray-800">{d.name}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{d.ownerName}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold">{d.billingDay}</span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs text-gray-500">{fmtDate(d.lastSaleDate)}</td>
                  <td className="px-3 py-2 text-center">
                    {d.paymentStatus
                      ? <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[d.paymentStatus] || 'bg-gray-100 text-gray-500'}`}>{d.paymentStatus}</span>
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-2 text-right font-semibold text-amber-700">{R$(d.amount)}</td>
                </tr>
              ))}
              {data.crecheDogs.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-400 italic">Nenhum mensalista ativo com venda recente.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cães sem venda recente */}
      {data.staleDogs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h4 className="font-semibold text-amber-800 text-sm flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" /> {data.staleDogs.length} {data.staleDogs.length === 1 ? 'cão ativo sem venda' : 'cães ativos sem venda'} nos últimos 75 dias (fora da projeção)
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.staleDogs.map(d => (
              <span key={d.id} className="text-xs bg-white border border-amber-200 text-amber-700 px-2.5 py-1 rounded-lg" title={`Última venda: ${fmtDate(d.lastSaleDate)}`}>
                {d.name} <span className="text-amber-400">· {fmtDate(d.lastSaleDate)}</span>
              </span>
            ))}
          </div>
          <p className="text-[11px] text-amber-600 mt-2">Se algum desses cães ainda é pagante, registre a mensalidade do mês para incluí-lo no forecast.</p>
        </div>
      )}

      {/* Premissas */}
      <div className="text-xs text-gray-500 bg-violet-50 border border-violet-100 rounded-lg p-3">
        <strong>Premissas:</strong> <em>Creche</em> = soma da última mensalidade (realizada ou programada) de cada cão ativo, posicionada no dia de cobrança mais frequente do histórico. <em>Hotel, Pacotes e Serviços</em> = valor do mês anterior × (1 + crescimento médio dos últimos 3 meses), distribuídos no mês seguindo o padrão diário do mês anterior.
      </div>
    </div>
  )
}
