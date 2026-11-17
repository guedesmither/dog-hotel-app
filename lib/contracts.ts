import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import type { Dog } from '@prisma/client'
import { CONTRACT_TEMPLATE_BASE64 } from './contract-template'

const TIME_ZONE = 'America/Sao_Paulo'

export interface ContractFicha {
  [key: string]: string
}

export interface ContractData {
  dataExtenso: string
  contratanteNome: string
  fichas: ContractFicha[]
}

function text(value: string | null | undefined): string {
  return value?.trim() || ''
}

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  return {
    year: Number(parts.find(part => part.type === 'year')?.value),
    month: Number(parts.find(part => part.type === 'month')?.value),
    day: Number(parts.find(part => part.type === 'day')?.value),
  }
}

function parseBirthDate(value: string | null | undefined) {
  const birthDate = text(value)
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate)
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(birthDate)
  const match = isoMatch
    ? { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) }
    : brMatch
      ? { year: Number(brMatch[3]), month: Number(brMatch[2]), day: Number(brMatch[1]) }
      : null

  if (!match || match.month < 1 || match.month > 12 || match.day < 1) return null
  const parsed = new Date(Date.UTC(match.year, match.month - 1, match.day))
  if (
    parsed.getUTCFullYear() !== match.year ||
    parsed.getUTCMonth() + 1 !== match.month ||
    parsed.getUTCDate() !== match.day
  ) return null

  return match
}

function petAge(birthDate: string | null | undefined, now: Date): string {
  const birth = parseBirthDate(birthDate)
  if (!birth) return ''

  const current = dateParts(now)
  let years = current.year - birth.year
  let months = current.month - birth.month
  if (current.day < birth.day) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years < 0) return ''

  return `${years} anos e ${months} meses`
}

function fichaDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: string) => parts.find(value => value.type === type)?.value || ''

  return `${part('day')}/${part('month')}/${part('year')}, ${part('hour')}:${part('minute')}:${part('second')}`
}

function feedingTimes(value: string | null | undefined): string {
  const cleaned = text(value)
  return /^\d+$/.test(cleaned) ? `${cleaned} vezes` : cleaned
}

function vetContact(dog: Dog): string {
  const name = text(dog.vetName)
  if (!name) return ''
  if (/^Autorizo/i.test(name)) return name
  return `Meu veterinário: ${name}${text(dog.vetPhone) ? ` - ${text(dog.vetPhone)}` : ''}`
}

export function normalizeOwner(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildContractData(dogs: Dog[], now = new Date()): ContractData {
  const contratanteNome = text(dogs[0]?.ownerName)

  return {
    dataExtenso: new Intl.DateTimeFormat('pt-BR', {
      timeZone: TIME_ZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now),
    contratanteNome,
    fichas: dogs.map(dog => ({
      fichaDataHora: fichaDateTime(dog.createdAt),
      tutorNome: text(dog.ownerName),
      tutorTelefone: text(dog.ownerPhone),
      tutorEmail: text(dog.ownerEmail),
      tutorCpf: text(dog.ownerCpf),
      petNome: text(dog.name),
      petIdade: petAge(dog.birthDate, now),
      petRaca: text(dog.breed),
      petSexo: text(dog.sex),
      petCastrado: dog.castrated === true ? 'sim' : dog.castrated === false ? 'não' : '',
      petTemperamento: text(dog.temperament),
      petPorte: text(dog.size),
      petDoencas: text(dog.medications) || 'Nenhuma informada',
      petAlergias: text(dog.allergies) || 'Nenhuma informada',
      alimTipo: text(dog.feedingType),
      alimInstrucoes: text(dog.feedingInstructions),
      alimVezes: feedingTimes(dog.feedingTimesPerDay),
      alimGramas: text(dog.feedingGramsPerMeal),
      petBrincadeiras: text(dog.preferredActivities),
      vetContato: vetContact(dog),
      piscina: dog.allowPool === true ? 'SIM' : dog.allowPool === false ? 'NÃO' : '',
      fotos: dog.allowPhotos === true ? 'SIM' : dog.allowPhotos === false ? 'NÃO' : '',
      servico: text(dog.serviceType),
      dias: text(dog.scheduledDays),
      checkin: '',
      checkout: '',
      obsPeriodo: '',
    })),
  }
}

export function renderContractDocx(data: ContractData): Buffer {
  const template = Buffer.from(CONTRACT_TEMPLATE_BASE64, 'base64')
  const doc = new Docxtemplater(new PizZip(template), {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })
  doc.render(data)
  return doc.getZip().generate({ type: 'nodebuffer' }) as Buffer
}

export function contractFileName(dogs: Array<Pick<Dog, 'name' | 'ownerName'>>): string {
  const dogNames = dogs.map(dog => text(dog.name).toUpperCase()).join(' ')
  const ownerFirstName = text(dogs[0]?.ownerName).split(/\s+/)[0]?.toUpperCase() || ''
  return `CONTRATO - ${dogNames} - ${ownerFirstName}.docx`
}
