'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, Dog, TrendingUp, Users } from 'lucide-react'
import {
  DynamicAreaChart as AreaChart,
  DynamicBarChart as BarChart,
  DynamicLineChart as LineChart,
  DynamicResponsiveContainer as ResponsiveContainer,
  Area, Bar, CartesianGrid, Legend, Line, Tooltip, XAxis, YAxis,
} from '../relatorios/ChartsWrapper'

type MonthlyFrequency = {
  month: string
  label: string
  enrollments: number
  accumulatedEnrollments: number
  uniquePresentDogs: number
  uniqueBilledDogs: number
  averagePayingDogsPerDay: number
  workingDays: number
  billedRevenue: number
}

type FrequencyData = {
  monthly: MonthlyFrequency[]
  summary: {
    totalEnrollments: number
    currentPayingDogs: number
    averagePayingDogsPerDay: number
  }
}

const moneyShort = (value: number) => value >= 1000 ? `R$ ${(value / 1000).toFixed(1)}k` : `R$ ${value.toFixed(0)}`

function MetricCard({ label, value, helper, icon: Icon, tone }: { label: string; value: string; helper: string; icon: typeof Dog; tone: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
          <p className="mt-2 text-3xl font-extrabold leading-none">{value}</p>
          <p className="mt-2 text-xs font-medium opacity-70">{helper}</p>
        </div>
        <Icon className="h-5 w-5 opacity-60" />
      </div>
    </div>
  )
}

export default function FrequenciaPage() {
  const [data, setData] = useState<FrequencyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/reports/frequency')
      .then(async response => {
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar o relatório')
        setData(payload)
      })
      .catch(err => setError(err.message || 'Não foi possível carregar o relatório'))
      .finally(() => setLoading(false))
  }, [])

  const current = data?.monthly[data.monthly.length - 1]
  const previous = data?.monthly[data.monthly.length - 2]
  const attendanceRate = current?.uniqueBilledDogs
    ? Math.round((current.uniquePresentDogs / current.uniqueBilledDogs) * 100)
    : 0
  const enrollmentTrend = current && previous ? current.enrollments - previous.enrollments : 0

  const enrollmentChart = useMemo(() => data?.monthly.map(item => ({
    ...item,
    matriculas: item.enrollments,
    baseAcumulada: item.accumulatedEnrollments,
  })) || [], [data])

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando relatório de frequência...</div>
  if (error) return <div className="p-8 text-center font-medium text-red-600">{error}</div>
  if (!data?.monthly.length) return <div className="p-8 text-center text-gray-500">Ainda não há vendas ou presenças registradas para gerar este relatório.</div>

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-gray-800"><Users className="h-6 w-6 text-indigo-600" /> Frequência e Crescimento</h1>
          <p className="mt-1 text-sm text-gray-500">Visão mensal de matrícula, presença e cães faturados.</p>
        </div>
        <div className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
          Média diária considera segunda a sábado
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Base acumulada" value={String(current?.accumulatedEnrollments || 0)} helper="cães com 1ª mensalidade ou hospedagem" icon={Dog} tone="border-indigo-200 bg-indigo-50 text-indigo-800" />
        <MetricCard label="Matrículas do mês" value={String(current?.enrollments || 0)} helper={`${enrollmentTrend >= 0 ? '+' : ''}${enrollmentTrend} vs. mês anterior`} icon={TrendingUp} tone="border-emerald-200 bg-emerald-50 text-emerald-800" />
        <MetricCard label="Média pagantes/dia" value={(current?.averagePayingDogsPerDay || 0).toFixed(1)} helper={`${current?.workingDays || 0} dias úteis (seg. a sáb.)`} icon={CalendarDays} tone="border-violet-200 bg-violet-50 text-violet-800" />
        <MetricCard label="Presença x faturados" value={`${current?.uniquePresentDogs || 0} / ${current?.uniqueBilledDogs || 0}`} helper={`${attendanceRate}% dos faturados estiveram presentes`} icon={BarChart3} tone="border-amber-200 bg-amber-50 text-amber-800" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-4">
            <h2 className="font-bold text-gray-800">Matrículas e base acumulada</h2>
            <p className="text-xs text-gray-500">Matrícula é a primeira venda mensal ou hospedagem registrada para o cão.</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={enrollmentChart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="frequencyBase" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.28} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any, name: any) => [`${Number(value || 0)} cães`, name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="baseAcumulada" name="Base acumulada" stroke="#4f46e5" fill="url(#frequencyBase)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="matriculas" name="Matrículas" stroke="#10b981" fill="none" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="mb-4">
            <h2 className="font-bold text-gray-800">Cães presentes x faturados</h2>
            <p className="text-xs text-gray-500">Contagem única de cães no mês; uma presença por cão basta para contabilizá-lo.</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any, name: any) => [`${Number(value || 0)} cães`, name]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="uniquePresentDogs" name="Presentes" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="uniqueBilledDogs" name="Faturados" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-bold text-gray-800">Média diária de cães pagantes</h2>
              <p className="text-xs text-gray-500">Presenças confirmadas de cães com matrícula, divididas pelos dias de segunda a sábado do mês.</p>
            </div>
            <span className="text-xs font-semibold text-gray-500">Faturamento de referência: {moneyShort(current?.billedRevenue || 0)}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.monthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: any) => [`${Number(value || 0).toFixed(1)} cães/dia`, 'Média pagantes']} />
              <Line type="monotone" dataKey="averagePayingDogsPerDay" name="Média pagantes/dia" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-800">Resumo mensal</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Mês</th><th className="px-4 py-3 text-right">Matrículas</th><th className="px-4 py-3 text-right">Base acumulada</th><th className="px-4 py-3 text-right">Presentes únicos</th><th className="px-4 py-3 text-right">Faturados únicos</th><th className="px-4 py-3 text-right">Média pagantes/dia</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[...data.monthly].reverse().map(item => <tr key={item.month} className="text-gray-700"><td className="px-4 py-3 font-semibold">{item.label}</td><td className="px-4 py-3 text-right">{item.enrollments}</td><td className="px-4 py-3 text-right">{item.accumulatedEnrollments}</td><td className="px-4 py-3 text-right">{item.uniquePresentDogs}</td><td className="px-4 py-3 text-right">{item.uniqueBilledDogs}</td><td className="px-4 py-3 text-right font-semibold">{item.averagePayingDogsPerDay.toFixed(1)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
