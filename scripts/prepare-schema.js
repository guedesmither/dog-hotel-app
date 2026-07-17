const fs = require('fs')
const path = require('path')

const isVercel = process.env.VERCEL || process.env.VERCEL_ENV

if (isVercel) {
  const prodSchema = path.join(__dirname, '../prisma/schema.production.prisma')
  const target = path.join(__dirname, '../prisma/schema.prisma')
  fs.copyFileSync(prodSchema, target)
  console.log('[prepare-schema] Usando schema PostgreSQL para Vercel')
} else {
  console.log('[prepare-schema] Mantendo schema padrão para desenvolvimento local')
}
