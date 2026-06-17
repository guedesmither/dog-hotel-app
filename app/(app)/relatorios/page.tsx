'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { ChevronLeft, ChevronRight, DollarSign, Users, TrendingUp, BarChart2 } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'

interface RevenueByStatus {
  pago: number
  pendente: number
  agendado: number
  total: number
}

interface DailyReport {
  date: string
  totalDogs: number
  nonBolsistaDogs: number
  bolsistaDogs: number
  revenue: {
    mensalidade: RevenueByStatus
    pacotes: RevenueByStatus
    servicos: RevenueByStatus
    total: RevenueByStatus
  }
}

interface TotalsByType {
  mensalidade: RevenueByStatus
  pacotes: RevenueByStatus
  servicos: RevenueByStatus
  geral: RevenueByStatus
}

interface ReportSummary {
  totalDays: number
  avgNonBolsistaDogs: number
  avgDailyRevenue: number
  avgPastRevenue: number
  avgFutureRevenue: number
  totals: TotalsByType
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const fmtShort = (v: number) =>
  v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v.toFixed(0)}`

export default function RelatoriosPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || ''

  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<DailyReport[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [activeTab, setActiveTab] = useState<'grafico' | 'calendario'>('grafico')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    if (role === 'ADMIN' || role === 'MANAGER') fetchReport()
  }, [currentDate, role])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`
      const res = await fetch(`/api/reports/daily?startDate=${startDate}&endDate=${endDate}`)
      if (res.ok) {
        const data = await res.json()
        setReports(data.dailyReports || [])
        setSummary(data.summary || null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return <div className="p-8 text-red-600 font-bold text-center">Acesso negado.</div>
  }

  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const today = new Date().toISOString().split('T')[0]
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth()
  const todayDay = isCurrentMonth ? new Date().getDate() : null

  // --- Dados para os gráficos ---
  const chartData = useMemo(() => {
    let accumulated = 0
    return reports
      .filter(r => r.date <= today || !isCurrentMonth)
      .map(r => {
        const day = parseInt(r.date.split('-')[2])
        accumulated += r.revenue.total.pago
        return {
          day,
          diario: Math.round(r.revenue.total.total * 100) / 100,
          pago: Math.round(r.revenue.total.pago * 100) / 100,
          pendente: Math.round(r.revenue.total.pendente * 100) / 100,
          agendado: Math.round(r.revenue.total.agendado * 100) / 100,
          mensalidade: Math.round(r.revenue.mensalidade.total * 100) / 100,
          pacotes: Math.round(r.revenue.pacotes.total * 100) / 100,
          servicos: Math.round(r.revenue.servicos.total * 100) / 100,
          acumulado: Math.round(accumulated * 100) / 100,
          coes: r.nonBolsistaDogs,
        }
      })
  }, [reports, today, isCurrentMonth])

  // MTD acumulado até hoje
  const mtdPago = summary?.totals.geral.pago ?? 0
  const mtdTotal = summary?.totals.geral.total ?? 0
  const mtdPendente = summary?.totals.geral.pendente ?? 0
  const mtdAgendado = summary?.totals.geral.agendado ?? 0

  // Projeção fim do mês baseada na média passada
  const diasNoMes = new Date(year, month + 1, 0).getDate()
  const projFimMes = summary && summary.avgPastRevenue > 0
    ? summary.avgPastRevenue * diasNoMes
    : null

  // --- Calendário ---
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
  const calendarDays: Array<{ day: number | null; report?: DailyReport }> = []
  for (let i = 0; i < startOffset; i++) calendarDays.push({ day: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarDays.push({ day: d, report: reports.find(r => r.date === dateStr) })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-1">Dia {label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {fmt(p.value)}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header com navegação */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">📊 Relatório MTD</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-semibold text-gray-700 min-w-[130px] text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Recebido (MTD)</p>
              <p className="text-2xl font-bold text-green-800 mt-1">{fmt(mtdPago)}</p>
              {projFimMes && (
                <p className="text-xs text-green-500 mt-1">Proj. mês: {fmt(projFimMes)}</p>
              )}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Pendente</p>
              <p className="text-2xl font-bold text-amber-800 mt-1">{fmt(mtdPendente)}</p>
              <p className="text-xs text-amber-500 mt-1">A receber</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Agendado</p>
              <p className="text-2xl font-bold text-blue-800 mt-1">{fmt(mtdAgendado)}</p>
              <p className="text-xs text-blue-500 mt-1">Programado</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Média/dia</p>
              <p className="text-2xl font-bold text-purple-800 mt-1">{fmt(summary.avgPastRevenue)}</p>
              <p className="text-xs text-purple-500 mt-1">Dias passados</p>
            </div>
          </div>

          {/* Breakdown por tipo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Mensalidades</p>
              <p className="text-lg font-bold text-gray-800">{fmt(summary.totals.mensalidade.total)}</p>
              <p className="text-xs text-green-600">{fmt(summary.totals.mensalidade.pago)} pago</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Pacotes</p>
              <p className="text-lg font-bold text-gray-800">{fmt(summary.totals.pacotes.total)}</p>
              <p className="text-xs text-green-600">{fmt(summary.totals.pacotes.pago)} pago</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Serviços/Hotel</p>
              <p className="text-lg font-bold text-gray-800">{fmt(summary.totals.servicos.total)}</p>
              <p className="text-xs text-green-600">{fmt(summary.totals.servicos.pago)} pago</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('grafico')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'grafico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <BarChart2 className="w-4 h-4" /> Gráficos
            </button>
            <button
              onClick={() => setActiveTab('calendario')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'calendario' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <TrendingUp className="w-4 h-4" /> Calendário
            </button>
          </div>

          {/* --- ABA GRÁFICOS --- */}
          {activeTab === 'grafico' && (
            <div className="space-y-6">

              {/* Gráfico 1: Faturamento diário por status (barras empilhadas) */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Faturamento por dia — por status</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} width={52} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="pago" name="Pago" stackId="a" fill="#22c55e" />
                    <Bar dataKey="pendente" name="Pendente" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="agendado" name="Agendado" stackId="a" fill="#60a5fa" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico 2: Acumulado MTD */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Acumulado recebido no mês (MTD)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAcum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} width={52} />
                    <Tooltip content={<CustomTooltip />} />
                    {projFimMes && (
                      <ReferenceLine y={projFimMes} stroke="#9333ea" strokeDasharray="4 2" label={{ value: 'Proj.', position: 'right', fontSize: 10, fill: '#9333ea' }} />
                    )}
                    <Area type="monotone" dataKey="acumulado" name="Acumulado pago" stroke="#22c55e" fill="url(#colorAcum)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico 3: Mix de receita por tipo */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Mix de receita por tipo</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} width={52} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="mensalidade" name="Mensalidade" stackId="b" fill="#3b82f6" />
                    <Bar dataKey="pacotes" name="Pacotes" stackId="b" fill="#f97316" />
                    <Bar dataKey="servicos" name="Serviços/Hotel" stackId="b" fill="#a855f7" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico 4: Cães por dia */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Cães não-bolsistas por dia</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCoes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                    <Tooltip formatter={(v: any) => [`${v} cães`, 'Não bolsistas']} labelFormatter={(l) => `Dia ${l}`} />
                    {summary.avgNonBolsistaDogs > 0 && (
                      <ReferenceLine y={summary.avgNonBolsistaDogs} stroke="#6366f1" strokeDasharray="4 2" label={{ value: 'Média', position: 'right', fontSize: 10, fill: '#6366f1' }} />
                    )}
                    <Area type="monotone" dataKey="coes" name="Não bolsistas" stroke="#6366f1" fill="url(#colorCoes)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

            </div>
          )}

          {/* --- ABA CALENDÁRIO --- */}
          {activeTab === 'calendario' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="grid grid-cols-7 border-b border-gray-200">
                {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => (
                  <div key={d} className="p-2 text-center text-xs font-semibold text-gray-500">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {calendarDays.map((item, idx) => {
                  const isToday = item.day === todayDay
                  return (
                    <div
                      key={idx}
                      className={`min-h-[90px] p-1.5 border border-gray-100 text-xs ${
                        !item.day ? 'bg-gray-50' : isToday ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      {item.day && (
                        <>
                          <div className={`font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                            {item.day}
                          </div>
                          {item.report ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <Users className="w-2.5 h-2.5 text-indigo-400" />
                                <span className="text-indigo-700 font-medium">{item.report.nonBolsistaDogs}</span>
                                <span className="text-gray-300">/</span>
                                <span className="text-gray-400">{item.report.bolsistaDogs}</span>
                              </div>
                              <div className="font-bold text-green-600">
                                {fmtShort(item.report.revenue.total.total)}
                              </div>
                              {item.report.revenue.total.pendente > 0 && (
                                <div className="text-amber-500">{fmtShort(item.report.revenue.total.pendente)} pend.</div>
                              )}
                              <div className="flex gap-0.5 mt-0.5">
                                {item.report.revenue.mensalidade.total > 0 && <span className="bg-blue-100 text-blue-600 px-1 rounded text-[9px]">M</span>}
                                {item.report.revenue.pacotes.total > 0 && <span className="bg-orange-100 text-orange-600 px-1 rounded text-[9px]">P</span>}
                                {item.report.revenue.servicos.total > 0 && <span className="bg-purple-100 text-purple-600 px-1 rounded text-[9px]">S</span>}
                              </div>
                            </div>
                          ) : (
                            <div className="text-gray-300">—</div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Legenda */}
              <div className="p-3 border-t border-gray-100 flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="bg-blue-100 text-blue-600 px-1 rounded">M</span> Mensalidade</span>
                <span className="flex items-center gap-1"><span className="bg-orange-100 text-orange-600 px-1 rounded">P</span> Pacote</span>
                <span className="flex items-center gap-1"><span className="bg-purple-100 text-purple-600 px-1 rounded">S</span> Serviços/Hotel</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3 text-indigo-400" /> Não bolsistas / Bolsistas</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
