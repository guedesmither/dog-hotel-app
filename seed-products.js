const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const products = [
    // CRECHE - mensalidades por frequência
    { name: 'Mensal 1x', category: 'CRECHE', price: 460 },
    { name: 'Mensal 2x', category: 'CRECHE', price: 640 },
    { name: 'Mensal 3x', category: 'CRECHE', price: 760 },
    { name: 'Mensal 4x', category: 'CRECHE', price: 890 },
    { name: 'Mensal 5x', category: 'CRECHE', price: 975 },
    { name: 'Mensal 6x', category: 'CRECHE', price: 1065 },
    // PACOTE Day Care
    { name: 'Pacote 5 Dias', category: 'PACOTE', price: 500 },
    { name: 'Pacote 10 Dias', category: 'PACOTE', price: 1000 },
    // HOTEL
    { name: 'Hotel Regular', category: 'HOTEL', price: 150 },
    { name: 'Hotel Feriado', category: 'HOTEL', price: 200 },
    // BANHO (SERVICO)
    { name: 'Banho PP', category: 'SERVICO', price: 50 },
    { name: 'Banho P',  category: 'SERVICO', price: 65 },
    { name: 'Banho M',  category: 'SERVICO', price: 80 },
    { name: 'Banho G',  category: 'SERVICO', price: 95 },
    { name: 'Banho GG', category: 'SERVICO', price: 110 },
  ]

  let created = 0, skipped = 0

  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { name: p.name, category: p.category } })
    if (existing) {
      console.log(`⏭  Pulando "${p.name}" — já existe`)
      skipped++
      continue
    }
    await prisma.product.create({ data: { ...p, isActive: true } })
    console.log(`✅ Criado: [${p.category}] ${p.name} — R$ ${p.price}`)
    created++
  }

  console.log(`\n📊 Resumo: ${created} criados | ${skipped} pulados`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
