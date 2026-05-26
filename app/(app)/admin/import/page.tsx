'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ImportDataPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      const response = await fetch('/api/import-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      
      if (result.success) {
        setResult(result)
      } else {
        setError(result.error || 'Erro ao importar dados')
      }
    } catch (err) {
      setError('Erro ao processar arquivo: ' + String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-[#4D2075]">
        Importar Dados
      </h1>

      <div className="card mb-6">
        <p className="text-gray-600 mb-4">
          Selecione o arquivo <strong>data-export.json</strong> gerado na exportação:
        </p>

        <input
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          disabled={loading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#4AA8AE] file:text-white hover:file:bg-[#3d8a8f]"
        />

        {loading && (
          <p className="mt-4 text-[#4AA8AE] font-medium">
            Importando dados... Aguarde...
          </p>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
            ❌ {error}
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-lg">
            ✅ {result.message}
            <div className="mt-2 text-sm">
              <p>👤 Usuários: {result.counts?.users || 0}</p>
              <p>🐕 Cães: {result.counts?.dogs || 0}</p>
              <p>💰 Vendas: {result.counts?.sales || 0}</p>
              <p>📅 Agenda: {result.counts?.dailyRosters || 0}</p>
              <p>🏨 Estadias: {result.counts?.stays || 0}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => router.push('/admin/users')}
          className="btn-secondary"
        >
          Voltar
        </button>
        <button
          onClick={() => router.push('/')}
          className="btn-primary"
        >
          Ir para Dashboard
        </button>
      </div>
    </div>
  )
}
