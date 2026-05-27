const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const dogs = await prisma.dog.findMany({ 
    orderBy: { name: 'asc' },
    select: { 
      name: true, 
      feedingType: true, 
      feedingInstructions: true,
      medications: true, 
      allergies: true, 
      vetName: true,
      ownerName: true,
      serviceType: true
    }
  })
  
  console.log(`Total: ${dogs.length} cães\n`)
  console.log('NOME | ALIM | INST | MEDS | ALER | VET | TUTOR | SERVIÇO')
  console.log('-'.repeat(80))
  
  for (const d of dogs) {
    const hasF = d.feedingType ? '✓' : '✗'
    const hasFI = d.feedingInstructions ? '✓' : '✗'
    const hasM = d.medications ? '✓' : '✗'
    const hasA = d.allergies ? '✓' : '✗'
    const hasV = d.vetName ? '✓' : '✗'
    const tutor = d.ownerName ? d.ownerName.split(' ')[0] : '???'
    const service = d.serviceType || '???'
    console.log(`${d.name.substring(0,20).padEnd(20)} | ${hasF} | ${hasFI} | ${hasM} | ${hasA} | ${hasV} | ${tutor} | ${service}`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
