const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const hoje = new Date().toISOString().split('T')[0]
console.log('Data:', hoje)

async function reverterCheckin() {
  const caes = ['Rocky Tenorio Guedes', 'Lara Tenorio Guedes']

  for (const nome of caes) {
    try {
      // 1. Buscar o cão
      const dog = await prisma.dog.findFirst({
        where: { name: nome }
      })

      if (!dog) {
        console.log(`❌ ${nome} não encontrado`)
        continue
      }

      console.log(`✅ ${nome} encontrado: ${dog.id}`)

      // 2. Reverter presença na agenda (definir como null)
      const roster = await prisma.dailyRoster.findFirst({
        where: { dogId: dog.id, date: hoje }
      })

      if (roster) {
        await prisma.dailyRoster.update({
          where: { id: roster.id },
          data: { present: null }
        })
        console.log(`   Presença revertida na agenda`)
      }

      // 3. Reverter check-in ativo (se houver)
      const stayAtivo = await prisma.stay.findFirst({
        where: {
          dogId: dog.id,
          active: true
        }
      })

      if (stayAtivo) {
        await prisma.stay.update({
          where: { id: stayAtivo.id },
          data: {
            active: false,
            checkOut: new Date()
          }
        })
        console.log(`   Estadia ativa finalizada`)
      }

      // 4. Se houver agendamento para hoje, voltar para agendado
      const agendamento = await prisma.stay.findFirst({
        where: {
          dogId: dog.id,
          isScheduled: false,
          scheduledCheckIn: { lte: new Date(hoje + 'T23:59:59') },
          OR: [
            { scheduledCheckOut: { gte: new Date(hoje + 'T00:00:00') } },
            { scheduledCheckOut: null }
          ]
        },
        orderBy: { checkIn: 'desc' }
      })

      if (agendamento) {
        await prisma.stay.update({
          where: { id: agendamento.id },
          data: {
            active: false,
            isScheduled: true,
            checkIn: undefined
          }
        })
        console.log(`   Check-in revertido para agendamento`)
      }

      console.log(`✅ ${nome} - reversão completa!\n`)

    } catch (err) {
      console.log(`❌ Erro com ${nome}:`, err.message)
    }
  }

  await prisma.$disconnect()
}

reverterCheckin()
