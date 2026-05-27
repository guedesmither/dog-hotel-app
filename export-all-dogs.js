const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')

async function main() {
  const dogs = await prisma.dog.findMany({
    orderBy: { name: 'asc' }
  })
  
  // Exportar em formato JSON completo
  const exportData = dogs.map(dog => ({
    id: dog.id,
    name: dog.name,
    matricula: dog.matricula,
    breed: dog.breed,
    birthDate: dog.birthDate,
    color: dog.color,
    weight: dog.weight,
    photoUrl: dog.photoUrl,
    ownerName: dog.ownerName,
    ownerPhone: dog.ownerPhone,
    ownerEmail: dog.ownerEmail,
    ownerCpf: dog.ownerCpf,
    sex: dog.sex,
    castrated: dog.castrated,
    size: dog.size,
    temperament: dog.temperament,
    preferredActivities: dog.preferredActivities,
    allowPool: dog.allowPool,
    allowPhotos: dog.allowPhotos,
    serviceType: dog.serviceType,
    scheduledDays: dog.scheduledDays,
    monthlyStartDay: dog.monthlyStartDay,
    notes: dog.notes,
    feedingInstructions: dog.feedingInstructions,
    feedingTimesPerDay: dog.feedingTimesPerDay,
    feedingGramsPerMeal: dog.feedingGramsPerMeal,
    feedingType: dog.feedingType,
    medications: dog.medications,
    allergies: dog.allergies,
    vetName: dog.vetName,
    vetPhone: dog.vetPhone,
    vaccineV10Date: dog.vaccineV10Date,
    vaccineV10Next: dog.vaccineV10Next,
    vaccineRabiesDate: dog.vaccineRabiesDate,
    vaccineRabiesNext: dog.vaccineRabiesNext,
    vaccineFluDate: dog.vaccineFluDate,
    vaccineFluNext: dog.vaccineFluNext,
    vaccineGiardiaDate: dog.vaccineGiardiaDate,
    vaccineGiardiaNext: dog.vaccineGiardiaNext,
    giardiaExamNotes: dog.giardiaExamNotes,
    vaccineCardUrl: dog.vaccineCardUrl,
    enrollmentDate: dog.enrollmentDate,
    isActive: dog.isActive,
    dogStatus: dog.dogStatus,
    isBolsista: dog.isBolsista,
  }))
  
  fs.writeFileSync('all-dogs-export.json', JSON.stringify(exportData, null, 2))
  console.log(`✅ ${dogs.length} cães exportados para all-dogs-export.json`)
  
  // Mostrar resumo
  console.log('\n📊 Resumo dos cães:')
  dogs.forEach(d => {
    const hasFeeding = d.feedingType || d.feedingInstructions
    const hasMeds = d.medications
    const hasAllergies = d.allergies
    console.log(`${d.name}: Alimentação=${hasFeeding ? '✅' : '❌'} Meds=${hasMeds ? '✅' : '❌'} Alergias=${hasAllergies ? '✅' : '❌'}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
