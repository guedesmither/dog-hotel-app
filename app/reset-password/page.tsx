'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''

  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setChecking(false); return }
    fetch(`/api/auth/reset-password?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) { setValid(true); setUserName(d.name) }
      })
      .finally(() => setChecking(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres'); return }
    if (password !== confirm) { toast.error('Senhas não coincidem'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
      toast.success('Senha redefinida com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao redefinir senha')
    } finally {
      setSaving(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-4xl animate-bounce">🐾</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🐶</div>
          <h1 className="text-xl font-bold text-gray-900">AU-Ê Petcare</h1>
          <p className="text-sm text-gray-500 mt-1">Redefinição de Senha</p>
        </div>

        {!valid ? (
          <div className="text-center space-y-4">
            <div className="text-5xl">⚠️</div>
            <p className="text-gray-700 font-medium">Link inválido ou expirado</p>
            <p className="text-sm text-gray-500">Solicite um novo link ao administrador.</p>
            <button onClick={() => router.push('/login')} className="btn-primary w-full">
              Ir para o Login
            </button>
          </div>
        ) : done ? (
          <div className="text-center space-y-4">
            <div className="text-5xl">✅</div>
            <p className="text-gray-700 font-medium">Senha redefinida com sucesso!</p>
            <p className="text-sm text-gray-500">Agora você pode fazer login com sua nova senha.</p>
            <button onClick={() => router.push('/login')} className="btn-primary w-full">
              Ir para o Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">Olá, <strong>{userName}</strong>! Defina sua nova senha abaixo.</p>
            <div>
              <label className="label">Nova senha</label>
              <input
                type="password"
                className="input"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Confirmar senha</label>
              <input
                type="password"
                className="input"
                placeholder="Repita a senha"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? 'Salvando...' : 'Redefinir Senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
