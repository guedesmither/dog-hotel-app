const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Testando POST /api/roster para Ramiro ===')
    
    const ramiro = await prisma.dog.findFirst({
      where: { name: { contains: 'Ramiro' } },
    })

    if (!ramiro) {
      console.log('Cão Ramiro não encontrado')
      return
    }

    console.log('Cão:', ramiro.name)
    console.log('ID:', ramiro.id)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    console.log(`\nTestando POST para data: ${dateStr}`)

    // Check if already in roster
    const existing = await prisma.dailyRoster.findFirst({
      where: {
        dogId: ramiro.id,
        date: dateStr,
      },
    })

    if (existing) {
      console.log(`❌ Já está na agenda: ${existing.type}`)
      return
    }

    console.log('✓ Não está na agenda, pode adicionar')

    // Try to add
    const newEntry = await prisma.dailyRoster.create({
      data: {
        dogId: ramiro.id,
        date: dateStr,
        type: 'HOTEL',
        present: null,
        isPernoite: false,
      },
    })

    console.log(`✓ Adicionado com sucesso: ${newEntry.id}`)

    // Clean up
    await prisma.dailyRoster.delete({
      where: { id: newEntry.id },
    })

    console.log('✓ Limpeza concluída')
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
