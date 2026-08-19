const { PrismaClient } = require('@prisma/client')
const sharp = require('sharp')

const p = new PrismaClient()

async function main() {
  const dogs = await p.dog.findMany({
    where: { photoUrl: { not: null } },
    select: { id: true, name: true, photoUrl: true },
  })

  console.log(`Found ${dogs.length} dogs with photos`)

  let compressed = 0
  let skipped = 0
  let totalSaved = 0

  for (const dog of dogs) {
    if (!dog.photoUrl || !dog.photoUrl.startsWith('data:image/')) {
      skipped++
      continue
    }

    try {
      // Extract base64 data
      const match = dog.photoUrl.match(/^data:image\/(\w+);base64,(.+)$/)
      if (!match) {
        skipped++
        continue
      }

      const buf = Buffer.from(match[2], 'base64')
      const originalSize = buf.length

      // Skip if already small enough (< 100KB)
      if (originalSize < 100 * 1024) {
        skipped++
        continue
      }

      const compressed = await sharp(buf)
        .resize(300, 300, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 80 })
        .toBuffer()

      const newSize = compressed.length
      const saved = originalSize - newSize
      totalSaved += saved

      const newPhotoUrl = `data:image/jpeg;base64,${compressed.toString('base64')}`

      await p.dog.update({
        where: { id: dog.id },
        data: { photoUrl: newPhotoUrl },
      })

      compressed++
      console.log(`[${compressed}/${dogs.length}] ${dog.name}: ${(originalSize / 1024).toFixed(0)}KB -> ${(newSize / 1024).toFixed(0)}KB (saved ${(saved / 1024).toFixed(0)}KB)`)
    } catch (err) {
      console.error(`Error compressing ${dog.name}:`, err.message)
      skipped++
    }
  }

  console.log(`\nDone: ${compressed} compressed, ${skipped} skipped`)
  console.log(`Total saved: ${(totalSaved / 1024 / 1024).toFixed(2)}MB`)
}

main().finally(() => p.$disconnect())
