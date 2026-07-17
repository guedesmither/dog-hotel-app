const fs = require('fs')
const path = require('path')

const isVercel = process.env.VERCEL || process.env.VERCEL_ENV

if (isVercel) {
  const prodSchema = path.join(__dirname, '../prisma/schema.production.prisma')
  const target = path.join(__dirname, '../prisma/schema.prisma')
  let schema = fs.readFileSync(prodSchema, 'utf-8')
  // Use Vercel's Neon database URL (prefer pooled Prisma URL, fall back to standard POSTGRES_URL)
  const dbEnv = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL
  if (dbEnv) {
    const envName = process.env.POSTGRES_PRISMA_URL ? 'POSTGRES_PRISMA_URL' : process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'DATABASE_URL'
    schema = schema.replace(/env\("DATABASE_URL"\)/g, `env("${envName}")`)
    console.log(`[prepare-schema] Usando ${envName} para conexão PostgreSQL`)
  }
  fs.writeFileSync(target, schema)
  console.log('[prepare-schema] Usando schema PostgreSQL para Vercel')
} else {
  console.log('[prepare-schema] Mantendo schema padrão para desenvolvimento local')
}
