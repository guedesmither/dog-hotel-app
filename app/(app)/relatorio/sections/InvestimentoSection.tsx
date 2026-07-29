'use client'

import { useEffect, useMemo, useState } from 'react'
import { Wallet, TrendingUp, TrendingDown, Building2, DollarSign, PieChart, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react'

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

const OPEX_CATS = ['FOLHA SALARIAL','ALUGUEL','ÁGUA','ENERGIA ELÉTRICA','INTERNET','CONTABILIDADE','COMUNICAÇÃO E MARKETING','MATERIAL LIMPEZA','IMPOSTO IPTU','ASSOCIAÇÃO','TAXA JUNTA COMERCIAL','TAXA BOMBEIROS','SISTEMA CARTÃO','OUTROS','PROLABORE']
const CAPEX_CATS = ['OBRA','INFRAESTRUTURA']

const ACCOUNTS = ['SEBÁ','VÊ','NICE']

const CAT_LABELS: Record<string, string> = {
  'FOLHA SALARIAL': 'Folha Salarial',
  'PROLABORE': 'Pró-labore',
  'ALUGUEL': 'Aluguel',
  'ÁGUA': 'Água',
  'ENERGIA ELÉTRICA': 'Energia Elétrica',
  'INTERNET': 'Internet / Telefone',
  'CONTABILIDADE': 'Contabilidade',
  'COMUNICAÇÃO E MARKETING': 'Comunicação e Marketing',
  'MATERIAL LIMPEZA': 'Material de Limpeza',
  'IMPOSTO IPTU': 'IPTU',
  'ASSOCIAÇÃO': 'Associação',
  'TAXA JUNTA COMERCIAL': 'Junta Comercial',
  'TAXA BOMBEIROS': 'Bombeiros',
  'SISTEMA CARTÃO': 'Sistema de Cartão',
  'OUTROS': 'Outros',
  'OBRA': 'Obra / Construção',
  'INFRAESTRUTURA': 'Infraestrutura / Equipamentos',
  'ENTRADA CAIXA': 'Entrada de Caixa',
  'APORTE NICE': 'Aporte de Capital (NICE)',
  'APORTE SÓCIOS': 'Aporte de Sócios',
  'ADIANTAMENTO SÓCIO': 'Adiantamento de Sócio',
  'APLICAÇÃO FINANCEIRA': 'Aplicação Financeira',
}

function fmtMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtPct(v: number) {
  return `${v.toFixed(1)}%`
}

function Card({ label, value, sub, color = 'gray', icon: Icon }: { label: string; value: string; sub?: string; color?: 'green'|'red'|'blue'|'amber'|'violet'|'gray'|'emerald'|'slate'; icon: any }) {
  const colors = {
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  }
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <Icon className="w-5 h-5 opacity-60" />
      </div>
      <div className="text-2xl font-extrabold leading-none mb-1">{value}</div>
      <div className="text-xs font-semibold opacity-60 uppercase tracking-wide">{label}</div>
      {sub && <div className="text-xs opacity-50 mt-1">{sub}</div>}
    </div>
  )
}

function EntryTable({ entries, colorClass }: { entries: FinancialEntry[]; colorClass: string }) {
  if (!entries.length) return <div className="text-xs text-gray-400 italic py-2">Nenhum lançamento.</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase">
            <th className="px-3 py-2 text-left">Data</th>
            <th className="px-3 py-2 text-left">Conta</th>
            <th className="px-3 py-2 text-left">Categoria</th>
            <th className="px-3 py-2 text-left">Descrição / Fornecedor</th>
            <th className="px-3 py-2 text-right">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {entries.sort((a,b) => a.date.localeCompare(b.date)).map(e => (
            <tr key={e.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-2 text-gray-500 font-mono">{fmtDate(e.date)}</td>
              <td className="px-3 py-2 font-medium text-gray-700">{e.account}</td>
              <td className="px-3 py-2 text-gray-500">{CAT_LABELS[e.category] || e.category}</td>
              <td className="px-3 py-2 text-gray-700 truncate max-w-[220px]">{e.description || e.supplier || '—'}</td>
              <td className={`px-3 py-2 text-right font-mono font-semibold ${colorClass}`}>{fmtMoney(e.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function InvestimentoSection() {
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [sales, setSales] = useState<SalesMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<Record<string, boolean>>({ aportes: true, gastos: false })

  useEffect(() => {
    async function load() {
      const [finRes, salesRes] = await Promise.all([
        fetch('/api/financeiro'),
        fetch('/api/sales/analytics'),
      ])
      const fin = await finRes.json()
      const s = await salesRes.json()
      setEntries(Array.isArray(fin) ? fin : [])
      setSales(Array.isArray(s?.byMonth) ? s.byMonth : [])
      setLoading(false)
    }
    load()
  }, [])

  const totals = useMemo(() => {
    // Capital aplicado pelos sócios (contas SEBÁ, VÊ, NICE) — entradas desde antes das operações
    const aportes = entries.filter(e => e.type === 'E' && ACCOUNTS.includes(e.account))
    const aportePorConta: Record<string, number> = {}
    for (const acc of ACCOUNTS) {
      aportePorConta[acc] = aportes.filter(e => e.account === acc).reduce((s, e) => s + e.amount, 0)
    }
    const totalAportes = aportes.reduce((s, e) => s + e.amount, 0)

    // Tudo que saiu das contas = gasto interno total, incluindo OPEX, CAPEX, reinvestimentos
    const gastos = entries.filter(e => e.type === 'S')
    const opex = gastos.filter(e => OPEX_CATS.includes(e.category)).reduce((s, e) => s + e.amount, 0)
    const capex = gastos.filter(e => CAPEX_CATS.includes(e.category)).reduce((s, e) => s + e.amount, 0)
    const prolabore = gastos.filter(e => e.category === 'PROLABORE').reduce((s, e) => s + e.amount, 0)
    const aplicacao = gastos.filter(e => e.category === 'APLICAÇÃO FINANCEIRA').reduce((s, e) => s + e.amount, 0)
    const totalGastos = gastos.reduce((s, e) => s + e.amount, 0)

    // Receita operacional AUÊ: soma de vendas (faturamento líquido)
    const totalReceita = sales.reduce((s, m) => s + m.net, 0)
    const totalRecebido = sales.reduce((s, m) => s + m.received, 0)

    // Análise simples de caixa: tudo que saiu vs tudo que entrou de vendas
    const resultante = totalRecebido - totalGastos
    const taxaAmortizacao = totalGastos > 0 ? (totalRecebido / totalGastos) * 100 : 0

    return {
      aportes, aportePorConta, totalAportes,
      gastos, opex, capex, prolabore, aplicacao, totalGastos,
      totalReceita, totalRecebido,
      resultante, taxaAmortizacao
    }
  }, [entries, sales])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm">Carregando dados...</p>
      </div>
    </div>
  )

  const toggle = (key: string) => setOpen(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            Investimento, Capital & Payback
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Análise de aportes, retorno e amortização do investimento</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Total Gasto" value={fmtMoney(totals.totalGastos)} sub="OPEX + CAPEX + obra inicial + retiradas" color="violet" icon={Building2} />
        <Card label="Total Recebido AUÊ" value={fmtMoney(totals.totalRecebido)} sub={`${sales.reduce((s,m)=>s+m.count,0)} vendas · faturamento líq. ${fmtMoney(totals.totalReceita)}`} color="green" icon={DollarSign} />
        <Card label="Resultante" value={fmtMoney(totals.resultante)} sub={totals.resultante >= 0 ? 'Recebido maior que gasto' : 'Gasto maior que recebido'} color={totals.resultante >= 0 ? 'emerald' : 'red'} icon={ArrowRight} />
        <Card label="Amortização" value={fmtPct(totals.taxaAmortizacao)} sub={`${totals.taxaAmortizacao >= 100 ? 'Total já amortizado' : 'Ainda faltam ' + (100 - totals.taxaAmortizacao).toFixed(1) + '%'}`} color={totals.taxaAmortizacao >= 100 ? 'emerald' : 'amber'} icon={PieChart} />
      </div>

      {/* Resumo técnico */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ArrowRight className="w-4 h-4 text-emerald-600" /> Análise de Amortização</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase">Total Gasto</div>
            <div className="text-xl font-bold text-slate-700 mt-1">{fmtMoney(totals.totalGastos)}</div>
            <div className="text-xs text-gray-400 mt-1">OPEX + CAPEX + obra inicial + retiradas + aplicações</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase">Total Recebido</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">{fmtMoney(totals.totalRecebido)}</div>
            <div className="text-xs text-gray-400 mt-1">Caixa de vendas AUÊ</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-500 uppercase">Resultante</div>
            <div className={`text-xl font-bold mt-1 ${totals.resultante >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtMoney(totals.resultante)}</div>
            <div className="text-xs text-gray-400 mt-1">Recebido − Gasto</div>
          </div>
        </div>
        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
          <strong>Como interpretar:</strong> o <em>Total Gasto</em> é tudo que já saiu das contas até hoje — inclui OPEX, CAPEX, investimento na obra inicial, retiradas e aplicações financeiras. O <em>Total Recebido</em> é o caixa real das vendas na AUÊ. O <em>Resultante</em> é a diferença entre os dois, e a <em>Amortização</em> mostra quanto do gasto total já foi recuperado pelas vendas.
        </div>
      </div>

      {/* Aportes com linhas abertas */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <button onClick={() => toggle('aportes')} className="w-full px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors">
          <div className="text-left">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Wallet className="w-4 h-4 text-blue-600" /> Aportes de Capital — linhas abertas</h3>
            <p className="text-xs text-gray-400">Tudo que entrou nas contas dos sócios, desde antes das operações</p>
          </div>
          {open.aportes ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        {open.aportes && (
          <div className="p-4 space-y-4">
            {ACCOUNTS.map(acc => {
              const accEntries = totals.aportes.filter(e => e.account === acc)
              const accTotal = totals.aportePorConta[acc]
              if (!accTotal) return null
              return (
                <div key={acc} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-blue-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-bold text-blue-800 text-sm">Conta {acc}</span>
                    <span className="font-bold text-blue-800 text-sm font-mono">{fmtMoney(accTotal)}</span>
                  </div>
                  <EntryTable entries={accEntries} colorClass="text-blue-700" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Gastos com linhas abertas */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <button onClick={() => toggle('gastos')} className="w-full px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors">
          <div className="text-left">
            <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-600" /> Gastos Internos — linhas abertas</h3>
            <p className="text-xs text-gray-400">Tudo que saiu, incluindo OPEX, CAPEX e reinvestimentos</p>
          </div>
          {open.gastos ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        {open.gastos && (
          <div className="p-4 space-y-4">
            {[
              { key: 'OPEX', label: 'Despesas Operacionais (OPEX)', entries: totals.gastos.filter(e => OPEX_CATS.includes(e.category) && e.category !== 'PROLABORE'), total: totals.opex - totals.prolabore, color: 'text-orange-700' },
              { key: 'CAPEX', label: 'Investimentos em Estrutura (CAPEX)', entries: totals.gastos.filter(e => CAPEX_CATS.includes(e.category)), total: totals.capex, color: 'text-violet-700' },
              { key: 'PROLABORE', label: 'Retiradas / Pró-labore', entries: totals.gastos.filter(e => e.category === 'PROLABORE'), total: totals.prolabore, color: 'text-amber-700' },
              { key: 'APLI', label: 'Aplicações Financeiras', entries: totals.gastos.filter(e => e.category === 'APLICAÇÃO FINANCEIRA'), total: totals.aplicacao, color: 'text-sky-700' },
            ].map(grupo => !grupo.total ? null : (
              <div key={grupo.key} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-bold text-gray-700 text-sm">{grupo.label}</span>
                  <span className="font-bold text-gray-800 text-sm font-mono">{fmtMoney(grupo.total)}</span>
                </div>
                <EntryTable entries={grupo.entries} colorClass={grupo.color} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
