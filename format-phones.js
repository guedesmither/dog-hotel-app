const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function formatPhone(phone) {
  if (!phone) return null
  
  // Remove tudo exceto dígitos
  let digits = phone.replace(/\D/g, '')
  
  // Se já começa com 55 e tem 12-13 dígitos, está correto
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return '+' + digits
  }
  
  // Se não começa com 55, adiciona
  if (!digits.startsWith('55')) {
    // Verifica se parece ser um número brasileiro (começa com 1-9 e tem 10-11 dígitos)
    if (digits.length >= 10 && digits.length <= 11) {
      digits = '55' + digits
    }
  }
  
  return '+' + digits
}

async function updatePhones() {
  console.log('Formatando telefones...\n')
  
  const dogs = await prisma.dog.findMany({
    select: { id: true, name: true, ownerPhone: true }
  })
  
  let updated = 0
  
  for (const dog of dogs) {
    const formatted = formatPhone(dog.ownerPhone)
    
    if (formatted && formatted !== dog.ownerPhone) {
      await prisma.dog.update({
        where: { id: dog.id },
        data: { ownerPhone: formatted }
      })
      console.log(`✅ ${dog.name}: ${dog.ownerPhone} → ${formatted}`)
      updated++
    } else {
      console.log(`⏭️ ${dog.name}: ${dog.ownerPhone} (sem alteração)`)
    }
  }
  
  console.log(`\n✅ ${updated} telefones atualizados!`)
}

updatePhones()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
