'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, XCircle, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react'

const ACCOUNTS = ['AUÊ', 'SEBÁ', 'VÊ', 'NICE']

const CATEGORY_COLORS: Record<string, string> = {
  'ENTRADA CAIXA': 'bg-emerald-100 text-emerald-700',
  'FOLHA SALARIAL': 'bg-blue-100 text-blue-700',
  'ALUGUEL': 'bg-orange-100 text-orange-700',
  'PROLABORE': 'bg-amber-100 text-amber-700',
  'ENERGIA ELÉTRICA': 'bg-yellow-100 text-yellow-700',
  'ÁGUA': 'bg-cyan-100 text-cyan-700',
  'CONTABILIDADE': 'bg-indigo-100 text-indigo-700',
  'COMUNICAÇÃO E MARKETING': 'bg-pink-100 text-pink-700',
  'INTERNET': 'bg-violet-100 text-violet-700',
  'IMPOSTO IPTU': 'bg-red-100 text-red-700',
  'OBRA': 'bg-stone-100 text-stone-700',
  'INFRAESTRUTURA': 'bg-slate-100 text-slate-700',
  'OUTROS': 'bg-gray-100 text-gray-600',
}

function fmtMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

interface PreviewEntry {
  type: string
  date: string
  amount: number
  account: string
  supplier?: string
  description?: string
  category: string
  period: string
}

export default function ImportarPage() {
  const [account, setAccount] = useState('AUÊ')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewEntry[] | null>(null)
  const [skipped, setSkipped] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; duplicates: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSkipped, setShowSkipped] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFile(f)
    setPreview(null)
    setResult(null)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handlePreview = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('account', account)
      fd.append('dryRun', 'true')
      const res = await fetch('/api/financeiro/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao processar arquivo')
      setPreview(data.preview)
      setSkipped(data.skipped || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('account', account)
      fd.append('dryRun', 'false')
      const res = await fetch('/api/financeiro/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao importar')
      setResult(data)
      setPreview(null)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const totalEntradas = preview?.filter(e => e.type === 'E').reduce((s, e) => s + e.amount, 0) || 0
  const totalSaidas = preview?.filter(e => e.type === 'S').reduce((s, e) => s + e.amount, 0) || 0

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="w-6 h-6 text-emerald-600" />
            Importar Extrato
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Carregue um CSV do InfinityPay, PicPay ou extrato bancário</p>
        </div>
        <a href="/lancamentos" className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Lançamentos
        </a>
      </div>

      {/* Config */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Conta de destino</label>
            <select
              value={account}
              onChange={e => setAccount(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Arquivo CSV</label>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.txt"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
              id="csv-input"
            />
            <label
              htmlFor="csv-input"
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
            >
              <FileText className="w-4 h-4 shrink-0" />
              {file ? <span className="font-medium text-gray-700 truncate">{file.name}</span> : <span>Clique ou arraste o arquivo aqui</span>}
            </label>
          </div>
        </div>

        {/* Formato esperado */}
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-600">Formatos suportados:</p>
          <p>• <strong>InfinityPay / PicPay:</strong> CSV com colunas Data, Descrição, Valor (separador ; ou ,)</p>
          <p>• <strong>Extrato bancário:</strong> CSV com Data, Histórico, Beneficiário, Valor</p>
          <p>• Datas aceitas: <code>DD/MM/AAAA</code> ou <code>AAAA-MM-DD</code> — Valores: <code>1.234,56</code> ou <code>-1234.56</code></p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePreview}
            disabled={!file || loading}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {loading && !preview ? 'Processando...' : 'Pré-visualizar'}
          </button>
          {preview && preview.length > 0 && (
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 transition-colors"
            >
              {loading ? 'Importando...' : `Importar ${preview.length} lançamentos`}
            </button>
          )}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-emerald-800">Importação concluída!</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="bg-white rounded-lg p-3 text-center border border-emerald-100">
              <div className="text-2xl font-bold text-emerald-700">{result.imported}</div>
              <div className="text-xs text-emerald-600 font-medium">importados</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center border border-gray-100">
              <div className="text-2xl font-bold text-gray-500">{result.duplicates}</div>
              <div className="text-xs text-gray-400 font-medium">já existiam</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center border border-orange-100">
              <div className="text-2xl font-bold text-orange-500">{result.skipped}</div>
              <div className="text-xs text-orange-400 font-medium">ignorados</div>
            </div>
          </div>
          <a href="/lancamentos" className="inline-block mt-2 text-sm text-emerald-600 underline hover:text-emerald-800">
            Ver lançamentos →
          </a>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-gray-800">Pré-visualização — {preview.length} lançamentos detectados</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Entradas: <span className="text-emerald-600 font-medium">{fmtMoney(totalEntradas)}</span>
                {' · '}
                Saídas: <span className="text-red-500 font-medium">{fmtMoney(totalSaidas)}</span>
                {' · '}
                Conta: <span className="font-medium text-gray-600">{account}</span>
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
              <AlertCircle className="w-3.5 h-3.5" />
              Revise as categorias antes de importar
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-gray-400 font-semibold uppercase">Data</th>
                  <th className="px-4 py-2 text-left text-gray-400 font-semibold uppercase">Descrição / Fornecedor</th>
                  <th className="px-4 py-2 text-left text-gray-400 font-semibold uppercase">Categoria</th>
                  <th className="px-4 py-2 text-left text-gray-400 font-semibold uppercase">Per.</th>
                  <th className="px-4 py-2 text-right text-gray-400 font-semibold uppercase">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.map((e, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 font-mono text-gray-400">{fmtDate(e.date)}</td>
                    <td className="px-4 py-2 max-w-[240px]">
                      <div className="text-gray-700 truncate">{e.description || '—'}</div>
                      {e.supplier && e.supplier !== e.description && (
                        <div className="text-gray-400 truncate">{e.supplier}</div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORY_COLORS[e.category] || 'bg-gray-100 text-gray-600'}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-400 font-mono">{e.period === 'PRE_INAUGURACAO' ? 'PRÉ' : e.period.replace('2026-', '')}</td>
                    <td className={`px-4 py-2 text-right font-mono font-semibold ${e.type === 'E' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {e.type === 'E' ? '+' : '−'}{fmtMoney(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Linhas ignoradas */}
          {skipped.length > 0 && (
            <div className="border-t border-gray-100">
              <button
                onClick={() => setShowSkipped(v => !v)}
                className="w-full px-6 py-2.5 flex items-center gap-2 text-xs text-orange-500 hover:bg-orange-50 transition-colors"
              >
                {showSkipped ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                {skipped.length} linha{skipped.length > 1 ? 's' : ''} ignorada{skipped.length > 1 ? 's' : ''} (erro de parse)
              </button>
              {showSkipped && (
                <div className="px-6 pb-3 space-y-0.5">
                  {skipped.map((s, i) => (
                    <p key={i} className="text-xs text-orange-400 font-mono">{s}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
