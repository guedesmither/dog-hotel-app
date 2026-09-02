'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, PlusCircle, Dog, Phone, LogIn, Pencil, PowerOff } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface DogItem {
  id: string
  matricula: string | null
  name: string
  breed: string
  ownerName: string
  ownerPhone: string
  color: string | null
  weight: number | null
  photoUrl: string | null
  size: string | null
  sex: string | null
  serviceType: string | null
  scheduledDays: string | null
  isActive: boolean
  dogStatus: string
  stays: Array<{ active: boolean; room: string | null }>
}

export default function DogsPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || ''
  const [dogs, setDogs] = useState<DogItem[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'CRECHE' | 'HOTEL' | 'AVULSO' | 'INATIVO' | 'all'>('CRECHE')
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function setDogStatus(dog: DogItem, newStatus: string) {
    setTogglingId(dog.id)
    try {
      await fetch(`/api/dogs/${dog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dogStatus: newStatus }),
      })
      setDogs(prev =>
        filter === 'all'
          ? prev.map(d => d.id === dog.id ? { ...d, dogStatus: newStatus, isActive: newStatus !== 'INATIVO' } : d)
          : prev.filter(d => d.id !== dog.id)
      )
    } finally {
      setTogglingId(null)
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true)
      const param = filter === 'all' ? '?' : `?status=${filter}&`

      const q = search ? `search=${encodeURIComponent(search)}` : ''
      const res = await fetch(`/api/dogs${param}${q}`)
      const data = await res.json()
      setDogs(data)
      setLoading(false)
    }
    load()
  }, [search, filter])


  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cães Cadastrados</h1>
        {(role === 'ADMIN' || role === 'MANAGER') && (
          <Link href="/dogs/new" className="btn-primary flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Novo Cão
          </Link>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {([['CRECHE', '🐾 Creche'], ['HOTEL', '🏨 Hotel'], ['AVULSO', '🔀 Avulso'], ['INATIVO', '⏸️ Inativos'], ['all', '📋 Todos']] as const).map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? f === 'HOTEL' ? 'bg-blue-600 text-white'
                : f === 'AVULSO' ? 'bg-indigo-600 text-white'
                : f === 'INATIVO' ? 'bg-gray-500 text-white'
                : f === 'all' ? 'bg-gray-700 text-white'
                : 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          className="input pl-9"
          placeholder="Buscar por nome, raça ou tutor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-2 animate-bounce">🐾</div>
          <p>Carregando...</p>
        </div>
      ) : dogs.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🐕</div>
          <h3 className="font-semibold text-gray-700">Nenhum cão encontrado</h3>
          {(role === 'ADMIN' || role === 'MANAGER') && (
            <Link href="/dogs/new" className="btn-primary inline-flex items-center gap-2 mt-4">
              <PlusCircle className="w-4 h-4" />
              Cadastrar primeiro cão
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dogs.map((dog) => {
            const activeStay = dog.stays.find((s) => s.active)
            return (
              <div key={dog.id} className={`card hover:shadow-md transition-shadow ${!dog.isActive ? 'opacity-60 grayscale' : ''}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                    {dog.photoUrl ? (
                      <img src={dog.photoUrl} alt={dog.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Dog className="w-6 h-6 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900">{dog.name}</h3>
                      {dog.matricula && (
                        <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-600 text-white">{dog.matricula}</span>
                      )}
                      {activeStay ? (
                        <span className="badge bg-green-100 text-green-700">Hospedado</span>
                      ) : (
                        <span className="badge bg-gray-100 text-gray-500">Fora</span>
                      )}
                      {dog.dogStatus === 'CRECHE' && dog.serviceType !== 'Creche + Hotel' && (
                        <span className="badge bg-amber-50 text-amber-600">🐾 Creche</span>
                      )}
                      {dog.dogStatus === 'HOTEL' && dog.serviceType !== 'Creche + Hotel' && (
                        <span className="badge bg-blue-50 text-blue-600">🏨 Hotel</span>
                      )}
                      {dog.dogStatus === 'AVULSO' && (
                        <span className="badge bg-indigo-50 text-indigo-600">🔀 Avulso</span>
                      )}
                      {(dog.dogStatus === 'INATIVO' || !dog.isActive) && (
                        <span className="badge bg-gray-200 text-gray-500">⏸️ Inativo</span>
                      )}
                      {dog.serviceType === 'Creche + Hotel' && dog.dogStatus !== 'AVULSO' && (
                        <span className="badge bg-purple-50 text-purple-700">🐾🏨 Creche + Hotel</span>
                      )}
                      {dog.serviceType && dog.serviceType !== 'Creche + Hotel' && dog.serviceType !== 'Creche' && dog.serviceType !== 'Hotel' && (
                        <span className="badge bg-gray-50 text-gray-600">{dog.serviceType}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{dog.breed}</p>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {dog.size && <span className="text-xs text-gray-400">{dog.size}</span>}
                      {dog.weight && <span className="text-xs text-gray-400">{dog.weight} kg</span>}
                      {dog.sex ? <span className="text-xs text-gray-400">{dog.sex === 'femea' || dog.sex === 'Fêmea' || dog.sex === 'FEMEA' ? 'Fêmea' : dog.sex === 'macho' || dog.sex === 'Macho' || dog.sex === 'MACHO' ? 'Macho' : dog.sex}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">👤</span>
                    <span className="truncate">{dog.ownerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <a
                      href={`https://wa.me/${dog.ownerPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:underline text-xs"
                    >
                      {dog.ownerPhone}
                    </a>
                  </div>
                  {activeStay?.room && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-400">🏠</span>
                      <span className="text-xs">{activeStay.room}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  {activeStay && (
                    <Link
                      href={`/dogs/${dog.id}/report`}
                      className="flex-1 text-center text-xs bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-lg font-medium transition-colors"
                    >
                      📝 Relatório
                    </Link>
                  )}
                  <Link
                    href={`/dogs/${dog.id}`}
                    className="flex-1 text-center text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition-colors"
                  >
                    Ver Perfil
                  </Link>
                  {!activeStay && dog.isActive && (role === 'ADMIN' || role === 'MANAGER') && (
                    <Link
                      href={`/stays?dogId=${dog.id}`}
                      className="flex-1 text-center text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      Check-in
                    </Link>
                  )}
                  {(role === 'ADMIN' || role === 'MANAGER') && (
                    <div className="flex gap-1">
                      {(['CRECHE', 'HOTEL', 'AVULSO', 'INATIVO'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setDogStatus(dog, s)}
                          disabled={togglingId === dog.id}
                          title={s === 'CRECHE' ? 'Creche' : s === 'HOTEL' ? 'Hotel' : s === 'AVULSO' ? 'Avulso' : 'Inativo'}
                          className={`p-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50 ${
                            (dog.dogStatus === s || (!dog.isActive && s === 'INATIVO'))
                              ? s === 'CRECHE' ? 'bg-amber-500 text-white'
                                : s === 'HOTEL' ? 'bg-blue-500 text-white'
                                : s === 'AVULSO' ? 'bg-indigo-500 text-white'
                                : 'bg-gray-500 text-white'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {s === 'CRECHE' ? '🐾' : s === 'HOTEL' ? '🏨' : s === 'AVULSO' ? '🔀' : <PowerOff className="w-3 h-3" />}
                        </button>
                      ))}
                      <Link
                        href={`/dogs/${dog.id}/edit`}
                        className="p-1.5 rounded bg-gray-100 hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                        title="Editar cadastro"
                      >
                        <Pencil className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
