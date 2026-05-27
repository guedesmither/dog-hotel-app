const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkTheodoros() {
  console.log('🔍 Analisando Theodoros...\n')
  
  const theodoros = await prisma.dog.findMany({
    where: {
      name: { contains: 'Theodoro', mode: 'insensitive' }
    },
    include: {
      stays: { where: { active: true } }
    },
    orderBy: { createdAt: 'asc' }
  })
  
  console.log(`Encontrados ${theodoros.length} Theodoro(s):\n`)
  
  for (let i = 0; i < theodoros.length; i++) {
    const t = theodoros[i]
    const num = i + 1
    const hasData = t.feedingType || t.medications || t.allergies
    const hasStays = t.stays.length > 0
    
    console.log(`${num}. "${t.name}"`)
    console.log(`   ID: ${t.id}`)
    console.log(`   Tutor: ${t.ownerName}`)
    console.log(`   Criado em: ${t.createdAt.toISOString().split('T')[0]}`)
    console.log(`   Raça: ${t.breed || 'N/A'}`)
    console.log(`   Dados completos: ${hasData ? '✅' : '❌'}`)
    console.log(`   Estadia ativa: ${hasStays ? '✅' : '❌'}`)
    console.log(`   Alimentação: ${t.feedingType || 'N/A'}`)
    console.log(`   Medicações: ${t.medications || 'N/A'}`)
    console.log(`   Alergias: ${t.allergies || 'N/A'}`)
    console.log('')
  }
  
  // Sugestão de ação
  if (theodoros.length === 2) {
    const rafaela = theodoros.find(t => t.ownerName?.toLowerCase().includes('rafaela'))
    const vitoria = theodoros.find(t => t.ownerName?.toLowerCase().includes('vitória') || t.ownerName?.toLowerCase().includes('vitoria'))
    
    if (rafaela && vitoria) {
      console.log('📋 ANÁLISE:')
      console.log(`   - Rafaela: Criado em ${rafaela.createdAt.toISOString().split('T')[0]} ${rafaela.createdAt < vitoria.createdAt ? '(MAIS ANTIGO)' : '(MAIS NOVO)'}`)
      console.log(`   - Vitória: Criado em ${vitoria.createdAt.toISOString().split('T')[0]} ${vitoria.createdAt < rafaela.createdAt ? '(MAIS ANTIGO)' : '(MAIS NOVO)'}`)
      
      if (rafaela.createdAt < vitoria.createdAt) {
        console.log(`\n   ✅ O Theodoro da Rafaela é o ORIGINAL (criado antes)`)
        console.log(`   ✅ O Theodoro da Vitória é o NOVO (criado depois)`)
      } else {
        console.log(`\n   ✅ O Theodoro da Vitória é o ORIGINAL (criado antes)`)
        console.log(`   ✅ O Theodoro da Rafaela é o NOVO (criado depois)`)
      }
      
      console.log(`\n📝 SUGESTÃO:`)
      console.log(`   Manter ambos com nomes distintos:`)
      console.log(`   - "Theodoro" (da ${rafaela.createdAt < vitoria.createdAt ? 'Rafaela' : 'Vitória'} - original)`)
      console.log(`   - "Theodoro" (da ${rafaela.createdAt < vitoria.createdAt ? 'Vitória' : 'Rafaela'} - novo)`)
      console.log(`\n   Ou renomear para diferenciar:`)
      console.log(`   - "Theodoro R" (Rafaela)`)
      console.log(`   - "Theodoro V" (Vitória)`)
    }
  }
}

checkTheodoros()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
