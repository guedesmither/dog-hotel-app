'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Save, Camera, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EditDogPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role || ''
  const isTutor = role === 'TUTOR'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
    enrollmentDate: '',
    notes: '',
    frequencyDays: '', agreedPrice: '', isHalfDay: '', isBolsista: '',
    vaccineV10Date: '', vaccineV10Next: '',
    vaccineRabiesDate: '', vaccineRabiesNext: '',
    vaccineFluDate: '', vaccineFluNext: '',
    vaccineGiardiaDate: '', vaccineGiardiaNext: '',
    giardiaExamNotes: '',
  })
  const [vaccineCardUrl, setVaccineCardUrl] = useState<string | null>(null)
  const [uploadingCard, setUploadingCard] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploadingDogPhoto, setUploadingDogPhoto] = useState(false)
  const cardPhotoRef = useRef<HTMLInputElement>(null)
  const dogPhotoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/dogs/${params.id}`)
      if (!res.ok) { router.push('/dogs'); return }
      const dog = await res.json()
      setForm({
        name: dog.name || '',
        breed: dog.breed || '',
        birthDate: dog.birthDate || '',
        color: dog.color || '',
        weight: dog.weight?.toString() || '',
        sex: dog.sex || '',
        castrated: dog.castrated === true ? 'true' : dog.castrated === false ? 'false' : '',
        size: dog.size || '',
        temperament: dog.temperament || '',
        ownerName: dog.ownerName || '',
        ownerPhone: dog.ownerPhone || '',
        ownerEmail: dog.ownerEmail || '',
        ownerCpf: dog.ownerCpf || '',
        feedingType: dog.feedingType || '',
        feedingInstructions: dog.feedingInstructions || '',
        feedingTimesPerDay: dog.feedingTimesPerDay || '',
        feedingGramsPerMeal: dog.feedingGramsPerMeal || '',
        medications: dog.medications || '',
        allergies: dog.allergies || '',
        preferredActivities: dog.preferredActivities || '',
        vetName: dog.vetName || '',
        vetPhone: dog.vetPhone || '',
        allowPool: dog.allowPool === true ? 'SIM' : dog.allowPool === false ? 'NAO' : '',
        allowPhotos: dog.allowPhotos === true ? 'SIM' : dog.allowPhotos === false ? 'NAO' : '',
        serviceType: dog.serviceType || '',
        scheduledDays: dog.scheduledDays || '',
        monthlyStartDay: dog.monthlyStartDay?.toString() || '',
        dogStatus: dog.dogStatus || (dog.isActive ? 'CRECHE' : 'INATIVO'),
        enrollmentDate: dog.enrollmentDate || '',
        notes: dog.notes || '',
        frequencyDays: dog.frequencyDays?.toString() || '',
        agreedPrice: dog.agreedPrice?.toString() || '',
        isHalfDay: dog.isHalfDay ? 'true' : '',
        isBolsista: dog.isBolsista ? 'true' : '',
        vaccineV10Date: dog.vaccineV10Date || '',
        vaccineV10Next: dog.vaccineV10Next || '',
        vaccineRabiesDate: dog.vaccineRabiesDate || '',
        vaccineRabiesNext: dog.vaccineRabiesNext || '',
        vaccineFluDate: dog.vaccineFluDate || '',
        vaccineFluNext: dog.vaccineFluNext || '',
        vaccineGiardiaDate: dog.vaccineGiardiaDate || '',
        vaccineGiardiaNext: dog.vaccineGiardiaNext || '',
        giardiaExamNotes: dog.giardiaExamNotes || '',
      })
      setVaccineCardUrl(dog.vaccineCardUrl || null)
      setPhotoUrl(dog.photoUrl || null)
      setLoading(false)
    }
    load()
  }, [params.id, router])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.breed || !form.ownerName || !form.ownerPhone) {
      toast.error('Preencha os campos obrigatórios')
      return
    }
    setSaving(true)
    try {
      if (isTutor) {
        // TUTOR: submit for admin approval
        const tutorFields = {
          name: form.name, breed: form.breed, birthDate: form.birthDate,
          color: form.color, weight: form.weight, ownerName: form.ownerName,
          ownerPhone: form.ownerPhone, ownerEmail: form.ownerEmail, ownerCpf: form.ownerCpf,
          sex: form.sex, castrated: form.castrated, size: form.size, temperament: form.temperament,
        }
        const res = await fetch(`/api/dogs/${params.id}/changes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tutorFields),
        })
        if (!res.ok) throw new Error()
        toast.success('Alterações enviadas para aprovação! ✅')
        router.push(`/dogs/${params.id}`)
        return
      }
      const res = await fetch(`/api/dogs/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success('Cadastro atualizado!')
      router.push(`/dogs/${params.id}`)
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-4xl animate-bounce">🐾</div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dogs/${params.id}`} className="p-2 rounded-lg hover:bg-amber-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Editar — {form.name}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Dog photo */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">📷 Foto do Cão</h2>
          <input ref={dogPhotoRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.size > 8 * 1024 * 1024) { toast.error('Máx 8MB'); return }
              setUploadingDogPhoto(true)
              try {
                const fd = new FormData(); fd.append('photo', file)
                const res = await fetch(`/api/dogs/${params.id}/photo`, { method: 'POST', body: fd })
                const data = await res.json()
                setPhotoUrl(data.photoUrl)
                toast.success('Foto atualizada!')
              } catch { toast.error('Erro ao enviar foto') }
              finally { setUploadingDogPhoto(false) }
            }}
          />
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => dogPhotoRef.current?.click()}
              disabled={uploadingDogPhoto}
              className="relative group shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-amber-100 border-2 border-dashed border-amber-300 flex items-center justify-center">
                {photoUrl
                  ? <img src={photoUrl} className="w-full h-full object-cover" alt="Foto" />
                  : <span className="text-4xl">🐶</span>}
              </div>
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-7 h-7 text-white" />
              </div>
            </button>
            <div>
              <p className="text-sm text-gray-600 font-medium">{photoUrl ? 'Foto atual' : 'Nenhuma foto'}</p>
              <p className="text-xs text-gray-400 mt-0.5 mb-3">Toque na imagem ou use o botão abaixo</p>
              <button type="button" onClick={() => dogPhotoRef.current?.click()}
                disabled={uploadingDogPhoto}
                className="btn-secondary text-sm flex items-center gap-2">
                <Camera className="w-4 h-4" />
                {uploadingDogPhoto ? 'Enviando...' : photoUrl ? 'Trocar foto' : 'Adicionar foto'}
              </button>
            </div>
          </div>
        </div>

        {/* Identificação */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🐾 Identificação</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome *</label>
              <input name="name" className="input" value={form.name} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Raça *</label>
              <input name="breed" className="input" value={form.breed} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Data de Nascimento</label>
              <input name="birthDate" type="date" className="input" value={form.birthDate} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Cor / Pelagem</label>
              <input name="color" className="input" value={form.color} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Peso (kg)</label>
              <input name="weight" type="number" step="0.1" className="input" value={form.weight} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Sexo</label>
              <select name="sex" className="select" value={form.sex} onChange={handleChange}>
                <option value="">Não informado</option>
                <option value="Macho">Macho</option>
                <option value="Fêmea">Fêmea</option>
              </select>
            </div>
            <div>
              <label className="label">Castrado</label>
              <select name="castrated" className="select" value={form.castrated} onChange={handleChange}>
                <option value="">Não informado</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
            <div>
              <label className="label">Porte</label>
              <select name="size" className="select" value={form.size} onChange={handleChange}>
                <option value="">Não informado</option>
                <option value="Pequeno">Pequeno</option>
                <option value="Médio">Médio</option>
                <option value="Grande">Grande</option>
                <option value="Gigante">Gigante</option>
              </select>
            </div>
            <div>
              <label className="label">Temperamento</label>
              <input name="temperament" className="input" value={form.temperament} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Tutor */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">👤 Dados do Tutor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nome do Tutor *</label>
              <input name="ownerName" className="input" value={form.ownerName} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">WhatsApp *</label>
              <input name="ownerPhone" className="input" value={form.ownerPhone} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="ownerEmail" type="email" className="input" value={form.ownerEmail} onChange={handleChange} />
            </div>
            <div>
              <label className="label">CPF</label>
              <input name="ownerCpf" className="input" value={form.ownerCpf} onChange={handleChange} />
            </div>
          </div>
        </div>

        {!isTutor && (<>

        {/* Serviço */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🎯 Serviço Solicitado</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Classificação do cão *</label>
              <select name="dogStatus" className="select" value={form.dogStatus} onChange={handleChange}>
                <option value="CRECHE">🐾 Ativo Creche — aparece automaticamente na agenda pelos dias cadastrados</option>
                <option value="AVULSO">🔀 Ativo Avulso / Hotel — não entra automaticamente, adiciona manualmente na agenda</option>
                <option value="BOLSISTA">🎓 Bolsista — acesso livre, aparece todos os dias automaticamente</option>
                <option value="INATIVO">⏸️ Inativo — não aparece na agenda nem no painel de adição</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <input
                type="checkbox"
                id="isBolsista"
                name="isBolsista"
                className="w-4 h-4 accent-amber-600"
                checked={form.isBolsista === 'true'}
                onChange={(e) => setForm(prev => ({ ...prev, isBolsista: e.target.checked ? 'true' : '' }))}
              />
              <label htmlFor="isBolsista" className="text-sm font-medium text-amber-800 cursor-pointer">
                🎓 Cão Bolsista — agenda livre sem necessidade de mensalidade
              </label>
            </div>
            <div>
              <label className="label">Tipo de serviço</label>
              <select name="serviceType" className="select" value={form.serviceType} onChange={handleChange}>
                <option value="">Não informado</option>
                <option value="Creche">Creche</option>
                <option value="Hotel">Hotel</option>
                <option value="Banho e Tosa">Banho e Tosa</option>
                <option value="Adestramento">Adestramento</option>
              </select>
            </div>
            <div>
              <label className="label">Dias da semana</label>
              <input name="scheduledDays" className="input" value={form.scheduledDays} onChange={handleChange} placeholder="Ex: Segunda, Terça, Quarta" />
            </div>
            <div>
              <label className="label">📅 Dia de vencimento da mensalidade</label>
              <input name="monthlyStartDay" type="number" min="1" max="31" className="input" value={form.monthlyStartDay} onChange={handleChange} placeholder="Ex: 1, 5, 15" />
              <p className="text-xs text-gray-400 mt-1">Dia do mês em que a mensalidade inicia/vence</p>
            </div>
            <div>
              <label className="label">📅 Data de matrícula</label>
              <input name="enrollmentDate" type="date" className="input" value={form.enrollmentDate} onChange={handleChange} />
              <p className="text-xs text-gray-400 mt-1">Histórico só contabilizado a partir desta data</p>
            </div>
          </div>
        </div>

        {/* Valores */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">💰 Valores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Frequência (dias por semana)</label>
              <select name="frequencyDays" className="select" value={form.frequencyDays} onChange={handleChange}>
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
              <select name="isHalfDay" className="select" value={form.isHalfDay} onChange={handleChange}>
                <option value="">Período Integral</option>
                <option value="true">Meio Período</option>
              </select>
            </div>
            <div>
              <label className="label">Valor acordado mensal (R$)</label>
              <input name="agreedPrice" type="number" step="0.01" className="input" value={form.agreedPrice} onChange={handleChange} placeholder="Ex: 800.00" />
              <p className="text-xs text-gray-500 mt-1">O desconto é calculado automaticamente com base na tabela de preços</p>
            </div>
          </div>
        </div>

        {/* Alimentação */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🍽️ Alimentação</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select name="feedingType" className="select" value={form.feedingType} onChange={handleChange}>
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
              <input name="feedingTimesPerDay" className="input" value={form.feedingTimesPerDay} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Quantidade por refeição</label>
              <input name="feedingGramsPerMeal" className="input" value={form.feedingGramsPerMeal} onChange={handleChange} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Instruções especiais</label>
              <textarea name="feedingInstructions" className="textarea" rows={2} value={form.feedingInstructions} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Saúde */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🏥 Saúde</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Alergias</label>
              <input name="allergies" className="input" value={form.allergies} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Doenças / Medicações</label>
              <textarea name="medications" className="textarea" rows={2} value={form.medications} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Autorizações */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🛡️ Autorizações</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Piscina</label>
              <select name="allowPool" className="select" value={form.allowPool} onChange={handleChange}>
                <option value="">Não informado</option>
                <option value="SIM">Sim</option>
                <option value="NAO">Não</option>
              </select>
            </div>
            <div>
              <label className="label">Fotos nas redes sociais</label>
              <select name="allowPhotos" className="select" value={form.allowPhotos} onChange={handleChange}>
                <option value="">Não informado</option>
                <option value="SIM">Sim</option>
                <option value="NAO">Não</option>
              </select>
            </div>
          </div>
        </div>

        {/* Veterinário */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">🩺 Veterinário</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome / Clínica</label>
              <input name="vetName" className="input" value={form.vetName} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input name="vetPhone" className="input" value={form.vetPhone} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Vacinas */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-1">💉 Prontuário de Vacinas</h2>
          <p className="text-xs text-gray-400 mb-4">Preencha a data da última aplicação e a data de validade/próxima dose</p>

          <div className="space-y-4">
            {[{label: 'V10 / V8', keyDate: 'vaccineV10Date', keyNext: 'vaccineV10Next'},
              {label: 'Raiva', keyDate: 'vaccineRabiesDate', keyNext: 'vaccineRabiesNext'},
              {label: 'Gripe (Parainfluenza)', keyDate: 'vaccineFluDate', keyNext: 'vaccineFluNext'},
              {label: 'Giardia', keyDate: 'vaccineGiardiaDate', keyNext: 'vaccineGiardiaNext'},
            ].map(({ label, keyDate, keyNext }) => (
              <div key={keyDate} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-3 bg-gray-50 rounded-xl">
                <div className="font-medium text-sm text-gray-700 sm:self-center">{label}</div>
                <div>
                  <label className="label text-xs">Última aplicação</label>
                  <input type="date" name={keyDate} className="input text-sm"
                    value={form[keyDate as keyof typeof form] as string}
                    onChange={handleChange} />
                </div>
                <div>
                  <label className="label text-xs">Válida até / Próxima dose</label>
                  <input type="date" name={keyNext} className="input text-sm"
                    value={form[keyNext as keyof typeof form] as string}
                    onChange={handleChange} />
                </div>
              </div>
            ))}

            {/* Giardia exam notes — shown when no giardia vaccine */}
            {!form.vaccineGiardiaDate && (
              <div className="p-3 bg-blue-50 rounded-xl">
                <label className="label text-xs text-blue-700">🔬 Acompanhamento de exames (quando não toma Giardia)</label>
                <textarea name="giardiaExamNotes" className="textarea text-sm" rows={2}
                  placeholder="Ex: Exame coproparasitológico 03/2025 — negativo"
                  value={form.giardiaExamNotes}
                  onChange={handleChange} />
              </div>
            )}

            {/* Vaccine card photo */}
            <div className="pt-2 border-t border-gray-100">
              <label className="label flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Foto da Carteira de Vacinação</label>
              <input ref={cardPhotoRef} type="file" accept="image/*" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  if (file.size > 8 * 1024 * 1024) { alert('Máx 8MB'); return }
                  setUploadingCard(true)
                  try {
                    const fd = new FormData(); fd.append('photo', file)
                    const res = await fetch(`/api/dogs/${params.id}/vaccine-card`, { method: 'POST', body: fd })
                    const data = await res.json()
                    setVaccineCardUrl(data.vaccineCardUrl)
                  } finally { setUploadingCard(false) }
                }}
              />
              {vaccineCardUrl && (
                <div className="mb-2">
                  <a href={vaccineCardUrl} target="_blank" rel="noopener noreferrer">
                    <img src={vaccineCardUrl} className="max-h-48 rounded-xl border border-gray-200 object-contain" alt="Carteira de vacinação" />
                  </a>
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Carteira anexada</p>
                </div>
              )}
              <button type="button" onClick={() => cardPhotoRef.current?.click()} disabled={uploadingCard}
                className="btn-secondary text-sm flex items-center gap-2">
                <Camera className="w-4 h-4" />
                {uploadingCard ? 'Enviando...' : vaccineCardUrl ? 'Substituir foto' : 'Anexar carteira'}
              </button>
            </div>
          </div>
        </div>

        </>)}

        {/* Observações */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">📝 Observações</h2>
          <textarea name="notes" className="textarea" rows={3} value={form.notes} onChange={handleChange} />
        </div>

        <div className="flex gap-3 pb-6">
          <Link href={`/dogs/${params.id}`} className="btn-secondary flex-1 text-center">
            Cancelar
          </Link>
          <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Enviando...' : isTutor ? 'Solicitar Alteração' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
