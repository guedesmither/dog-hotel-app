'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Dog } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      toast.error('Email ou senha incorretos')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #A8D8DA 0%, #C8ECF0 40%, #D4B8E8 100%)' }}
    >
      {/* Paw decorations */}
      <span className="fixed top-10 left-10 text-4xl opacity-10 animate-bounce select-none pointer-events-none">🐾</span>
      <span className="fixed bottom-16 right-12 text-3xl opacity-10 select-none pointer-events-none" style={{ animation: 'paw-float 5s ease-in-out infinite' }}>🐾</span>
      <span className="fixed top-1/3 right-8 text-2xl opacity-10 select-none pointer-events-none" style={{ animation: 'paw-float 7s ease-in-out infinite 2s' }}>🐾</span>

      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-md p-8 border border-white/60">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="AU-Ê Petcare" className="h-24 w-auto mx-auto mb-3 object-contain" />
          <p className="text-sm font-medium" style={{ color: '#4AA8AE' }}>Creche & Hotel para Cães</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Usuário ou Email</label>
            <input
              type="text"
              className="input"
              placeholder="usuário ou email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="label">Senha</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2 py-3 text-base"
          >
            {loading ? '⏳ Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          AU-Ê Petcare © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
