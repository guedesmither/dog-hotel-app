import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile } from 'fs/promises'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// POST /api/checkin/photos
// Upload photos and notes for check-in
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const role = (session.user as { role: string }).role
  if (role === 'TUTOR') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const dogId = formData.get('dogId') as string
    const date = formData.get('date') as string
    const notes = formData.get('notes') as string

    if (!dogId || !date) {
      return NextResponse.json({ error: 'dogId e date são obrigatórios' }, { status: 400 })
    }

    const userId = (session.user as { id: string }).id

    // 1. Create or update DailyReport with check-in notes
    const report = await prisma.dailyReport.upsert({
      where: { dogId_date: { dogId, date } },
      update: {
        checkInNotes: notes || null,
        lastEditedById: userId,
      },
      create: {
        dogId,
        date,
        authorId: userId,
        checkInNotes: notes || null,
      },
    })

    // 2. Process and save photos
    const photoUrls: string[] = []
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'checkin', dogId)

    // Ensure upload directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Process each photo field (photo0, photo1, photo2, ...)
    for (let i = 0; i < 10; i++) {
      const photo = formData.get(`photo${i}`) as File
      if (!photo) continue

      const bytes = await photo.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Generate unique filename
      const ext = photo.name.split('.').pop() || 'jpg'
      const filename = `${randomUUID()}.${ext}`
      const filepath = path.join(uploadDir, filename)

      // Save file
      await writeFile(filepath, buffer)

      // Store relative URL
      const url = `/uploads/checkin/${dogId}/${filename}`
      photoUrls.push(url)

      // Save to database
      await prisma.reportPhoto.create({
        data: {
          reportId: report.id,
          url,
          type: 'CHECKIN',
          caption: `Check-in ${date}`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      reportId: report.id,
      photos: photoUrls,
    })
  } catch (error) {
    console.error('Check-in photo upload error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar fotos de check-in' },
      { status: 500 }
    )
  }
}
