import { prisma } from './prisma'

let ensured: Promise<void> | null = null

export function ensureContractTable(): Promise<void> {
  if (!(process.env.DATABASE_URL || '').startsWith('postgres')) return Promise.resolve()
  if (!ensured) {
    ensured = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Contract" (
    "id" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "dogIds" TEXT NOT NULL DEFAULT '',
    "dogNames" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'GERADO',
    "source" TEXT NOT NULL DEFAULT 'GERADO',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileData" BYTEA NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
)`)
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Contract_ownerKey_idx" ON "Contract"("ownerKey")`)
    })().catch(err => { ensured = null; throw err })
  }
  return ensured
}
