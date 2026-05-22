import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  const adminHash = await bcrypt.hash('admin123', 10)
  const gestaoHash = await bcrypt.hash('gestao123', 10)
  const monitorHash = await bcrypt.hash('monitor123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@petday.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@petday.com',
      password: adminHash,
      role: 'ADMIN',
    },
  })

  const gestao = await prisma.user.upsert({
    where: { email: 'gestao@petday.com' },
    update: {},
    create: {
      name: 'Gestão',
      email: 'gestao@petday.com',
      password: gestaoHash,
      role: 'MANAGER',
    },
  })

  const monitor = await prisma.user.upsert({
    where: { email: 'monitor@petday.com' },
    update: {},
    create: {
      name: 'Monitor(a)',
      email: 'monitor@petday.com',
      password: monitorHash,
      role: 'MONITOR',
    },
  })

  const dog1 = await prisma.dog.upsert({
    where: { id: 'demo-dog-1' },
    update: {},
    create: {
      id: 'demo-dog-1',
      name: 'Thor',
      breed: 'Labrador Retriever',
      birthDate: '2020-03-15',
      color: 'Amarelo',
      weight: 28.5,
      ownerName: 'João Silva',
      ownerPhone: '5511999990001',
      ownerEmail: 'joao@email.com',
      feedingInstructions: 'Ração Premium - 300g por refeição, 2x ao dia',
      allergies: 'Nenhuma conhecida',
      notes: 'Muito animado, adora brincar com bola',
      medications: '',
      vetName: 'Dr. Carlos Veterinário',
      vetPhone: '5511998880001',
    },
  })

  const dog2 = await prisma.dog.upsert({
    where: { id: 'demo-dog-2' },
    update: {},
    create: {
      id: 'demo-dog-2',
      name: 'Luna',
      breed: 'Golden Retriever',
      birthDate: '2021-07-22',
      color: 'Dourada',
      weight: 22.0,
      ownerName: 'Maria Oliveira',
      ownerPhone: '5511999990002',
      ownerEmail: 'maria@email.com',
      feedingInstructions: 'Ração Gold - 250g por refeição, 3x ao dia',
      allergies: 'Frango',
      notes: 'Muito dócil, adora carinho',
      medications: 'Simparic - 1 comprimido por mês (próxima dose: ver prontuário)',
      vetName: 'Dra. Ana Veterinária',
      vetPhone: '5511998880002',
    },
  })

  const today = new Date().toISOString().split('T')[0]

  await prisma.stay.upsert({
    where: { id: 'demo-stay-1' },
    update: {},
    create: {
      id: 'demo-stay-1',
      dogId: dog1.id,
      room: 'Suite 1',
      active: true,
    },
  })

  await prisma.stay.upsert({
    where: { id: 'demo-stay-2' },
    update: {},
    create: {
      id: 'demo-stay-2',
      dogId: dog2.id,
      room: 'Suite 2',
      active: true,
    },
  })

  console.log('✅ Seed concluído!')
  console.log('')
  console.log('👤 Usuários criados:')
  console.log('   Admin:   admin@petday.com   / admin123')
  console.log('   Gestão:  gestao@petday.com  / gestao123')
  console.log('   Monitor: monitor@petday.com / monitor123')
  console.log('')
  console.log('🐕 Cães demo: Thor e Luna (com estadias ativas)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
