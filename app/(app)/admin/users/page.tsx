'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, UserCheck, UserX, Link2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { ROLE_LABELS, ROLE_COLORS, formatDateShort } from '@/lib/utils'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
  tutorDogId: string | null
  tutorDog: { id: string; name: string } | null
}

interface DogOption { id: string; name: string; ownerName: string }

const ROLES = ['ADMIN', 'MANAGER', 'MONITOR', 'TUTOR']

const defaultForm = { id: '', name: '', email: '', role: 'MONITOR', password: '', active: true, tutorDogId: '' }

export default function UsersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const role = (session?.user as { role?: string })?.role || ''

  const [users, setUsers] = useState<UserItem[]>([])
  const [dogs, setDogs] = useState<DogOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const [generatingReset, setGeneratingReset] = useState<string | null>(null)

  useEffect(() => {
    if (role && role !== 'ADMIN') { router.push('/dashboard'); return }
    if (role === 'ADMIN') { loadUsers(); loadDogs() }
  }, [role, router])

  async function loadUsers() {
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  async function loadDogs() {
    const res = await fetch('/api/dogs?active=true')
    if (res.ok) setDogs(await res.json())
  }

  function openCreate() {
    setForm(defaultForm)
    setEditing(false)
    setShowForm(true)
  }

  function openEdit(user: UserItem) {
    setForm({ ...user, password: '', tutorDogId: user.tutorDogId || '' })
    setEditing(true)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email) { toast.error('Preencha nome e email'); return }
    if (!editing && !form.password) { toast.error('Senha obrigatória para novo usuário'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/users', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro')
      }
      toast.success(editing ? 'Usuário atualizado!' : 'Usuário criado!')
      setShowForm(false)
      await loadUsers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function generateResetLink(userId: string) {
    setGeneratingReset(userId)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResetLink(data.url)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar link')
    } finally {
      setGeneratingReset(null)
    }
  }

  async function toggleActive(user: UserItem) {
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, active: !user.active }),
      })
      toast.success(user.active ? 'Usuário desativado' : 'Usuário ativado')
      await loadUsers()
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-4xl animate-bounce">🐾</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {resetLink && (
        <div className="card mb-6 border-green-200 bg-green-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-green-800 mb-1">🔗 Link de redefinição de senha (válido por 24h)</p>
              <p className="text-xs text-green-700 break-all font-mono bg-white rounded p-2 border border-green-200">{resetLink}</p>
              <p className="text-xs text-gray-500 mt-1">Envie este link para o usuário pelo WhatsApp ou email.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { navigator.clipboard.writeText(resetLink); toast.success('Link copiado!') }}
                className="btn-secondary flex items-center gap-1.5 text-xs"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar
              </button>
              <button onClick={() => setResetLink(null)} className="text-gray-400 hover:text-gray-600 text-xs px-2">✕</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card mb-6 border-amber-200">
          <h2 className="font-semibold text-gray-800 mb-4">{editing ? '✏️ Editar Usuário' : '➕ Novo Usuário'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome *</label>
              <input className="input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Nome completo" />
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="label">Perfil</label>
              <select className="select" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value, tutorDogId: '' }))}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
              </select>
            </div>
            {form.role === 'TUTOR' && (
              <div>
                <label className="label">Cão vinculado *</label>
                <select className="select" value={form.tutorDogId} onChange={(e) => setForm((p) => ({ ...p, tutorDogId: e.target.value }))} required>
                  <option value="">Selecione o cão...</option>
                  {dogs.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} — {d.ownerName}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="label">{editing ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder={editing ? 'Deixe em branco para não alterar' : 'Mínimo 6 caracteres'} />
            </div>
            {editing && (
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  className="w-4 h-4 accent-amber-600"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">Usuário ativo</label>
              </div>
            )}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? 'Salvando...' : (editing ? 'Atualizar' : 'Criar Usuário')}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-2 font-semibold text-gray-600">Nome</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-600">Email</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-600">Perfil</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-600">Cão vinculado</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-600">Status</th>
                <th className="text-left py-3 px-2 font-semibold text-gray-600">Criado em</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${!user.active ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-2 font-medium text-gray-900">{user.name}</td>
                  <td className="py-3 px-2 text-gray-600">{user.email}</td>
                  <td className="py-3 px-2">
                    <span className={`badge ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500 text-xs">
                    {user.tutorDog ? <span className="badge bg-amber-50 text-amber-700">🐾 {user.tutorDog.name}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="py-3 px-2">
                    <span className={`badge ${user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {user.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-gray-500">{formatDateShort(user.createdAt.split('T')[0])}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(user)} title="Editar" className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => generateResetLink(user.id)}
                        disabled={generatingReset === user.id}
                        title="Gerar link de redefinição de senha"
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Link2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleActive(user)} title={user.active ? 'Desativar' : 'Ativar'} className={`p-1.5 rounded-lg transition-colors ${user.active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                        {user.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
