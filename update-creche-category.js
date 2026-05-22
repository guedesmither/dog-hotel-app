const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    console.log('=== Atualizando categoria CRECHE para produtos de creche ===')
    
    // Produtos que devem ter categoria CRECHE
    const crecheProductIds = [
      'cmot3hm0r00006vip2qkhiq69', // Diária de Creche
      'cmot3u4uv00005d0p09uubqzx', // Mensalidade 1x/semana (Período Integral)
      'cmot3u4v300015d0pwz1ntp42', // Mensalidade 2x/semana (Período Integral)
      'cmot3u4vf00035d0p98y16ulw', // Mensalidade 3x/semana (Meio Período)
      'cmot3u4v900025d0pvem8gngl', // Mensalidade 3x/semana (Período Integral)
      'cmot3u4vn00045d0pis2yvc28', // Mensalidade 4x/semana (Período Integral)
      'cmot3u4vu00055d0pbfi41y8f', // Mensalidade 5x/semana (Período Integral)
      'cmot3u4w000065d0pqd9cizan', // Mensalidade 6x/semana (Período Integral)
    ]

    for (const productId of crecheProductIds) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      })

      if (!product) {
        console.log(`Produto ${productId} não encontrado`)
        continue
      }

      console.log(`Atualizando: ${product.name} (${product.category} -> CRECHE)`)

      await prisma.product.update({
        where: { id: productId },
        data: { category: 'CRECHE' },
      })

      console.log(`✓ ${product.name} atualizado para CRECHE`)
    }

    console.log('\nTodos os produtos de creche foram atualizados para categoria CRECHE')
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
