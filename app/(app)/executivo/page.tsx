'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Target,
  AlertTriangle, CheckCircle, Clock, ArrowUpRight, ArrowDownRight,
  Minus, Users, Wallet, Building2
} from 'lucide-react'

const OPEX_CATS = ['FOLHA SALARIAL','ALUGUEL','ÁGUA','ENERGIA ELÉTRICA','INTERNET','CONTABILIDADE','COMUNICAÇÃO E MARKETING','MATERIAL LIMPEZA','IMPOSTO IPTU','ASSOCIAÇÃO','TAXA JUNTA COMERCIAL','TAXA BOMBEIROS','SISTEMA CARTÃO','OUTROS']
const CAPEX_CATS = ['OBRA','INFRAESTRUTURA']

interface MonthData {
  month: string
  receita: number
  recebido: number
  vendas: number
  opex: number
  capex: number
  prolabore: number
  aporte: number
  entradaCaixa: number
  resultadoOp: number
  resultadoLiq: number
  margemOp: number
}

function fmtMoney(v: number, showSign = false) {
  const s = Math.abs(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (showSign && v > 0) return '+' + s
  if (v < 0) return '−' + s
  return s
}

function fmtPct(v: number, showSign = false) {
  const s = Math.abs(v).toFixed(1) + '%'
  if (showSign && v > 0) return '+' + s
  if (v < 0) return '−' + s
  return s
}

function periodLabel(p: string) {
  const [y, m] = p.split('-')
  return ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(m) - 1] + '/' + y.slice(2)
}

function KpiCard({ label, value, sub, trend, color = 'gray', icon: Icon }: {
  label: string; value: string; sub?: string; trend?: number; color?: string; icon: any
}) {
  const colors: Record<string, string> = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  }
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <Icon className="w-5 h-5 opacity-60" />
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(trend).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-extrabold leading-none mb-1">{value}</div>
      <div className="text-xs font-semibold opacity-60 uppercase tracking-wide">{label}</div>
      {sub && <div className="text-xs opacity-50 mt-1">{sub}</div>}
    </div>
  )
}

function StatusBadge({ value, threshold = 0 }: { value: number; threshold?: number }) {
  if (value > threshold) return <span className="flex items-center gap-1 text-emerald-600 font-bold text-sm"><CheckCircle className="w-4 h-4" /> Positivo</span>
  if (value === threshold) return <span className="flex items-center gap-1 text-gray-400 font-bold text-sm"><Minus className="w-4 h-4" /> Neutro</span>
  return <span className="flex items-center gap-1 text-red-500 font-bold text-sm"><AlertTriangle className="w-4 h-4" /> Negativo</span>
}

export default function ExecutivoPage() {
  const [months, setMonths] = useState<MonthData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [finRes, salesRes] = await Promise.all([
        fetch('/api/financeiro'),
        fetch('/api/sales/analytics'),
      ])
      const fin: any[] = await finRes.json()
      const sales = await salesRes.json()

      const map: Record<string, MonthData> = {}
      const ensure = (m: string) => {
        if (!map[m]) map[m] = { month: m, receita: 0, recebido: 0, vendas: 0, opex: 0, capex: 0, prolabore: 0, aporte: 0, entradaCaixa: 0, resultadoOp: 0, resultadoLiq: 0, margemOp: 0 }
      }

      for (const e of fin) {
        if (e.period === 'PRE_INAUGURACAO') continue
        ensure(e.period)
        const m = map[e.period]
        if (e.type === 'S' && OPEX_CATS.includes(e.category)) m.opex += e.amount
        if (e.type === 'S' && CAPEX_CATS.includes(e.category)) m.capex += e.amount
        if (e.type === 'S' && e.category === 'PROLABORE') m.prolabore += e.amount
        if (e.type === 'E' && e.category === 'APORTE NICE') m.aporte += e.amount
        if (e.type === 'E' && e.category === 'ENTRADA CAIXA') m.entradaCaixa += e.amount
      }
      for (const sm of (sales.byMonth || [])) {
        ensure(sm.month)
        map[sm.month].receita = sm.net
        map[sm.month].recebido = sm.received
        map[sm.month].vendas = sm.count
      }

      const result = Object.values(map)
        .filter(m => m.receita > 0 || m.opex > 0)
        .map(m => ({
          ...m,
          resultadoOp: m.receita - m.opex,
          resultadoLiq: m.receita - m.opex - m.prolabore - m.capex,
          margemOp: m.receita > 0 ? ((m.receita - m.opex) / m.receita) * 100 : 0,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

      setMonths(result)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm">Carregando dados...</p>
      </div>
    </div>
  )

  // Apenas meses com dados operacionais reais (pós-inauguração, com opex > 0)
  const opMonths = months.filter(m => m.opex > 0 && parseInt(m.month.split('-')[1]) > 0)
  const last = opMonths[opMonths.length - 1]
  const prev = opMonths[opMonths.length - 2]

  // Acumulados
  const totalReceita = opMonths.reduce((s, m) => s + m.receita, 0)
  const totalOpex = opMonths.reduce((s, m) => s + m.opex, 0)
  const totalProlabore = opMonths.reduce((s, m) => s + m.prolabore, 0)
  const totalCapex = opMonths.reduce((s, m) => s + m.capex, 0)
  const totalResultadoOp = totalReceita - totalOpex
  const totalResultadoLiq = totalResultadoOp - totalProlabore - totalCapex
  const margemAcum = totalReceita > 0 ? (totalResultadoOp / totalReceita) * 100 : 0

  // Investimento total dos sócios
  const allFin = months // we'll recompute from raw in the component — already computed
  const trendReceita = prev && prev.receita > 0 ? ((last.receita - prev.receita) / prev.receita) * 100 : 0
  const trendOpex = prev && prev.opex > 0 ? ((last.opex - prev.opex) / prev.opex) * 100 : 0
  const trendResultado = prev ? last.resultadoOp - prev.resultadoOp : 0

  // Breakdown OPEX último mês por grande categoria
  const bestMonth = opMonths.reduce((best, m) => m.resultadoOp > best.resultadoOp ? m : best, opMonths[0])
  const worstMonth = opMonths.reduce((worst, m) => m.resultadoOp < worst.resultadoOp ? m : worst, opMonths[0])

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-600" />
            Painel Executivo
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">AU-Ê Petcare · Visão consolidada desde a inauguração</p>
        </div>
        <a href="/dre" className="px-4 py-2 rounded-lg border border-emerald-600 text-emerald-700 text-sm font-medium hover:bg-emerald-50 transition-colors">
          Ver DRE completo →
        </a>
      </div>

      {/* KPIs principais — acumulado */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Receita Acumulada" value={fmtMoney(totalReceita)} sub={`${opMonths.reduce((s,m)=>s+m.vendas,0)} vendas`} color="green" icon={TrendingUp} />
        <KpiCard label="Resultado Operacional" value={fmtMoney(totalResultadoOp)} sub={`Margem ${fmtPct(margemAcum)}`} color={totalResultadoOp >= 0 ? 'blue' : 'red'} icon={Target} />
        <KpiCard label="Investido em Estrutura" value={fmtMoney(totalCapex)} sub="CAPEX acumulado" color="violet" icon={Building2} />
        <KpiCard label="Retiradas Sócios" value={fmtMoney(totalProlabore)} sub="Pró-labore acumulado" color="amber" icon={Wallet} />
      </div>

      {/* Último mês em destaque */}
      {last && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Último mês operacional</span>
              <h2 className="text-xl font-extrabold text-gray-900">{periodLabel(last.month)}</h2>
            </div>
            <StatusBadge value={last.resultadoOp} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-400 font-semibold uppercase mb-1">Receita</div>
              <div className="text-xl font-bold text-emerald-600">{fmtMoney(last.receita)}</div>
              {prev && <div className={`text-xs font-medium mt-0.5 ${trendReceita >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>{fmtPct(trendReceita, true)} vs {periodLabel(prev.month)}</div>}
            </div>
            <div>
              <div className="text-xs text-gray-400 font-semibold uppercase mb-1">OPEX</div>
              <div className="text-xl font-bold text-orange-600">{fmtMoney(last.opex)}</div>
              {prev && <div className={`text-xs font-medium mt-0.5 ${trendOpex <= 0 ? 'text-emerald-500' : 'text-red-400'}`}>{fmtPct(trendOpex, true)} vs {periodLabel(prev.month)}</div>}
            </div>
            <div>
              <div className="text-xs text-gray-400 font-semibold uppercase mb-1">Res. Operacional</div>
              <div className={`text-xl font-bold ${last.resultadoOp >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmtMoney(last.resultadoOp)}</div>
              {prev && <div className={`text-xs font-medium mt-0.5 ${trendResultado >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>{trendResultado >= 0 ? '+' : '−'}{fmtMoney(Math.abs(trendResultado))} vs {periodLabel(prev.month)}</div>}
            </div>
            <div>
              <div className="text-xs text-gray-400 font-semibold uppercase mb-1">Margem Op.</div>
              <div className={`text-xl font-bold ${last.margemOp >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmtPct(last.margemOp)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{last.vendas} vendas / {last.receita > 0 ? fmtMoney(last.receita / last.vendas) + ' ticket médio' : '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela mês a mês */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="font-bold text-gray-800">Evolução Mensal</h2>
          <p className="text-xs text-gray-400 mt-0.5">Resultado operacional = Receita − OPEX (exclui CAPEX e retiradas)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase">
                <th className="px-5 py-3 text-left">Mês</th>
                <th className="px-5 py-3 text-right">Receita</th>
                <th className="px-5 py-3 text-right">OPEX</th>
                <th className="px-5 py-3 text-right">Retiradas</th>
                <th className="px-5 py-3 text-right">CAPEX</th>
                <th className="px-5 py-3 text-right">Res. Op.</th>
                <th className="px-5 py-3 text-right">Margem</th>
                <th className="px-5 py-3 text-right">Vendas</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {opMonths.map((m, i) => {
                const isBest = m.month === bestMonth.month
                const isLast = i === opMonths.length - 1
                return (
                  <tr key={m.month} className={`hover:bg-gray-50 transition-colors ${isLast ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-5 py-3 font-bold text-gray-700">
                      {periodLabel(m.month)}
                      {isBest && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">Melhor</span>}
                      {isLast && !isBest && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">Atual</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-emerald-600 font-semibold">{fmtMoney(m.receita)}</td>
                    <td className="px-5 py-3 text-right font-mono text-orange-500">{fmtMoney(m.opex)}</td>
                    <td className="px-5 py-3 text-right font-mono text-amber-500">{m.prolabore > 0 ? fmtMoney(m.prolabore) : '—'}</td>
                    <td className="px-5 py-3 text-right font-mono text-slate-500">{m.capex > 0 ? fmtMoney(m.capex) : '—'}</td>
                    <td className={`px-5 py-3 text-right font-mono font-bold ${m.resultadoOp >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {fmtMoney(m.resultadoOp, true)}
                    </td>
                    <td className={`px-5 py-3 text-right font-mono text-sm ${m.margemOp >= 0 ? 'text-blue-500' : 'text-red-400'}`}>
                      {fmtPct(m.margemOp)}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400">{m.vendas}</td>
                    <td className="px-4 py-3 text-center">
                      {m.resultadoOp > 0
                        ? <span className="inline-flex w-2 h-2 rounded-full bg-emerald-400" title="Positivo" />
                        : <span className="inline-flex w-2 h-2 rounded-full bg-red-400" title="Negativo" />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                <td className="px-5 py-3 text-gray-700 uppercase text-xs tracking-wide">TOTAL</td>
                <td className="px-5 py-3 text-right font-mono text-emerald-700">{fmtMoney(totalReceita)}</td>
                <td className="px-5 py-3 text-right font-mono text-orange-600">{fmtMoney(totalOpex)}</td>
                <td className="px-5 py-3 text-right font-mono text-amber-600">{fmtMoney(totalProlabore)}</td>
                <td className="px-5 py-3 text-right font-mono text-slate-600">{fmtMoney(totalCapex)}</td>
                <td className={`px-5 py-3 text-right font-mono ${totalResultadoOp >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtMoney(totalResultadoOp, true)}</td>
                <td className={`px-5 py-3 text-right font-mono ${margemAcum >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{fmtPct(margemAcum)}</td>
                <td className="px-5 py-3 text-right text-gray-500">{opMonths.reduce((s,m)=>s+m.vendas,0)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Barra de progresso visual por mês */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-bold text-gray-800 mb-5">Receita vs OPEX — Mês a Mês</h2>
        <div className="space-y-3">
          {opMonths.map(m => {
            const max = Math.max(...opMonths.map(x => Math.max(x.receita, x.opex))) || 1
            const pctReceita = (m.receita / max) * 100
            const pctOpex = (m.opex / max) * 100
            return (
              <div key={m.month}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-600 w-12">{periodLabel(m.month)}</span>
                  <div className="flex-1 mx-3 space-y-1">
                    <div className="flex items-center gap-1">
                      <div className="bg-gray-100 rounded-full flex-1 h-3 overflow-hidden">
                        <div className="bg-emerald-400 h-3 rounded-full transition-all" style={{ width: `${pctReceita}%` }} />
                      </div>
                      <span className="text-xs font-mono text-emerald-600 w-24 text-right">{fmtMoney(m.receita)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="bg-gray-100 rounded-full flex-1 h-3 overflow-hidden">
                        <div className="bg-orange-400 h-3 rounded-full transition-all" style={{ width: `${pctOpex}%` }} />
                      </div>
                      <span className="text-xs font-mono text-orange-500 w-24 text-right">{fmtMoney(m.opex)}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold w-20 text-right ${m.resultadoOp >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {fmtMoney(m.resultadoOp, true)}
                  </span>
                </div>
              </div>
            )
          })}
          <div className="flex items-center gap-4 pt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-emerald-400 inline-block" /> Receita</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-orange-400 inline-block" /> OPEX</span>
          </div>
        </div>
      </div>

      {/* Insights automáticos */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-bold text-gray-800 mb-4">Insights</h2>
        <div className="space-y-3">
          {totalResultadoOp > 0 && (
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Operação no azul acumulada</p>
                <p className="text-xs text-emerald-600 mt-0.5">A operação gerou {fmtMoney(totalResultadoOp)} de resultado operacional positivo no acumulado, com margem de {fmtPct(margemAcum)}.</p>
              </div>
            </div>
          )}
          {last && prev && last.receita > prev.receita && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Receita crescendo</p>
                <p className="text-xs text-blue-600 mt-0.5">Receita subiu {fmtPct(trendReceita)} em {periodLabel(last.month)} vs {periodLabel(prev.month)}: {fmtMoney(prev.receita)} → {fmtMoney(last.receita)}.</p>
              </div>
            </div>
          )}
          {last && prev && last.receita < prev.receita && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <TrendingDown className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Receita recuou no último mês</p>
                <p className="text-xs text-amber-600 mt-0.5">Receita caiu {fmtPct(Math.abs(trendReceita))} em {periodLabel(last.month)} vs {periodLabel(prev.month)}: {fmtMoney(prev.receita)} → {fmtMoney(last.receita)}.</p>
              </div>
            </div>
          )}
          {bestMonth && (
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <Target className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-700">Melhor mês: {periodLabel(bestMonth.month)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Resultado operacional de {fmtMoney(bestMonth.resultadoOp)} com margem de {fmtPct(bestMonth.margemOp)} e {bestMonth.vendas} vendas.</p>
              </div>
            </div>
          )}
          {totalCapex > 0 && (
            <div className="flex items-start gap-3 p-3 bg-violet-50 rounded-xl border border-violet-100">
              <Building2 className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-violet-800">Investimento em estrutura</p>
                <p className="text-xs text-violet-600 mt-0.5">{fmtMoney(totalCapex)} investidos em CAPEX (obra e infraestrutura) desde a inauguração — não impactam o resultado operacional.</p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
