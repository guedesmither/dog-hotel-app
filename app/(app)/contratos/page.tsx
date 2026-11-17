'use client'

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Printer,
  Search,
  Upload,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Contract {
  id: string
  ownerKey: string
  ownerName: string
  dogIds: string
  dogNames: string
  status: 'GERADO' | 'ENVIADO' | 'ASSINADO'
  source: 'GERADO' | 'IMPORTADO'
  fileName: string
  mimeType: string
  version: number
  sentAt: string | null
  signedAt: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

interface Tutor {
  ownerKey: string
  ownerName: string
  ownerPhone: string
  dogs: Array<{ id: string; name: string }>
  latest: Contract | null
  count: number
}

interface ImportResult {
  fileName: string
  ownerName: string
  dogNames: string
  matched: boolean
  skipped: boolean
}

type Filter = 'TODOS' | 'SEM_CONTRATO' | 'GERADO' | 'ENVIADO' | 'ASSINADO'

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'SEM_CONTRATO', label: 'Sem contrato' },
  { value: 'GERADO', label: 'Gerado (não enviado)' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'ASSINADO', label: 'Assinado' },
]

const STATUS_STYLE: Record<Contract['status'], { label: string; className: string }> = {
  GERADO: { label: 'Gerado', className: 'bg-amber-100 text-amber-800' },
  ENVIADO: { label: 'Enviado', className: 'bg-blue-100 text-blue-800' },
  ASSINADO: { label: 'Assinado', className: 'bg-green-100 text-green-800' },
}

function formatDate(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

function statusDate(contract: Contract): string {
  if (contract.status === 'ASSINADO') return `Assinado em ${formatDate(contract.signedAt)}`
  if (contract.status === 'ENVIADO') return `Enviado em ${formatDate(contract.sentAt)}`
  return `Gerado em ${formatDate(contract.createdAt)}`
}

export default function ContratosPage() {
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('TODOS')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedDogs, setSelectedDogs] = useState<Record<string, string[]>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [importResults, setImportResults] = useState<ImportResult[]>([])

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/contracts')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Não foi possível carregar os contratos')
      const loadedTutors = data.tutors as Tutor[]
      setTutors(loadedTutors)
      setContracts(data.contracts as Contract[])
      setSelectedDogs(previous => {
        const next = { ...previous }
        for (const tutor of loadedTutors) {
          if (!next[tutor.ownerKey]) next[tutor.ownerKey] = tutor.dogs.map(dog => dog.id)
        }
        return next
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar contratos')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visibleTutors = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return tutors
      .filter(tutor => !query ||
        tutor.ownerName.toLocaleLowerCase('pt-BR').includes(query) ||
        tutor.dogs.some(dog => dog.name.toLocaleLowerCase('pt-BR').includes(query)))
      .filter(tutor => {
        if (filter === 'TODOS') return true
        if (filter === 'SEM_CONTRATO') return !tutor.latest
        return tutor.latest?.status === filter
      })
  }, [filter, search, tutors])

  const activeOwnerKeys = useMemo(() => new Set(tutors.map(tutor => tutor.ownerKey)), [tutors])
  const inactiveTutorContracts = useMemo(
    () => contracts.filter(contract => !activeOwnerKeys.has(contract.ownerKey)),
    [activeOwnerKeys, contracts],
  )

  function toggleHistory(ownerKey: string) {
    setExpanded(previous => {
      const next = new Set(previous)
      if (next.has(ownerKey)) next.delete(ownerKey)
      else next.add(ownerKey)
      return next
    })
  }

  function toggleDog(ownerKey: string, dogId: string) {
    setSelectedDogs(previous => {
      const selected = previous[ownerKey] || []
      const next = selected.includes(dogId)
        ? selected.filter(id => id !== dogId)
        : [...selected, dogId]
      return { ...previous, [ownerKey]: next }
    })
  }

  async function generateContract(tutor: Tutor) {
    if (tutor.count > 0 && !window.confirm(`Já existe contrato para ${tutor.ownerName}. Deseja gerar outro?`)) return
    const dogIds = selectedDogs[tutor.ownerKey] || tutor.dogs.map(dog => dog.id)
    if (dogIds.length === 0) {
      toast.error('Selecione ao menos um cão')
      return
    }

    setBusyKey(`generate-${tutor.ownerKey}`)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerKey: tutor.ownerKey, dogIds }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Não foi possível gerar o contrato')
      toast.success('Contrato gerado')
      await load(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar contrato')
    } finally {
      setBusyKey(null)
    }
  }

  async function updateStatus(contract: Contract, status: Contract['status']) {
    setBusyKey(contract.id)
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Não foi possível atualizar o status')
      toast.success(`Status atualizado: ${STATUS_STYLE[status].label}`)
      await load(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar status')
    } finally {
      setBusyKey(null)
    }
  }

  async function uploadVersion(contractId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setBusyKey(contractId)
    try {
      const res = await fetch(`/api/contracts/${contractId}/file`, { method: 'PUT', body: formData })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Não foi possível carregar o arquivo')
      toast.success('Nova versão carregada')
      await load(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar nova versão')
    } finally {
      event.target.value = ''
      setBusyKey(null)
    }
  }

  async function importOldContracts(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    formData.append('lastModified', JSON.stringify(files.map(file => file.lastModified)))
    setBusyKey('import')
    try {
      const res = await fetch('/api/contracts/import', { method: 'POST', body: formData })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Não foi possível importar os contratos')
      setImportResults(result.results as ImportResult[])
      const imported = (result.results as ImportResult[]).filter(item => !item.skipped).length
      toast.success(`${imported} contrato(s) importado(s)`)
      await load(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao importar contratos')
    } finally {
      event.target.value = ''
      setBusyKey(null)
    }
  }

  function contractActions(contract: Contract, withStatus = false) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/api/contracts/${contract.id}/file`}
          className="btn-secondary inline-flex items-center gap-2 text-sm"
        >
          <Download className="h-4 w-4" /> Baixar Word
        </a>
        <a
          href={`/contratos/${contract.id}/imprimir`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary inline-flex items-center gap-2 text-sm"
        >
          <Printer className="h-4 w-4" /> Baixar PDF
        </a>
        {withStatus && (
          <>
            <label className={`btn-secondary inline-flex cursor-pointer items-center gap-2 text-sm ${busyKey === contract.id ? 'pointer-events-none opacity-50' : ''}`}>
              <Upload className="h-4 w-4" /> Carregar versão editada
              <input
                type="file"
                accept=".docx,.pdf"
                className="hidden"
                disabled={busyKey === contract.id}
                onChange={event => void uploadVersion(contract.id, event)}
              />
            </label>
            {contract.status !== 'ENVIADO' && (
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={busyKey === contract.id}
                onClick={() => void updateStatus(contract, 'ENVIADO')}
              >
                Marcar como enviado
              </button>
            )}
            {contract.status !== 'ASSINADO' && (
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={busyKey === contract.id}
                onClick={() => void updateStatus(contract, 'ASSINADO')}
              >
                Marcar como assinado
              </button>
            )}
            {contract.status !== 'GERADO' && (
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={busyKey === contract.id}
                onClick={() => void updateStatus(contract, 'GERADO')}
              >
                Voltar para gerado
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
              <p className="text-sm text-gray-500">Gere, acompanhe e mantenha o histórico dos contratos.</p>
            </div>
          </div>
        </div>
        <label className={`btn-primary inline-flex cursor-pointer items-center justify-center gap-2 ${busyKey === 'import' ? 'pointer-events-none opacity-50' : ''}`}>
          <Upload className="h-4 w-4" />
          Importar contratos antigos
          <input
            type="file"
            accept=".pdf,.docx"
            multiple
            className="hidden"
            disabled={busyKey === 'import'}
            onChange={event => void importOldContracts(event)}
          />
        </label>
      </header>

      <section className="card space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-10"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar por tutor ou cão"
            aria-label="Buscar por tutor ou cão"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(item => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === item.value
                  ? 'bg-brand-purple text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="card py-12 text-center text-gray-500">Carregando contratos...</div>
      ) : visibleTutors.length === 0 ? (
        <div className="card py-12 text-center text-gray-500">Nenhum tutor encontrado.</div>
      ) : (
        <section className="space-y-4">
          {visibleTutors.map(tutor => {
            const latest = tutor.latest
            const history = contracts.filter(contract => contract.ownerKey === tutor.ownerKey)
            const selection = selectedDogs[tutor.ownerKey] || tutor.dogs.map(dog => dog.id)
            const status = latest ? STATUS_STYLE[latest.status] : null
            const isExpanded = expanded.has(tutor.ownerKey)

            return (
              <article key={tutor.ownerKey} className="card space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">{tutor.ownerName || 'Tutor sem nome'}</h2>
                      {status ? (
                        <span className={`badge ${status.className}`}>{status.label}</span>
                      ) : (
                        <span className="badge bg-red-100 text-red-700">Sem contrato</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{tutor.ownerPhone}</p>
                    <p className="mt-2 text-sm text-gray-700">
                      Cães: {tutor.dogs.map(dog => dog.name).join(', ')}
                    </p>
                    {latest && (
                      <p className="mt-1 text-xs text-gray-500">
                        {statusDate(latest)} · versão {latest.version} · {latest.fileName}
                      </p>
                    )}
                  </div>
                  {latest && (
                    <div className="flex flex-wrap gap-2 lg:max-w-[620px] lg:justify-end">
                      {contractActions(latest, true)}
                    </div>
                  )}
                </div>

                {tutor.dogs.length > 1 && (
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="mb-2 text-sm font-semibold text-gray-700">Cães incluídos no próximo contrato</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                      {tutor.dogs.map(dog => (
                        <label key={dog.id} className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={selection.includes(dog.id)}
                            onChange={() => toggleDog(tutor.ownerKey, dog.id)}
                            className="h-4 w-4 rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                          />
                          {dog.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn-primary inline-flex items-center gap-2"
                    disabled={busyKey === `generate-${tutor.ownerKey}` || selection.length === 0}
                    onClick={() => void generateContract(tutor)}
                  >
                    <FileText className="h-4 w-4" />
                    Gerar contrato
                  </button>
                  {history.length > 0 && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                      onClick={() => toggleHistory(tutor.ownerKey)}
                    >
                      Histórico ({history.length})
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    {history.map(contract => (
                      <div key={contract.id} className="rounded-xl bg-gray-50 p-3">
                        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                          <span className={`badge ${STATUS_STYLE[contract.status].className}`}>
                            {STATUS_STYLE[contract.status].label}
                          </span>
                          <span className="text-gray-600">{contract.fileName}</span>
                          <span className="text-xs text-gray-500">
                            {statusDate(contract)} · versão {contract.version}
                          </span>
                        </div>
                        {contractActions(contract)}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
        </section>
      )}

      <section className="card space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Contratos de tutores sem cadastro ativo</h2>
          <p className="mt-1 text-sm text-gray-500">
            Histórico de contratos sem um tutor correspondente entre os cadastros ativos.
          </p>
        </div>
        {inactiveTutorContracts.length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Nenhum contrato fora dos cadastros ativos.</p>
        ) : (
          <div className="space-y-3">
            {inactiveTutorContracts.map(contract => (
              <div key={contract.id} className="rounded-xl border border-gray-100 p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-800">{contract.ownerName}</span>
                  <span className={`badge ${STATUS_STYLE[contract.status].className}`}>
                    {STATUS_STYLE[contract.status].label}
                  </span>
                  <span className="text-sm text-gray-600">{contract.dogNames}</span>
                  <span className="text-xs text-gray-500">
                    {statusDate(contract)} · versão {contract.version}
                  </span>
                </div>
                {contractActions(contract)}
              </div>
            ))}
          </div>
        )}
      </section>

      {importResults.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Resultado da importação</h2>
          {importResults.map((result, index) => (
            <div key={`${result.fileName}-${index}`} className="flex flex-wrap items-center gap-2 text-sm">
              {result.skipped ? (
                <span className="badge bg-gray-100 text-gray-600">Já importado</span>
              ) : result.matched ? (
                <span className="badge bg-green-100 text-green-800"><Check className="mr-1 h-3 w-3" /> Importado</span>
              ) : (
                <span className="badge bg-amber-100 text-amber-800">Sem correspondência</span>
              )}
              <span className="font-medium text-gray-800">{result.fileName}</span>
              <span className="text-gray-500">— {result.ownerName}</span>
              {result.dogNames && <span className="text-gray-500">({result.dogNames})</span>}
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
