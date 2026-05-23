import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { users, dogs, products, sales, dailyRosters, stays, replacements, packages } = body

    console.log('Importando dados...')
    console.log(`Usuários: ${users?.length || 0}`)
    console.log(`Cães: ${dogs?.length || 0}`)
    console.log(`Produtos: ${products?.length || 0}`)
    console.log(`Vendas: ${sales?.length || 0}`)
    console.log(`Agenda: ${dailyRosters?.length || 0}`)
    console.log(`Estadias: ${stays?.length || 0}`)
    console.log(`Reposições: ${replacements?.length || 0}`)
    console.log(`Pacotes: ${packages?.length || 0}`)

    // Importar usuários
    if (users && users.length > 0) {
      for (const user of users) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } })
        if (!existing) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              password: user.password.startsWith('$2') ? user.password : await bcrypt.hash(user.password, 10),
              role: user.role,
            }
          })
        }
      }
      console.log('✅ Usuários importados')
    }

    // Importar cães
    if (dogs && dogs.length > 0) {
      for (const dog of dogs) {
        const existing = await prisma.dog.findUnique({ where: { id: dog.id } })
        if (!existing) {
          await prisma.dog.create({
            data: {
              id: dog.id,
              name: dog.name,
              breed: dog.breed,
              birthDate: dog.birthDate || null,
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
              color: dog.color,
              weight: dog.weight,
              agreedPrice: dog.agreedPrice || dog.monthlyPrice || 0,
              discountPercent: dog.discountPercent || 0,
              discountValue: dog.discountValue || dog.customPrice || 0,
              frequencyDays: dog.frequencyDays || 5,
              isHalfDay: dog.isHalfDay || false,
              isBolsista: dog.isBolsista || dog.isScholarship || false,
              dogStatus: dog.dogStatus || dog.plan || 'MENSAL',
              photoUrl: dog.photoUrl,
              createdAt: dog.createdAt ? new Date(dog.createdAt) : new Date(),
              updatedAt: dog.updatedAt ? new Date(dog.updatedAt) : new Date(),
            }
          })
        }
      }
      console.log('✅ Cães importados')
    }

    // Importar produtos (deve ser antes das vendas)
    if (products && products.length > 0) {
      for (const product of products) {
        const existing = await prisma.product.findUnique({ where: { id: product.id } })
        if (!existing) {
          await prisma.product.create({
            data: {
              id: product.id,
              name: product.name,
              description: product.description || null,
              category: product.category,
              price: product.price,
              isActive: product.isActive ?? true,
              createdAt: product.createdAt ? new Date(product.createdAt) : new Date(),
            }
          })
        }
      }
      console.log('✅ Produtos importados')
    }

    // Importar vendas (upsert para atualizar dados incompletos)
    if (sales && sales.length > 0) {
      for (const sale of sales) {
        const saleData = {
          dogId: sale.dogId || null,
          saleType: sale.saleType,
          saleDate: sale.saleDate ? new Date(sale.saleDate) : new Date(),
          serviceDate: sale.serviceDate ? new Date(sale.serviceDate) : null,
          startDate: sale.startDate ? new Date(sale.startDate) : null,
          endDate: sale.endDate ? new Date(sale.endDate) : null,
          basePrice: sale.basePrice || 0,
          finalPrice: sale.finalPrice || 0,
          discount: sale.discount || 0,
          isExempt: sale.isExempt || false,
          paymentMethod: sale.paymentMethod || null,
          paymentFee: sale.paymentFee || 0,
          amountReceived: sale.amountReceived || null,
          paymentStatus: sale.paymentStatus || 'PENDENTE',
          paymentDate: sale.paymentDate || null,
          notes: sale.notes || null,
          manualBaixa: sale.manualBaixa || false,
          manualBaixaDate: sale.manualBaixaDate ? new Date(sale.manualBaixaDate) : null,
        }
        await prisma.sales.upsert({
          where: { id: sale.id },
          update: saleData,
          create: { id: sale.id, ...saleData, createdAt: sale.createdAt ? new Date(sale.createdAt) : new Date() },
        })
        // Upsert sale items
        if (sale.items && sale.items.length > 0) {
          for (const item of sale.items) {
            await prisma.saleItem.upsert({
              where: { id: item.id },
              update: {
                productId: item.productId || null,
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                totalPrice: item.totalPrice || 0,
              },
              create: {
                id: item.id,
                saleId: sale.id,
                productId: item.productId || null,
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                totalPrice: item.totalPrice || 0,
              }
            })
          }
        }
      }
      console.log('✅ Vendas importadas')
    }

    // Importar agenda
    if (dailyRosters && dailyRosters.length > 0) {
      for (const entry of dailyRosters) {
        const existing = await prisma.dailyRoster.findFirst({
          where: { dogId: entry.dogId, date: entry.date }
        })
        if (!existing) {
          await prisma.dailyRoster.create({
            data: {
              id: entry.id,
              dogId: entry.dogId,
              date: entry.date,
              present: entry.present,
              source: entry.source,
              type: entry.type,
              negotiatedPrice: entry.negotiatedPrice || null,
              isPernoite: entry.isPernoite || false,
              hasBanho: entry.hasBanho || false,
              createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
            }
          })
        }
      }
      console.log('✅ Agenda importada')
    }

    // Importar estadias
    if (stays && stays.length > 0) {
      for (const stay of stays) {
        const existing = await prisma.stay.findUnique({ where: { id: stay.id } })
        if (!existing) {
          await prisma.stay.create({
            data: {
              id: stay.id,
              dogId: stay.dogId,
              active: stay.active,
              isScheduled: stay.isScheduled,
              checkIn: stay.checkIn || null,
              checkOut: stay.checkOut || null,
              scheduledCheckIn: stay.scheduledCheckIn || null,
              scheduledCheckOut: stay.scheduledCheckOut || null,
              checkInHealthNotes: stay.checkInHealthNotes,
              checkInBelongings: stay.checkInBelongings,
              checkOutHealthNotes: stay.checkOutHealthNotes,
              createdAt: stay.createdAt ? new Date(stay.createdAt) : new Date(),
            }
          })
        }
      }
      console.log('✅ Estadias importadas')
    }

    // Importar reposições
    if (replacements && replacements.length > 0) {
      for (const replacement of replacements) {
        const existing = await prisma.replacement.findUnique({ where: { id: replacement.id } })
        if (!existing) {
          await prisma.replacement.create({
            data: {
              id: replacement.id,
              dogId: replacement.dogId,
              absentDate: replacement.absentDate,
              billingMonthEnd: replacement.billingMonthEnd,
              scheduledDate: replacement.scheduledDate,
              status: replacement.status || 'PENDING',
              createdAt: replacement.createdAt ? new Date(replacement.createdAt) : new Date(),
              updatedAt: replacement.updatedAt ? new Date(replacement.updatedAt) : new Date(),
            }
          })
        }
      }
      console.log('✅ Reposições importadas')
    }

    // Importar pacotes
    if (packages && packages.length > 0) {
      for (const pkg of packages) {
        const existing = await prisma.package.findUnique({ where: { id: pkg.id } })
        if (!existing) {
          await prisma.package.create({
            data: {
              id: pkg.id,
              dogId: pkg.dogId,
              packageType: pkg.packageType,
              totalDays: pkg.totalDays,
              remainingDays: pkg.remainingDays,
              purchaseDate: pkg.purchaseDate ? new Date(pkg.purchaseDate) : new Date(),
              expiryDate: pkg.expiryDate ? new Date(pkg.expiryDate) : new Date(),
              pricePaid: pkg.pricePaid,
              isActive: pkg.isActive ?? true,
              createdAt: pkg.createdAt ? new Date(pkg.createdAt) : new Date(),
              updatedAt: pkg.updatedAt ? new Date(pkg.updatedAt) : new Date(),
            }
          })
        }
      }
      console.log('✅ Pacotes importados')
    }

    return NextResponse.json({
      success: true,
      message: 'Dados importados com sucesso!',
      counts: {
        users: users?.length || 0,
        dogs: dogs?.length || 0,
        sales: sales?.length || 0,
        dailyRosters: dailyRosters?.length || 0,
        stays: stays?.length || 0,
        replacements: replacements?.length || 0,
        packages: packages?.length || 0,
      }
    })

  } catch (error) {
    console.error('Erro na importação:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}
