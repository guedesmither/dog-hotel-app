'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ChevronLeft, ChevronRight, DollarSign, Users, Calendar } from 'lucide-react'

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

export default function RelatoriosPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || ''

  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState<DailyReport[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)

  useEffect(() => {
    if (role === 'ADMIN' || role === 'MANAGER') {
      fetchReport()
    }
  }, [currentDate])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      
      // Primeiro dia do mês
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      // Último dia do mês
      const lastDay = new Date(year, month + 1, 0).getDate()
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`

      const res = await fetch(`/api/reports/daily?startDate=${startDate}&endDate=${endDate}`)
      if (res.ok) {
        const data = await res.json()
        setReports(data.dailyReports || [])
        setSummary(data.summary || null)
      }
    } catch (err) {
      console.error('Erro ao buscar relatório:', err)
    } finally {
      setLoading(false)
    }
  }

  if (role !== 'ADMIN' && role !== 'MANAGER') {
    return (
      <div className="p-8 text-red-600 font-bold text-center">
        Acesso negado. Somente ADMIN ou MANAGER.
      </div>
    )
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // Criar grid do calendário
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  // Ajustar para segunda-feira ser o primeiro dia (0 = segunda, 6 = domingo)
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1

  const calendarDays: Array<{ day: number | null; report?: DailyReport }> = []
  
  // Adicionar dias vazios no início
  for (let i = 0; i < startOffset; i++) {
    calendarDays.push({ day: null })
  }
  
  // Adicionar dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const report = reports.find(r => r.date === dateStr)
    calendarDays.push({ day, report })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">📊 Relatório Financeiro Diário</h1>

      {/* Cards de Resumo */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Média Cães (não bolsistas)</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{summary.avgNonBolsistaDogs.toFixed(1)}</p>
            <p className="text-xs text-blue-600">por dia</p>
          </div>

          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Faturamento Total</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(summary.totals.geral.total)}</p>
            <div className="text-xs text-green-600 mt-1 space-y-0.5">
              <p className="flex justify-between"><span>Pago:</span> <span className="font-medium text-green-700">{formatCurrency(summary.totals.geral.pago)}</span></p>
              <p className="flex justify-between"><span>Pendente:</span> <span className="font-medium text-amber-600">{formatCurrency(summary.totals.geral.pendente)}</span></p>
              <p className="flex justify-between"><span>Agendado:</span> <span className="font-medium text-blue-600">{formatCurrency(summary.totals.geral.agendado)}</span></p>
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Média Diária</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{formatCurrency(summary.avgDailyRevenue)}</p>
            <div className="text-xs text-purple-600 mt-1">
              <p>Passado: {formatCurrency(summary.avgPastRevenue)}</p>
              <p>Futuro: {formatCurrency(summary.avgFutureRevenue)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Calendário */}
      <div className="bg-white rounded-xl border border-gray-200 shadow">
        {/* Header do Calendário */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {monthNames[month]} {year}
          </h2>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Grid de Dias */}
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Carregando relatório...
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDays.map((item, index) => (
              <div 
                key={index} 
                className={`min-h-[100px] p-2 border border-gray-100 ${
                  item.day ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                {item.day && (
                  <>
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      {item.day}
                    </div>
                    {item.report ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs">
                          <Users className="w-3 h-3 text-blue-500" />
                          <span className="text-blue-700 font-medium">
                            {item.report.nonBolsistaDogs}
                          </span>
                          <span className="text-gray-400">/</span>
                          <span className="text-gray-500">
                            {item.report.bolsistaDogs}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-green-600">
                          {formatCurrency(item.report.revenue.total.total)}
                        </div>
                        <div className="flex gap-1 text-[10px] text-gray-500">
                          {item.report.revenue.mensalidade.total > 0 && (
                            <span className="bg-blue-100 px-1 rounded">M</span>
                          )}
                          {item.report.revenue.pacotes.total > 0 && (
                            <span className="bg-orange-100 px-1 rounded">P</span>
                          )}
                          {item.report.revenue.servicos.total > 0 && (
                            <span className="bg-purple-100 px-1 rounded">S</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">Sem dados</div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-blue-100 rounded"></span>
          <span className="text-gray-600">M = Mensalidade</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-orange-100 rounded"></span>
          <span className="text-gray-600">P = Pacote</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-purple-100 rounded"></span>
          <span className="text-gray-600">S = Serviços</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Users className="w-3 h-3 text-blue-500" />
          <span className="text-gray-600">Não bolsistas / Bolsistas</span>
        </div>
      </div>
    </div>
  )
}
