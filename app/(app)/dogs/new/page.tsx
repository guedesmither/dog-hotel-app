'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, ClipboardPaste, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

function parseFormCSV(raw: string): Partial<Record<string, string>> {
  const trimmed = raw.trim()
  const parts = trimmed.split('";"')
  const fields = parts.map((f) => f.replace(/^"+|"+$/g, '').trim())

  const vetRaw    = fields[15] || ''
  const vetName   = vetRaw.replace(/^Meu veterinário[:\s]*/i, '').trim()
  const diseases  = fields[8]  || ''

  return {
    ownerName:           fields[0]  || '',
    name:                fields[1]  || '',
    breed:               fields[3]  || '',
    sex:                 fields[4]  || '',
    castrated:           fields[5]  || '',
    temperament:         fields[6]  || '',
    size:                fields[7]  || '',
    allergies:           (fields[9] || '') === 'Nenhuma informada' ? '' : (fields[9] || ''),
    feedingType:         fields[10] || '',
    feedingInstructions: fields[11] || '',
    feedingTimesPerDay:  fields[12] || '',
    feedingGramsPerMeal: fields[13] || '',
    preferredActivities: fields[14] || '',
    vetName,
    allowPool:           fields[16] || '',
    allowPhotos:         fields[17] || '',
    serviceType:         fields[18] || '',
    scheduledDays:       fields[19] || '',
    notes:               fields[22] || '',
    ownerEmail:          fields[24] || '',
    ownerPhone:          fields[25] || '',
    ownerCpf:            fields[26] || '',
    medications:         (diseases && diseases !== 'Nenhuma informada') ? diseases : '',
  }
}

export default function NewDogPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checkIn, setCheckIn] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [matriculaSuggestion, setMatriculaSuggestion] = useState('')
  const [form, setForm] = useState({
    name: '', breed: '', birthDate: '', color: '', weight: '',
    sex: '', castrated: '', size: '', temperament: '',
    ownerName: '', ownerPhone: '', ownerEmail: '', ownerCpf: '',
    feedingType: '', feedingInstructions: '', feedingTimesPerDay: '', feedingGramsPerMeal: '',
    medications: '', allergies: '',
    preferredActivities: '',
    vetName: '', vetPhone: '',
    allowPool: '', allowPhotos: '',
    serviceType: '', scheduledDays: '', monthlyStartDay: '',
    dogStatus: 'CRECHE',
    matricula: '', enrollmentDate: '',
    notes: '', room: '',
    frequencyDays: '', agreedPrice: '', isHalfDay: ''
  })

  useEffect(() => {
    const st = form.serviceType
    if (st !== 'Creche' && st !== 'Hotel' && st !== 'Daycare') {
      setMatriculaSuggestion('')
      return
    }
    fetch(`/api/dogs/next-matricula?serviceType=${st}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.matricula) {
          setMatriculaSuggestion(d.matricula)
          setForm((prev) => ({ ...prev, matricula: d.matricula }))
        }
      })
      .catch(() => {})
  }, [form.serviceType])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleImport() {
    if (!importText.trim()) { toast.error('Cole o conteúdo da ficha primeiro'); return }
    try {
      const parsed = parseFormCSV(importText)
      setForm((prev) => ({ ...prev, ...parsed }))
      setShowImport(false)
      setImportText('')
      toast.success('Ficha importada! Confira os campos e salve.')
    } catch {
      toast.error('Não foi possível ler o formato. Verifique o conteúdo colado.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.breed || !form.ownerName || !form.ownerPhone) {
      toast.error('Preencha os campos obrigatórios')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/dogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, checkIn }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao cadastrar')
      }
      const dog = await res.json()
      toast.success('Cão cadastrado com sucesso!')
      router.push(`/dogs/${dog.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dogs" className="p-2 rounded-lg hover:bg-amber-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo Cão</h1>
      </div>

      {/* ── Bloco de importação de ficha ── */}
      <div className="card mb-6 border-blue-200 bg-blue-50">
        <button
          type="button"
          onClick={() => setShowImport(!showImport)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="flex items-center gap-2 font-semibold text-blue-800">
            <ClipboardPaste className="w-4 h-4" />
            Importar ficha recebida por e-mail
          </span>
          {showImport ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
        </button>

        {showImport && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-blue-700">
              Cole abaixo o conteúdo no formato de saída da ficha (campos separados por <code className="bg-blue-100 px-1 rounded">;</code> e entre aspas).
            </p>
            <textarea
              className="w-full border border-blue-200 rounded-lg px-3 py-2 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              rows={4}
              placeholder={`"Nome Tutor";"Nome Pet";"Idade";"Raça";...`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleImport}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <ClipboardPaste className="w-4 h-4" />
                Preencher formulário
              </button>
              <button
                type="button"
                onClick={() => { setShowImport(false); setImportText('') }}
                className="btn-secondary text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Dados do Cão */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🐕 Dados do Cão</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nome *</label>
              <input name="name" className="input" value={form.name} onChange={handleChange} required placeholder="Ex: Thor" />
            </div>
            <div>
              <label className="label">Raça *</label>
              <input name="breed" className="input" value={form.breed} onChange={handleChange} required placeholder="Ex: Golden Retriever" />
            </div>
            <div>
              <label className="label">Data de Nascimento</label>
              <input name="birthDate" type="date" className="input" value={form.birthDate} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Sexo</label>
              <select name="sex" className="select" value={form.sex} onChange={(e) => setForm(p => ({...p, sex: e.target.value}))}>
                <option value="">Não informado</option>
                <option value="macho">Macho</option>
                <option value="femea">Fêmea</option>
              </select>
            </div>
            <div>
              <label className="label">Castrado</label>
              <select name="castrated" className="select" value={form.castrated} onChange={(e) => setForm(p => ({...p, castrated: e.target.value}))}>
                <option value="">Não informado</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
            <div>
              <label className="label">Porte</label>
              <select name="size" className="select" value={form.size} onChange={(e) => setForm(p => ({...p, size: e.target.value}))}>
                <option value="">Não informado</option>
                <option value="mini">Mini</option>
                <option value="pequeno">Pequeno</option>
                <option value="medio">Médio</option>
                <option value="grande">Grande</option>
                <option value="gigante">Gigante</option>
              </select>
            </div>
            <div>
              <label className="label">Temperamento</label>
              <select name="temperament" className="select" value={form.temperament} onChange={(e) => setForm(p => ({...p, temperament: e.target.value}))}>
                <option value="">Não informado</option>
                <option value="calmo">Calmo</option>
                <option value="equilibrado">Equilibrado</option>
                <option value="muita-energia">Muita energia</option>
                <option value="agitado">Agitado</option>
                <option value="ansioso">Ansioso</option>
                <option value="agressivo">Agressivo</option>
              </select>
            </div>
            <div>
              <label className="label">Cor / Pelagem</label>
              <input name="color" className="input" value={form.color} onChange={handleChange} placeholder="Ex: Dourado" />
            </div>
            <div>
              <label className="label">Peso (kg)</label>
              <input name="weight" type="number" step="0.1" className="input" value={form.weight} onChange={handleChange} placeholder="Ex: 15.5" />
            </div>
          </div>
        </div>

        {/* Dados do Tutor */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">👤 Dados do Tutor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nome do Tutor *</label>
              <input name="ownerName" className="input" value={form.ownerName} onChange={handleChange} required placeholder="Ex: João Silva" />
            </div>
            <div>
              <label className="label">WhatsApp * (com DDI+DDD)</label>
              <input name="ownerPhone" className="input" value={form.ownerPhone} onChange={handleChange} required placeholder="Ex: 5511999990000" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="ownerEmail" type="email" className="input" value={form.ownerEmail} onChange={handleChange} placeholder="Ex: tutor@email.com" />
            </div>
            <div>
              <label className="label">CPF</label>
              <input name="ownerCpf" className="input" value={form.ownerCpf} onChange={handleChange} placeholder="000.000.000-00" />
            </div>
          </div>
        </div>

        {/* Alimentação */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🍽️ Alimentação</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de Alimentação</label>
              <select name="feedingType" className="select" value={form.feedingType} onChange={(e) => setForm(p => ({...p, feedingType: e.target.value}))}>
                <option value="">Não informado</option>
                <option value="seca">Ração seca</option>
                <option value="umida">Ração úmida</option>
                <option value="mista">Mista</option>
                <option value="natural">Natural / Caseira</option>
                <option value="raw">Raw (BARF)</option>
              </select>
            </div>
            <div>
              <label className="label">Vezes por dia</label>
              <input name="feedingTimesPerDay" className="input" value={form.feedingTimesPerDay} onChange={handleChange} placeholder="Ex: 3 vezes" />
            </div>
            <div>
              <label className="label">Quantidade por refeição</label>
              <input name="feedingGramsPerMeal" className="input" value={form.feedingGramsPerMeal} onChange={handleChange} placeholder="Ex: 150g" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Instruções especiais</label>
              <textarea name="feedingInstructions" className="textarea" rows={2} value={form.feedingInstructions} onChange={handleChange} placeholder="Ex: Ração misturada com legumes cozidos" />
            </div>
          </div>
        </div>

        {/* Saúde */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🏥 Saúde</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Alergias</label>
              <input name="allergies" className="input" value={form.allergies} onChange={handleChange} placeholder="Ex: Cenoura, biscoitos com banha suína" />
            </div>
            <div>
              <label className="label">Doenças pré-existentes / Medicações</label>
              <textarea name="medications" className="textarea" rows={2} value={form.medications} onChange={handleChange} placeholder="Ex: Nenhuma — ou — Simparic 1x/mês" />
            </div>
          </div>
        </div>

        {/* Comportamento */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🎮 Comportamento e Preferências</h2>
          <div>
            <label className="label">Brincadeiras preferidas</label>
            <textarea name="preferredActivities" className="textarea" rows={2} value={form.preferredActivities} onChange={handleChange} placeholder="Ex: Buscar brinquedos, brincadeiras com água" />
          </div>
        </div>

        {/* Veterinário */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🩺 Veterinário</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome / Clínica</label>
              <input name="vetName" className="input" value={form.vetName} onChange={handleChange} placeholder="Dr. Nome ou Clínica" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input name="vetPhone" className="input" value={form.vetPhone} onChange={handleChange} placeholder="5511999990000" />
            </div>
          </div>
        </div>

        {/* Autorizações */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🛡️ Autorizações</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Brincadeiras na piscina</label>
              <select name="allowPool" className="select" value={form.allowPool} onChange={(e) => setForm(p => ({...p, allowPool: e.target.value}))}>
                <option value="">Não informado</option>
                <option value="SIM">Sim</option>
                <option value="NAO">Não</option>
              </select>
            </div>
            <div>
              <label className="label">Fotos nas redes sociais</label>
              <select name="allowPhotos" className="select" value={form.allowPhotos} onChange={(e) => setForm(p => ({...p, allowPhotos: e.target.value}))}>
                <option value="">Não informado</option>
                <option value="SIM">Sim</option>
                <option value="NAO">Não</option>
              </select>
            </div>
          </div>
        </div>

        {/* Serviço */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🎯 Serviço Solicitado</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Classificação do cão *</label>
              <select name="dogStatus" className="select" value={form.dogStatus} onChange={(e) => setForm(p => ({...p, dogStatus: e.target.value}))}>
                <option value="CRECHE">🐾 Ativo Creche — aparece automaticamente na agenda pelos dias cadastrados</option>
                <option value="AVULSO">🔀 Ativo Avulso / Hotel — não entra automaticamente, adiciona manualmente na agenda</option>
                <option value="INATIVO">⏸️ Inativo — não aparece na agenda nem no painel de adição</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo de serviço</label>
              <select name="serviceType" className="select" value={form.serviceType} onChange={(e) => setForm(p => ({...p, serviceType: e.target.value}))}>
                <option value="">Não informado</option>
                <option value="Creche">Creche (C)</option>
                <option value="Hotel">Hotel (H)</option>
                <option value="Daycare">Daycare / Avulso (D)</option>
                <option value="Banho e Tosa">Banho e Tosa</option>
                <option value="Adestramento">Adestramento</option>
              </select>
            </div>
            <div>
              <label className="label">
                Matrícula
                {matriculaSuggestion && (
                  <span className="ml-2 text-xs text-amber-600 font-normal">sugestão: {matriculaSuggestion}</span>
                )}
              </label>
              <input
                name="matricula"
                className="input font-mono"
                value={form.matricula}
                onChange={handleChange}
                placeholder="Ex: C011"
                readOnly={!!matriculaSuggestion}
              />
            </div>
            <div>
              <label className="label">Dias da semana</label>
              <input name="scheduledDays" className="input" value={form.scheduledDays} onChange={handleChange} placeholder="Ex: Segunda, Terça, Quarta" />
            </div>
            <div>
              <label className="label">Dia de início da mensalidade</label>
              <input name="monthlyStartDay" type="number" min="1" max="31" className="input" value={form.monthlyStartDay} onChange={handleChange} placeholder="Ex: 1, 5, 15" />
            </div>
            <div>
              <label className="label">Data de matrícula</label>
              <input name="enrollmentDate" type="date" className="input" value={form.enrollmentDate} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Valores */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">💰 Valores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Frequência (dias por semana)</label>
              <select name="frequencyDays" className="select" value={form.frequencyDays || ''} onChange={(e) => setForm(p => ({...p, frequencyDays: e.target.value}))}>
                <option value="">Não informado</option>
                <option value="1">1 dia por semana</option>
                <option value="2">2 dias por semana</option>
                <option value="3">3 dias por semana</option>
                <option value="4">4 dias por semana</option>
                <option value="5">5 dias por semana</option>
                <option value="6">6 dias por semana</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo</label>
              <select name="isHalfDay" className="select" value={form.isHalfDay || ''} onChange={(e) => setForm(p => ({...p, isHalfDay: e.target.value}))}>
                <option value="">Período Integral</option>
                <option value="true">Meio Período</option>
              </select>
            </div>
            <div>
              <label className="label">Valor acordado mensal (R$)</label>
              <input name="agreedPrice" type="number" step="0.01" className="input" value={form.agreedPrice || ''} onChange={(e) => setForm(p => ({...p, agreedPrice: e.target.value}))} placeholder="Ex: 800.00" />
              <p className="text-xs text-gray-500 mt-1">O desconto é calculado automaticamente com base na tabela de preços</p>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">📝 Observações</h2>
          <textarea name="notes" className="textarea" rows={3} value={form.notes} onChange={handleChange} placeholder="Outras informações relevantes..." />
        </div>

        {/* Estadia */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🏠 Estadia</h2>
          <div className="flex items-center gap-3 mb-3">
            <input type="checkbox" id="checkIn" checked={checkIn} onChange={(e) => setCheckIn(e.target.checked)} className="w-4 h-4 accent-amber-600" />
            <label htmlFor="checkIn" className="text-sm font-medium text-gray-700">Fazer check-in agora</label>
          </div>
          {checkIn && (
            <div>
              <label className="label">Quarto / Baia</label>
              <input name="room" className="input" value={form.room} onChange={handleChange} placeholder="Ex: Suite 3" />
            </div>
          )}
        </div>

        <div className="flex gap-3 pb-6">
          <Link href="/dogs" className="btn-secondary flex-1 text-center">
            Cancelar
          </Link>
          <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Cadastrar Cão'}
          </button>
        </div>
      </form>
    </div>
  )
}
