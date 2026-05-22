const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Usar usuário existente como tutor temporário
  const tutor = await prisma.user.findFirst({ where: { email: 'guedesmither@gmail.com' } })
  if (!tutor) {
    console.error('Usuário tutor não encontrado.')
    return
  }

  // Cães da AU-Ê (todos os dias)
  const dogsAuE = [
    { name: 'Teobaldo', breed: 'Bulldog Francês', scheduledDays: 'Segunda,Terça,Quarta,Quinta,Sexta', owner: 'AU-Ê' },
    { name: 'AUÊ', breed: 'Australian Cattle Dog', scheduledDays: 'Segunda,Terça,Quarta,Quinta,Sexta', owner: 'AU-Ê' },
    { name: 'Sambô', breed: 'Australian Cattle Dog', scheduledDays: 'Segunda,Terça,Quarta,Quinta,Sexta', owner: 'AU-Ê' },
    { name: 'Cacau', breed: 'Shi Tzu', scheduledDays: 'Segunda,Terça,Quarta,Quinta,Sexta', owner: 'AU-Ê' },
  ]

  for (const dog of dogsAuE) {
    await prisma.dog.upsert({
      where: { matricula: dog.name },
      update: {},
      create: {
        matricula: dog.name,
        name: dog.name,
        breed: dog.breed,
        ownerName: dog.owner,
        ownerPhone: '00000000000',
        dogStatus: 'BOLSISTA',
        serviceType: 'CRECHE',
        scheduledDays: dog.scheduledDays,
        frequencyDays: 5,
        isActive: true,
        agreedPrice: 0, // Bolsista não paga
        tutorUsers: { connect: { id: tutor.id } },
      },
    })
    console.log(`Cão ${dog.name} cadastrado como bolsista (${dog.owner})`)
  }

  // Cães da Ionice (avulsos - sem grade fixa)
  const dogsIonice = [
    { name: 'Belinha', breed: 'Chihuahua', owner: 'Ionice Leite' },
    { name: 'Hera', breed: 'Border Collie', owner: 'Ionice Leite' },
    { name: 'Suzy', breed: 'Border Collie', owner: 'Ionice Leite' },
  ]

  for (const dog of dogsIonice) {
    await prisma.dog.upsert({
      where: { matricula: dog.name },
      update: {},
      create: {
        matricula: dog.name,
        name: dog.name,
        breed: dog.breed,
        ownerName: dog.owner,
        ownerPhone: '00000000000',
        dogStatus: 'BOLSISTA',
        serviceType: 'CRECHE',
        scheduledDays: null, // Avulso - sem grade fixa
        frequencyDays: null,
        isActive: true,
        agreedPrice: 0, // Bolsista não paga
        tutorUsers: { connect: { id: tutor.id } },
      },
    })
    console.log(`Cão ${dog.name} cadastrado como bolsista avulso (${dog.owner})`)
  }

  console.log('✅ Todos os cães bolsistas foram cadastrados!')
  console.log('⚠️  Os cães estão vinculados ao usuário temporário. Associe aos tutores corretos na interface.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
