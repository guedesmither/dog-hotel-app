import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  try {
    // Verificar se já existe algum usuário
    const existingUsers = await prisma.user.count()
    
    if (existingUsers > 0) {
      return NextResponse.json({ 
        message: 'Setup já foi realizado. Usuários já existem no banco.',
        count: existingUsers 
      })
    }

    // Criar usuários iniciais
    const users = [
      {
        email: 'admin@petday.com',
        name: 'Administrador',
        password: await bcrypt.hash('admin123', 10),
        role: 'ADMIN',
      },
      {
        email: 'gestao@petday.com',
        name: 'Gestão',
        password: await bcrypt.hash('gestao123', 10),
        role: 'MANAGER',
      },
      {
        email: 'monitor@petday.com',
        name: 'Monitor',
        password: await bcrypt.hash('monitor123', 10),
        role: 'MONITOR',
      },
    ]

    for (const userData of users) {
      await prisma.user.create({ data: userData })
    }

    return NextResponse.json({
      message: 'Setup realizado com sucesso!',
      users: [
        { email: 'admin@petday.com', password: 'admin123', role: 'ADMIN' },
        { email: 'gestao@petday.com', password: 'gestao123', role: 'MANAGER' },
        { email: 'monitor@petday.com', password: 'monitor123', role: 'MONITOR' },
      ]
    })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'Erro no setup', details: String(error) }, { status: 500 })
  }
}
