'use client'

import { useState } from 'react'

export default function ImportPage() {
  const [status, setStatus] = useState<string>('')

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus('Lendo arquivo...')
    const text = await file.text()
    const data = JSON.parse(text)

    setStatus('Importando dados...')
    const res = await fetch('/api/import-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await res.json()
    if (result.success) {
      setStatus(`✅ Importado! Users: ${result.counts.users}, Dogs: ${result.counts.dogs}`)
    } else {
      setStatus(`❌ Erro: ${result.error}`)
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Importar Dados</h1>
      <input type="file" accept=".json" onChange={handleFile} className="mb-4" />
      <p>{status}</p>
    </div>
  )
}
