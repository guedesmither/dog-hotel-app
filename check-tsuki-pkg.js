const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const dog = await p.dog.findFirst({ where: { name: { contains: 'Tsuki' } }, select: { id: true, name: true, isActive: true, serviceType: true } })
  console.log('Dog:', JSON.stringify(dog, null, 2))
  if (!dog) return
  const pkgs = await p.package.findMany({ where: { dogId: dog.id }, orderBy: { createdAt: 'desc' } })
  console.log('Packages:', JSON.stringify(pkgs, null, 2))
  const sales = await p.sales.findMany({ where: { dogId: dog.id, saleType: 'PACOTE' }, orderBy: { saleDate: 'desc' }, take: 5, select: { id: true, saleDate: true, saleType: true, paymentStatus: true, startDate: true, endDate: true } })
  console.log('Sales PACOTE:', JSON.stringify(sales, null, 2))
}
main().finally(() => p.$disconnect())
