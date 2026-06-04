'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

export default function FerramentasPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || ''

  const [loadingMatriculas, setLoadingMatriculas] = useState(false)
  const [resultMatriculas, setResultMatriculas] = useState<any>(null)

  const [loadingPackages, setLoadingPackages] = useState(false)
  const [resultPackages, setResultPackages] = useState<any>(null)

  if (role !== 'ADMIN') {
    return <div className="p-8 text-red-600 font-bold">Acesso negado. Somente ADMIN.</div>
  }

  const fixMatriculas = async () => {
    setLoadingMatriculas(true)
    setResultMatriculas(null)
    try {
      const res = await fetch('/api/dogs/fix-matriculas', { method: 'POST' })
      const data = await res.json()
      setResultMatriculas(data)
    } catch (e) {
      setResultMatriculas({ error: String(e) })
    } finally {
      setLoadingMatriculas(false)
    }
  }

  const fixPackages = async () => {
    setLoadingPackages(true)
    setResultPackages(null)
    try {
      const res = await fetch('/api/packages/fix-display', { method: 'POST' })
      const data = await res.json()
      setResultPackages(data)
    } catch (e) {
      setResultPackages({ error: String(e) })
    } finally {
      setLoadingPackages(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">🔧 Ferramentas de Admin</h1>

      {/* Matrículas */}
      <div className="bg-white rounded-xl border border-gray-200 shadow p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Corrigir Matrículas</h2>
          <p className="text-sm text-gray-500 mt-1">
            Aplica a lista oficial de matrículas (Sol=H001, Dory=C001, etc.) e distribui sequencialmente para cães novos.
          </p>
        </div>
        <button
          onClick={fixMatriculas}
          disabled={loadingMatriculas}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loadingMatriculas ? 'Corrigindo...' : '✅ Corrigir Matrículas Agora'}
        </button>

        {resultMatriculas && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-green-700">{resultMatriculas.message}</p>
            {resultMatriculas.error && (
              <p className="text-sm text-red-600">{resultMatriculas.error}</p>
            )}
            {resultMatriculas.all && (
              <div className="overflow-auto max-h-80 border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Cão</th>
                      <th className="text-left px-3 py-2">Matrícula</th>
                      <th className="text-left px-3 py-2">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultMatriculas.all.map((d: any) => (
                      <tr key={d.id} className="border-t">
                        <td className="px-3 py-1">{d.name}</td>
                        <td className="px-3 py-1 font-mono font-bold">{d.matricula}</td>
                        <td className={`px-3 py-1 ${d.action === 'SET_KNOWN' ? 'text-blue-600' : 'text-gray-500'}`}>
                          {d.action === 'SET_KNOWN' ? '✓ Lista oficial' : '→ Auto-sequencial'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pacotes */}
      <div className="bg-white rounded-xl border border-gray-200 shadow p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Corrigir Dias de Pacotes</h2>
          <p className="text-sm text-gray-500 mt-1">
            Recalcula os dias usados de cada pacote com base na agenda real, corrigindo valores negativos.
          </p>
        </div>
        <button
          onClick={fixPackages}
          disabled={loadingPackages}
          className="px-5 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
        >
          {loadingPackages ? 'Corrigindo...' : '✅ Corrigir Pacotes Agora'}
        </button>

        {resultPackages && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-green-700">{resultPackages.message}</p>
            {resultPackages.error && (
              <p className="text-sm text-red-600">{resultPackages.error}</p>
            )}
            {resultPackages.all && (
              <div className="overflow-auto max-h-80 border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Cão</th>
                      <th className="text-left px-3 py-2">Antes</th>
                      <th className="text-left px-3 py-2">Depois</th>
                      <th className="text-left px-3 py-2">Dias na agenda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultPackages.all.map((p: any) => (
                      <tr key={p.packageId} className="border-t">
                        <td className="px-3 py-1">{p.dogName}</td>
                        <td className="px-3 py-1 text-red-500">{p.before.display}</td>
                        <td className="px-3 py-1 text-green-600 font-bold">{p.after.display}</td>
                        <td className="px-3 py-1 text-gray-500">{p.rosterDays?.join(', ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
