import type { Prisma } from '@prisma/client'

export const contractMetadataSelect = {
  id: true,
  ownerKey: true,
  ownerName: true,
  dogIds: true,
  dogNames: true,
  status: true,
  source: true,
  fileName: true,
  mimeType: true,
  version: true,
  sentAt: true,
  signedAt: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ContractSelect

export const contractDocxMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
export const contractPdfMimeType = 'application/pdf'
export const maxContractFileSize = 10 * 1024 * 1024

export function contractContentDisposition(fileName: string, inline = false): string {
  const fallback = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\\r\n]/g, '_')

  return `${inline ? 'inline' : 'attachment'}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

export function isContractManager(role: string): boolean {
  return role === 'ADMIN' || role === 'MANAGER'
}
