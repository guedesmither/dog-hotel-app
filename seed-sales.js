const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DOG_ALIAS = {
  'Betina': { nameSearch: 'Eunira', ownerSearch: 'Betina' },
  'Pandora': { nameSearch: 'Pandora', ownerSearch: 'Zenezi' },
}

function parseDate(s) {
  if (!s || !s.trim()) return null
  const [d, m, y] = s.trim().split('/')
  return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00.000Z`)
}
function parsePayMethod(s) {
  if (!s || !s.trim()) return null
  const u = s.toUpperCase()
  if (u.includes('PIX')) return 'PIX'
  if (u.includes('CR') && u.includes('DITO')) return 'CREDITO'
  if (u.includes('DINHEIRO')) return 'DINHEIRO'
  return null
}
function parsePayStatus(stPag, stSvc) {
  const p = (stPag||'').trim().toUpperCase()
  if (p === 'PAGO') return 'PAGO'
  if (p === 'AGENDADO' || (stSvc||'').toUpperCase() === 'AGENDADO') return 'AGENDADO'
  return 'PENDENTE'
}
function getSaleType(mod) {
  const m = mod.trim().toUpperCase()
  if (m === 'CRECHE') return 'MENSAL'
  if (m === 'HOTEL' || m === 'PERNOITE') return 'HOTEL'
  if (m === 'DAYCARE') return 'AVULSO'
  if (m.includes('PACOTE')) return 'PACOTE'
  return 'SERVICO'
}
function getProductName(mod, freq, valorUn) {
  const m = mod.trim().toUpperCase(), f = freq.trim().toUpperCase()
  const mMap = {'MENSAL 1X':'Mensal 1x','MENSAL 2X':'Mensal 2x','MENSAL 3X':'Mensal 3x','MENSAL 4X':'Mensal 4x','MENSAL 5X':'Mensal 5x','MENSAL 6X':'Mensal 6x'}
  if (m === 'CRECHE') return mMap[f] || `Mensal ${f.replace('MENSAL ','').toLowerCase()}`
  if (m === 'PERNOITE') return 'Pernoite'
  if (m === 'HOTEL') return valorUn >= 200 ? 'Hotel Feriado' : 'Hotel Regular'
  if (m === 'DAYCARE') return '1 Dia'
  if (m.includes('PACOTE')) return f.includes('10') ? 'Pacote 10 Dias' : 'Pacote 5 Dias'
  if (m === 'BANHO') return `Banho ${f}`
  return freq
}

// [dog, tutor, mod, freq, entrada, saida, stSvc, valorUn, total, valorFinal, pagamento, taxa, valorConta, stPag]
const rawSales = [
  ['Sol','Carla','Hotel','3 DIAS','12/02/2026','15/02/2026','OK',150,450,300,'CRÉDITO - CIELO - 1X',3.48,289.56,'PAGO'],
  ['Luna','Tássia','Daycare','1 DIA','27/02/2026','27/02/2026','OK',115,115,115,'PIX',0,115,'PAGO'],
  ['Sirius Black','Aline Porto','Hotel','2 DIAS','28/02/2026','02/03/2026','OK',150,300,300,'PIX',0,300,'PAGO'],
  ['Dory','Valéria Bellato','Creche','MENSAL 1X','03/03/2026','31/03/2026','OK',460,460,460,'PIX',0,460,'PAGO'],
  ['Sirius Black','Aline Porto','Hotel','2 DIAS','05/03/2026','07/03/2026','OK',150,300,300,'PIX',0,300,'PAGO'],
  ['Sirius Black','Aline Porto','Creche','MENSAL 1X','11/03/2026','08/04/2026','OK',460,460,400,'PIX',0,400,'PAGO'],
  ['Sirius Black','Aline Porto','Hotel','2 DIAS','14/03/2026','16/03/2026','OK',150,300,300,'PIX',0,300,'PAGO'],
  ['Luna','Tássia','Daycare','1 DIA','16/03/2026','16/03/2026','OK',115,115,115,'PIX',0,115,'PAGO'],
  ['Baruc','Débora Dantas','Pacote -DC','10 DIAS','16/03/2026','16/09/2026','OK',1000,1000,1050,'CRÉDITO - CIELO - 2X',5.97,987.32,'PAGO'],
  ['Sirius Black','Aline Porto','Hotel','2 DIAS','17/03/2026','20/03/2026','OK',150,300,300,'PIX',0,300,'PAGO'],
  ['Sirius Black','Aline Porto','Pernoite','1 NOITE','18/03/2026','19/03/2026','OK',50,50,50,'PIX',0,50,'PAGO'],
  ['Ramiro','Barbara Gomes','Hotel','3 DIAS','20/03/2026','23/03/2026','OK',150,450,360,'PIX',0,360,'PAGO'],
  ['Mel','Alcides','Hotel','1 DIA','21/03/2026','22/03/2026','OK',150,150,135,'PIX',0,135,'PAGO'],
  ['Theodoro','Vitoria Koyama','Creche','MENSAL 2X','24/03/2026','23/04/2026','OK',640,640,600,'PIX',0,600,'PAGO'],
  ['Luna','Tássia','Hotel','10 DIAS','24/03/2026','03/04/2026','OK',150,1500,1300,'PIX',0,1300,'PAGO'],
  ['Sirius Black','Aline Porto','Pernoite','1 NOITE','24/03/2026','25/03/2026','OK',50,50,50,'PIX',0,50,'PAGO'],
  ['Romain','Gabriel Montanher','Creche','MENSAL 2X','25/03/2026','24/04/2026','OK',640,640,500,'PIX',0,500,'PAGO'],
  ['Theo','Gabriel Montanher','Creche','MENSAL 2X','25/03/2026','24/04/2026','OK',640,640,500,'PIX',0,500,'PAGO'],
  ['Sirius Black','Aline Porto','Hotel','1 DIA','25/03/2026','26/03/2026','OK',150,150,150,'PIX',0,150,'PAGO'],
  ['Betina','Eunira Keiko','Daycare','1 DIA','28/03/2026','28/03/2026','OK',115,115,115,'PIX',0,115,'PAGO'],
  ['Jack Sparrow','Maria Gabriela','Pacote -DC','5 DIAS','28/03/2026','28/09/2026','3/5',1000,500,500,'PIX',0,500,'PAGO'],
  ['Annie Bonny','Maria Gabriela','Pacote -DC','5 DIAS','28/03/2026','28/09/2026','3/5',1000,500,500,'PIX',0,500,'PAGO'],
  ['Sirius Black','Aline Porto','Hotel','1 DIA','28/03/2026','30/03/2026','OK',150,150,150,'PIX',0,150,'PAGO'],
  ['Tobias','Silvana Cobo','Creche','MENSAL 2X','31/03/2026','30/04/2026','OK',640,640,580,'PIX',0,580,'PAGO'],
  ['Sol','Carla','Hotel','2 DIAS','02/04/2026','05/04/2026','OK',200,500,400,'CRÉDITO - CIELO - 1X',3.48,386.08,'PAGO'],
  ['Baruc','Débora Dantas','Daycare','1 DIA','02/04/2026','02/04/2026','OK',115,115,115,'CRÉDITO - CIELO - 1X',3.80,110.63,'PAGO'],
  ['Baruc','Débora Dantas','Hotel','1 DIA','03/04/2026','04/04/2026','OK',200,200,150,'CRÉDITO - CIELO - 1X',3.23,145.15,'PAGO'],
  ['Thifany','Roselaine da Mota','Hotel','1 DIA','04/04/2026','05/04/2026','OK',200,200,200,'PIX',0,200,'PAGO'],
  ['Sirius Black','Aline Porto','Hotel','2 DIAS','04/04/2026','06/04/2026','OK',200,400,360,null,0,0,'PENDENTE'],
  ['Mel','Jeniffer Lemes','Hotel','1 DIA','09/04/2026','10/04/2026','OK',150,150,150,'PIX',0,150,'PAGO'],
  ['Jack Sparrow','Maria Gabriela','Hotel','6 DIAS','11/04/2026','17/04/2026','OK',150,900,750,'PIX',0,750,'PAGO'],
  ['Annie Bonny','Maria Gabriela','Hotel','6 DIAS','11/04/2026','17/04/2026','OK',150,900,750,'PIX',0,750,'PAGO'],
  ['Sirius Black','Aline Porto','Hotel','2 DIAS','11/04/2026','13/04/2026','OK',150,300,300,null,0,0,'PENDENTE'],
  ['Luna','Tássia','Daycare','1 DIA','14/04/2026','14/04/2026','OK',115,115,115,'PIX',0,115,'PAGO'],
  ['Sirius Black','Aline Porto','Creche','MENSAL 1X','15/04/2026','13/05/2026','ANDAMENTO',460,460,380,null,0,0,'PENDENTE'],
  ['Thifany','Roselaine da Mota','Daycare','1 DIA','15/04/2026','15/04/2026','OK',115,115,115,'PIX',0,115,'PAGO'],
  ['Ramiro','Barbara Gomes','Hotel','5 DIAS','17/04/2026','22/04/2026','OK',150,750,630,'PIX',0,630,'PAGO'],
  ['Maya','Leonardo','Daycare','1 DIA','18/04/2026','18/04/2026','OK',115,115,115,'PIX',0,115,'PAGO'],
  ['Maya','Leonardo','Banho','GG','18/04/2026','18/04/2026','OK',110,110,110,'PIX',0,110,'PAGO'],
  ['Hera','Ionice Leite','Banho','P','18/04/2026','18/04/2026','OK',40,40,40,'PIX',0,40,'PAGO'],
  ['Suzy','Ionice Leite','Banho','P','18/04/2026','18/04/2026','OK',40,40,40,'PIX',0,40,'PAGO'],
  ['Belinha','Ionice Leite','Banho','P','18/04/2026','18/04/2026','OK',40,40,40,'PIX',0,40,'PAGO'],
  ['Bucky','Lucas de Carvalho Xavier','Creche','MENSAL 2X','20/04/2026','20/05/2026','ANDAMENTO',640,640,576,'CRÉDITO - CIELO - 1X',3.48,555.96,'PAGO'],
  ['Thifany','Roselaine da Mota','Hotel','1 DIA','20/04/2026','21/04/2026','OK',200,200,200,'PIX',0,200,'PAGO'],
  ['Sirius Black','Aline Porto','Hotel','1 DIA','21/04/2026','22/04/2026','OK',200,400,360,null,0,0,'PENDENTE'],
  ['Leonardo','Thaís Gabrielly','Creche','MENSAL 2X','22/04/2026','22/05/2026','ANDAMENTO',640,640,576,'PIX',0,576,'PAGO'],
  ['Theodoro','Vitoria Koyama','Creche','MENSAL 2X','24/04/2026','24/05/2026','ANDAMENTO',640,640,580,'PIX',0,580,'PAGO'],
  ['Bucky','Lucas de Carvalho Xavier','Hotel','3 DIAS','24/04/2026','27/04/2026','OK',150,450,400,'CRÉDITO - CIELO - 1X',3.48,386.08,'PAGO'],
  ['Sirius Black','Aline Porto','Hotel','2 DIAS','24/04/2026','26/04/2026','OK',150,300,300,null,0,0,'PENDENTE'],
  ['Ramiro','Barbara Gomes','Hotel','2 DIAS','24/04/2026','26/04/2026','OK',150,300,240,'PIX',0,240,'PAGO'],
  ['Romain','Gabriel Montanher','Creche','MENSAL 2X','25/04/2026','25/05/2026','ANDAMENTO',640,640,500,'CRÉDITO - CIELO - 1X',3.48,482.60,'PAGO'],
  ['Theo','Gabriel Montanher','Creche','MENSAL 2X','25/04/2026','25/05/2026','ANDAMENTO',640,640,500,'CRÉDITO - CIELO - 1X',3.48,482.60,'PAGO'],
  ['Sol','Carla','Daycare','1 DIA','29/04/2026','29/04/2026','OK',115,115,115,null,0,0,'PENDENTE'],
  ['Sol','Carla','Banho','G','29/04/2026','29/04/2026','OK',90,90,90,null,0,0,'PENDENTE'],
  ['Sirius Black','Aline Porto','Hotel','1 DIA','29/04/2026','29/04/2026','OK',150,150,150,null,0,0,'PENDENTE'],
  ['Maya','Leonardo','Daycare','1 DIA','29/04/2026','29/04/2026','OK',115,115,115,'CRÉDITO - CIELO - 1X',3.80,110.63,'PAGO'],
  ['Maya','Leonardo','Banho','GG','29/04/2026','29/04/2026','OK',110,110,110,'CRÉDITO - CIELO - 1X',3.80,105.82,'PAGO'],
  ['Júpiter','Gabriela Bittencourt','Creche','MENSAL 2X','30/04/2026','30/05/2026','ANDAMENTO',640,640,640,'PIX',0,640,'PAGO'],
  ['Ramiro','Barbara Gomes','Hotel','3 DIAS','30/04/2026','04/05/2026','OK',200,800,600,'PIX',0,600,'PAGO'],
  ['Sirius Black','Aline Porto','Hotel','2 DIAS','30/04/2026','02/05/2026','OK',200,400,360,null,0,0,'PENDENTE'],
  ['Júpiter','Gabriela Bittencourt','Hotel','2 DIAS','01/05/2026','03/05/2026','OK',200,500,500,'DINHEIRO',0,500,'PAGO'],
  ['Tobias','Silvana Cobo','Creche','MENSAL 2X','01/05/2026','31/05/2026','ANDAMENTO',640,640,580,'PIX',0,580,'PAGO'],
  ['Theodoro','Rafaela Nogueira','Hotel','1 DIA','02/05/2026','03/05/2026','OK',200,200,150,'PIX',0,150,'PAGO'],
  ['Diana','Rafaela Nogueira','Hotel','1 DIA','02/05/2026','03/05/2026','OK',200,200,150,'PIX',0,150,'PAGO'],
  ['Lolla','Rafaela Nogueira','Hotel','1 DIA','02/05/2026','03/05/2026','OK',200,200,150,'PIX',0,150,'PAGO'],
  ['Pandora','Rafaela Zanzeni','Creche','MENSAL 5X','04/05/2026','03/06/2026','ANDAMENTO',975,975,877.50,'PIX',0,877.50,'PAGO'],
  ['Dory','Valéria Bellato','Creche','MENSAL 1X','05/05/2026','04/06/2026','ANDAMENTO',460,460,380,'PIX',0,0,'PENDENTE'],
  ['Betina','Eunira Keiko','Creche','MENSAL 1X','06/05/2026','05/06/2026','ANDAMENTO',460,460,400,'PIX',0,400,'PAGO'],
  ['Leonardo','Thaís Gabrielly','Banho','GG','06/05/2026','06/05/2026','OK',110,110,110,null,0,0,'PENDENTE'],
  ['Sirius Black','Aline Porto','Hotel','1 DIA','06/05/2026','07/05/2026','OK',150,150,150,null,0,0,'PENDENTE'],
  ['Pandora','Rafaela Zanzeni','Banho','GG','07/05/2026','07/05/2026','OK',110,110,110,'PIX',0,110,'PAGO'],
  ['Ramiro','Barbara Gomes','Hotel','2 DIAS','08/05/2026','10/05/2026','AGENDADO',150,300,240,'PIX',0,0,'AGENDADO'],
  ['Tsuki','','Pacote -DC','10 DIAS','08/05/2026','08/11/2026','AGENDADO',1000,1000,1000,'PIX',0,0,'AGENDADO'],
  ['Sirius Black','Aline Porto','Creche','MENSAL 1X','15/05/2026','14/06/2026','AGENDADO',460,460,400,null,0,0,'AGENDADO'],
  ['Betina','Eunira Keiko','Creche','MENSAL 1X','06/06/2026','05/07/2026','AGENDADO',460,460,400,'PIX',0,400,'PAGO'],
  ['Betina','Eunira Keiko','Creche','MENSAL 1X','06/07/2026','05/08/2026','AGENDADO',460,460,400,'PIX',0,400,'PAGO'],
  ['Betina','Eunira Keiko','Creche','MENSAL 1X','06/08/2026','05/09/2026','AGENDADO',460,460,400,'PIX',0,400,'PAGO'],
  ['Betina','Eunira Keiko','Creche','MENSAL 1X','06/09/2026','05/10/2026','AGENDADO',460,460,400,'PIX',0,400,'PAGO'],
  ['Betina','Eunira Keiko','Creche','MENSAL 1X','06/10/2026','05/11/2026','AGENDADO',460,460,400,'PIX',0,400,'PAGO'],
  ['Bucky','Lucas de Carvalho Xavier','Creche','MENSAL 2X','20/05/2026','20/06/2026','AGENDADO',640,640,576,null,0,0,'AGENDADO'],
  ['Leonardo','Thaís Gabrielly','Creche','MENSAL 2X','22/05/2026','22/06/2026','AGENDADO',640,640,576,null,0,0,'AGENDADO'],
  ['Theodoro','Vitoria Koyama','Creche','MENSAL 2X','24/05/2026','24/06/2026','AGENDADO',640,640,580,null,0,0,'AGENDADO'],
  ['Romain','Gabriel Montanher','Creche','MENSAL 2X','25/05/2026','25/06/2026','AGENDADO',640,640,500,null,0,0,'AGENDADO'],
  ['Theo','Gabriel Montanher','Creche','MENSAL 2X','25/05/2026','25/06/2026','AGENDADO',640,640,500,null,0,0,'AGENDADO'],
  ['Júpiter','Gabriela Bittencourt','Creche','MENSAL 2X','30/05/2026','30/06/2026','AGENDADO',640,640,640,null,0,0,'AGENDADO'],
]

async function main() {
  // Ensure Pernoite product exists
  let pernoite = await prisma.product.findFirst({ where: { name: 'Pernoite' } })
  if (!pernoite) {
    pernoite = await prisma.product.create({ data: { name: 'Pernoite', category: 'HOTEL', price: 50, isActive: true } })
    console.log('✅ Produto Pernoite criado')
  }

  // Cache all dogs and products
  const allDogs = await prisma.dog.findMany({ select: { id: true, name: true, ownerName: true, matricula: true } })
  const allProducts = await prisma.product.findMany({ where: { isActive: true } })
  const dogCache = {}

  function findDog(dogName, tutorName) {
    const key = `${dogName}|${tutorName}`
    if (dogCache[key]) return dogCache[key]
    const alias = DOG_ALIAS[dogName]
    if (alias) {
      const d = allDogs.find(x =>
        x.name.toLowerCase().includes(alias.nameSearch.toLowerCase()) ||
        x.ownerName.toLowerCase().includes(alias.ownerSearch.toLowerCase())
      )
      if (d) { dogCache[key] = d; return d }
    }
    const nameMatches = allDogs.filter(x => x.name.toLowerCase().includes(dogName.toLowerCase()))
    if (nameMatches.length === 1) { dogCache[key] = nameMatches[0]; return nameMatches[0] }
    if (nameMatches.length > 1 && tutorName) {
      const first = tutorName.trim().split(' ')[0].toLowerCase()
      const m = nameMatches.find(x => x.ownerName.toLowerCase().includes(first))
      if (m) { dogCache[key] = m; return m }
    }
    const r = nameMatches[0] || null
    dogCache[key] = r; return r
  }

  function findProduct(mod, freq, valorUn) {
    const pName = getProductName(mod, freq, valorUn)
    return allProducts.find(p => p.name.toLowerCase() === pName.toLowerCase())
      || allProducts.find(p => p.name.toLowerCase().includes(pName.toLowerCase()))
      || null
  }

  let created = 0, skipped = 0, errors = 0
  const newDogMap = {}

  for (const row of rawSales) {
    const [dogName, tutorName, mod, freq, entrada, saida, stSvc, valorUn, total, valorFinal, pagamento, taxa, valorConta, stPag] = row
    try {
      let dog = findDog(dogName, tutorName)

      if (!dog) {
        // Create minimal dog record
        const nKey = `${dogName}|${tutorName}`
        if (newDogMap[nKey]) {
          dog = newDogMap[nKey]
        } else {
          const created_dog = await prisma.dog.create({
            data: { name: dogName, ownerName: tutorName || 'Desconhecido', ownerPhone: '', breed: 'Não informado', dogStatus: 'AVULSO', isActive: true },
          })
          newDogMap[nKey] = created_dog
          allDogs.push(created_dog)
          dog = created_dog
          console.log(`🐕 Novo cão criado: ${dogName} (${tutorName})`)
        }
      }

      const product = findProduct(mod, freq, valorUn)
      const saleDate = parseDate(entrada)
      const startDate = parseDate(entrada)
      const endDate = parseDate(saida)
      const basePrice = total
      const finalPrice = valorFinal
      const discount = Math.round((basePrice - finalPrice) * 100) / 100
      const amountRec = valorConta > 0 ? valorConta : (stPag === 'PAGO' ? finalPrice : null)
      const qty = (mod.toUpperCase() === 'HOTEL' || mod.toUpperCase() === 'PERNOITE') && valorUn > 0 && total % valorUn === 0 ? total / valorUn : 1
      const itemUnitPrice = qty > 1 ? valorUn : total
      const notes = stSvc !== 'OK' ? `Status: ${stSvc}` : null

      await prisma.sales.create({
        data: {
          dogId: dog.id,
          saleType: getSaleType(mod),
          saleDate,
          startDate,
          endDate,
          basePrice,
          finalPrice,
          discount,
          paymentMethod: parsePayMethod(pagamento),
          paymentFee: taxa || 0,
          amountReceived: amountRec,
          paymentStatus: parsePayStatus(stPag, stSvc),
          notes,
          items: {
            create: [{
              productId: product?.id || null,
              quantity: qty,
              unitPrice: itemUnitPrice,
              totalPrice: total,
            }],
          },
        },
      })
      console.log(`✅ ${dogName} | ${mod} ${freq} | ${entrada} | R$${finalPrice} | ${stPag}`)
      created++
    } catch (err) {
      console.error(`❌ Erro: ${dogName} ${entrada} — ${err.message}`)
      errors++
    }
  }

  console.log(`\n📊 Resumo: ${created} vendas criadas | ${skipped} puladas | ${errors} erros`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
