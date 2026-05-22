const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Historical sales data from user
const historicalSales = [
  { dog: 'Sol', tutor: 'Carla', service: 'Hotel', freq: '3 DIAS', start: '12/02/2026', end: '15/02/2026', unitPrice: 150, days: 3, total: 450, discount: 33, finalPrice: 300, paymentMethod: 'CRÉDITO - CIELO - 1X', fee: 3.48, amountReceived: 289.56, status: 'PAGO', paymentDate: '04/mar', notes: '', saleType: 'HOTEL' },
  { dog: 'Luna', tutor: 'Tássia', service: 'Daycare', freq: '1 DIA', start: '27/02/2026', end: '27/02/2026', unitPrice: 115, days: 1, total: 115, discount: 0, finalPrice: 115, paymentMethod: 'PIX', fee: 0, amountReceived: 115, status: 'PAGO', paymentDate: '27/fev', notes: '', saleType: 'AVULSO' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Hotel', freq: '2 DIAS', start: '28/02/2026', end: '02/03/2026', unitPrice: 150, days: 2, total: 300, discount: 0, finalPrice: 300, paymentMethod: 'PIX', fee: 0, amountReceived: 300, status: 'PAGO', paymentDate: '09/mar', notes: '', saleType: 'HOTEL' },
  { dog: 'Dory', tutor: 'Valéria Bellato', service: 'Creche', freq: 'MENSAL 1X', start: '03/03/2026', end: '31/03/2026', unitPrice: 460, days: 1, total: 460, discount: 0, finalPrice: 460, paymentMethod: 'PIX', fee: 0, amountReceived: 460, status: 'PAGO', paymentDate: '03/mar', notes: '', saleType: 'MENSAL' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Hotel', freq: '2 DIAS', start: '05/03/2026', end: '07/03/2026', unitPrice: 150, days: 2, total: 300, discount: 0, finalPrice: 300, paymentMethod: '', fee: 0, amountReceived: 300, status: 'PAGO', paymentDate: '09/mar', notes: '', saleType: 'HOTEL' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Creche', freq: 'MENSAL 1X', start: '11/03/2026', end: '08/04/2026', unitPrice: 460, days: 1, total: 460, discount: 13, finalPrice: 400, paymentMethod: '', fee: 0, amountReceived: 400, status: 'PAGO', paymentDate: '01/abr', notes: '', saleType: 'MENSAL' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Hotel', freq: '2 DIAS', start: '14/03/2026', end: '16/03/2026', unitPrice: 150, days: 2, total: 300, discount: 0, finalPrice: 300, paymentMethod: '', fee: 0, amountReceived: 300, status: 'PAGO', paymentDate: '01/abr', notes: '', saleType: 'HOTEL' },
  { dog: 'Baruc', tutor: 'Débora Dantas', service: 'Pacote -DC', freq: '10 DIAS', start: '16/03/2026', end: '16/09/2026', unitPrice: 1000, days: 1, total: 1000, discount: -5, finalPrice: 1050, paymentMethod: 'CRÉDITO - CIELO - 2X', fee: 5.97, amountReceived: 987.32, status: 'PAGO', paymentDate: '16/mar', notes: '', saleType: 'PACOTE' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Hotel', freq: '2 DIAS', start: '17/03/2026', end: '20/03/2026', unitPrice: 150, days: 2, total: 300, discount: 0, finalPrice: 300, paymentMethod: '', fee: 0, amountReceived: 300, status: 'PAGO', paymentDate: '01/abr', notes: '', saleType: 'HOTEL' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Pernoite', freq: '1 NOITE', start: '18/03/2026', end: '19/03/2026', unitPrice: 50, days: 1, total: 50, discount: 0, finalPrice: 50, paymentMethod: '', fee: 0, amountReceived: 50, status: 'PAGO', paymentDate: '01/abr', notes: '', saleType: 'HOTEL' },
  { dog: 'Ramiro', tutor: 'Barbara Gomes', service: 'Hotel', freq: '3 DIAS', start: '20/03/2026', end: '23/03/2026', unitPrice: 150, days: 3, total: 450, discount: 20, finalPrice: 360, paymentMethod: '', fee: 0, amountReceived: 360, status: 'PAGO', paymentDate: '20/mar', notes: 'Saldo 120', saleType: 'HOTEL' },
  { dog: 'Mel', tutor: 'Alcides', service: 'Hotel', freq: '1 DIA', start: '21/03/2026', end: '22/03/2026', unitPrice: 150, days: 1, total: 150, discount: 10, finalPrice: 135, paymentMethod: 'PIX', fee: 0, amountReceived: 135, status: 'PAGO', paymentDate: '22/mar', notes: '', saleType: 'HOTEL' },
  { dog: 'Theodoro', tutor: 'Vitoria Koyama', service: 'Creche', freq: 'MENSAL 2X', start: '24/03/2026', end: '23/04/2026', unitPrice: 640, days: 1, total: 640, discount: 6, finalPrice: 600, paymentMethod: 'PIX', fee: 0, amountReceived: 600, status: 'PAGO', paymentDate: '', notes: '1 REPOSIÇÃO PENDENTE', saleType: 'MENSAL' },
  { dog: 'Luna', tutor: 'Tássia', service: 'Hotel', freq: '10 DIAS', start: '24/03/2026', end: '03/04/2026', unitPrice: 150, days: 10, total: 1500, discount: 13, finalPrice: 1300, paymentMethod: '', fee: 0, amountReceived: 1300, status: 'PAGO', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Pernoite', freq: '1 NOITE', start: '24/03/2026', end: '25/03/2026', unitPrice: 50, days: 1, total: 50, discount: 0, finalPrice: 50, paymentMethod: '', fee: 0, amountReceived: 50, status: 'PAGO', paymentDate: '01/abr', notes: '', saleType: 'HOTEL' },
  { dog: 'Romain', tutor: 'Gabriel Montanher', service: 'Creche', freq: 'MENSAL 2X', start: '25/03/2026', end: '24/04/2026', unitPrice: 640, days: 1, total: 640, discount: 22, finalPrice: 500, paymentMethod: '', fee: 0, amountReceived: 500, status: 'PAGO', paymentDate: '', notes: '', saleType: 'MENSAL' },
  { dog: 'Theo', tutor: 'Gabriel Montanher', service: 'Creche', freq: 'MENSAL 2X', start: '25/03/2026', end: '24/04/2026', unitPrice: 640, days: 1, total: 640, discount: 22, finalPrice: 500, paymentMethod: '', fee: 0, amountReceived: 500, status: 'PAGO', paymentDate: '', notes: '', saleType: 'MENSAL' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Hotel', freq: '1 DIA', start: '25/03/2026', end: '26/03/2026', unitPrice: 150, days: 1, total: 150, discount: 0, finalPrice: 150, paymentMethod: '', fee: 0, amountReceived: 150, status: 'PAGO', paymentDate: '01/abr', notes: '', saleType: 'HOTEL' },
  { dog: 'Betina', tutor: 'Eunira Keiko', service: 'Daycare', freq: '1 DIA', start: '28/03/2026', end: '28/03/2026', unitPrice: 115, days: 1, total: 115, discount: 0, finalPrice: 115, paymentMethod: '', fee: 0, amountReceived: 115, status: 'PAGO', paymentDate: '28/mar', notes: '', saleType: 'AVULSO' },
  { dog: 'Jack Sparrow', tutor: 'Maria Gabriela', service: 'Pacote -DC', freq: '5 DIAS', start: '28/03/2026', end: '28/09/2026', unitPrice: 1000, days: 1, total: 500, discount: 0, finalPrice: 500, paymentMethod: '', fee: 0, amountReceived: 500, status: 'PAGO', paymentDate: '28/mar', notes: '3/5', saleType: 'PACOTE' },
  { dog: 'Annie Bonny', tutor: 'Maria Gabriela', service: 'Pacote -DC', freq: '5 DIAS', start: '28/03/2026', end: '28/09/2026', unitPrice: 1000, days: 1, total: 500, discount: 0, finalPrice: 500, paymentMethod: '', fee: 0, amountReceived: 500, status: 'PAGO', paymentDate: '28/mar', notes: '3/5', saleType: 'PACOTE' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Hotel', freq: '1 DIAS', start: '28/03/2026', end: '30/03/2026', unitPrice: 150, days: 1, total: 150, discount: 0, finalPrice: 150, paymentMethod: '', fee: 0, amountReceived: 150, status: 'PAGO', paymentDate: '01/abr', notes: '', saleType: 'HOTEL' },
  { dog: 'Tobias', tutor: 'Silvana Cobo', service: 'Creche', freq: 'MENSAL 2X', start: '31/03/2026', end: '30/04/2026', unitPrice: 640, days: 1, total: 640, discount: 9, finalPrice: 580, paymentMethod: '', fee: 0, amountReceived: 580, status: 'PAGO', paymentDate: '', notes: '1 REPOSIÇÃO PENDENTE', saleType: 'MENSAL' },
  { dog: 'Sol', tutor: 'Carla', service: 'Hotel', freq: '2 DIAS', start: '02/04/2026', end: '05/04/2026', unitPrice: 200, days: 2.5, total: 500, discount: 20, finalPrice: 400, paymentMethod: '', fee: -3.48, amountReceived: 386.08, status: 'PAGO', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Baruc', tutor: 'Débora Dantas', service: 'Daycare', freq: '1 DIA', start: '02/04/2026', end: '02/04/2026', unitPrice: 115, days: 1, total: 115, discount: 0, finalPrice: 115, paymentMethod: '', fee: 0, amountReceived: 108.33, status: 'PAGO', paymentDate: '', notes: '', saleType: 'AVULSO' },
  { dog: 'Baruc', tutor: 'Débora Dantas', service: 'Hotel', freq: '1 DIA', start: '03/04/2026', end: '04/04/2026', unitPrice: 200, days: 1, total: 200, discount: 25, finalPrice: 150, paymentMethod: '', fee: 0, amountReceived: 141.30, status: 'PAGO', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Thifany', tutor: 'Roselaine da Mota', service: 'Hotel', freq: '1 DIA', start: '04/04/2026', end: '05/04/2026', unitPrice: 150, days: 1, total: 200, discount: 0, finalPrice: 200, paymentMethod: '', fee: 0, amountReceived: 200, status: 'PAGO', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Hotel', freq: '2 DIAS', start: '04/04/2026', end: '06/04/2026', unitPrice: 200, days: 2, total: 400, discount: 10, finalPrice: 360, paymentMethod: '', fee: 0, amountReceived: 0, status: 'PENDENTE', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Mel', tutor: 'Jeniffer Lemes', service: 'Hotel', freq: '1 DIA', start: '09/04/2026', end: '10/04/2026', unitPrice: 150, days: 1, total: 150, discount: 0, finalPrice: 150, paymentMethod: 'PIX', fee: 0, amountReceived: 150, status: 'PAGO', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Jack Sparrow', tutor: 'Maria Gabriela', service: 'Hotel', freq: '6 DIAS', start: '11/04/2026', end: '17/04/2026', unitPrice: 150, days: 6, total: 900, discount: 17, finalPrice: 750, paymentMethod: '', fee: 0, amountReceived: 750, status: 'PAGO', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Annie Bonny', tutor: 'Maria Gabriela', service: 'Hotel', freq: '6 DIAS', start: '11/04/2026', end: '17/04/2026', unitPrice: 150, days: 6, total: 900, discount: 17, finalPrice: 750, paymentMethod: '', fee: 0, amountReceived: 750, status: 'PAGO', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Hotel', freq: '2 DIAS', start: '11/04/2026', end: '13/04/2026', unitPrice: 150, days: 2, total: 300, discount: 0, finalPrice: 300, paymentMethod: '', fee: 0, amountReceived: 0, status: 'PENDENTE', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Luna', tutor: 'Tássia', service: 'Daycare', freq: '1 DIA', start: '14/04/2026', end: '14/04/2026', unitPrice: 115, days: 1, total: 115, discount: 0, finalPrice: 115, paymentMethod: 'PIX', fee: 0, amountReceived: 115, status: 'PAGO', paymentDate: '', notes: '', saleType: 'AVULSO' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Creche', freq: 'MENSAL 1X', start: '15/04/2026', end: '13/05/2026', unitPrice: 460, days: 1, total: 460, discount: 17, finalPrice: 380, paymentMethod: '', fee: 0, amountReceived: 0, status: 'PENDENTE', paymentDate: '', notes: '', saleType: 'MENSAL' },
  { dog: 'Thifany', tutor: 'Roselaine da Mota', service: 'Daycare', freq: '1 DIA', start: '15/04/2026', end: '15/04/2026', unitPrice: 115, days: 1, total: 115, discount: 0, finalPrice: 115, paymentMethod: '', fee: 0, amountReceived: 115, status: 'PAGO', paymentDate: '', notes: '', saleType: 'AVULSO' },
  { dog: 'Ramiro', tutor: 'Barbara Gomes', service: 'Hotel', freq: '5 DIAS', start: '17/04/2026', end: '22/04/2026', unitPrice: 150, days: 5, total: 750, discount: 16, finalPrice: 630, paymentMethod: 'PIX', fee: 0, amountReceived: 630, status: 'PAGO', paymentDate: '', notes: 'Uso de saldo 120', saleType: 'HOTEL' },
  { dog: 'Maya', tutor: 'Leonardo', service: 'Daycare', freq: '1 DIA', start: '18/04/2026', end: '18/04/2026', unitPrice: 115, days: 1, total: 115, discount: 0, finalPrice: 115, paymentMethod: 'PIX', fee: 0, amountReceived: 0, status: 'PENDENTE', paymentDate: '', notes: '', saleType: 'AVULSO' },
  { dog: 'Maya', tutor: 'Leonardo', service: 'Banho', freq: 'GG', start: '18/04/2026', end: '18/04/2026', unitPrice: 110, days: 1, total: 110, discount: 0, finalPrice: 110, paymentMethod: 'PIX', fee: 0, amountReceived: 0, status: 'PENDENTE', paymentDate: '', notes: '', saleType: 'PRODUTO' },
  { dog: 'Hera', tutor: 'Ionice Leite', service: 'Banho', freq: 'P', start: '18/04/2026', end: '18/04/2026', unitPrice: 40, days: 1, total: 40, discount: 0, finalPrice: 40, paymentMethod: '', fee: 0, amountReceived: 40, status: 'PAGO', paymentDate: '', notes: '', saleType: 'PRODUTO' },
  { dog: 'Suzy', tutor: 'Ionice Leite', service: 'Banho', freq: 'P', start: '18/04/2026', end: '18/04/2026', unitPrice: 40, days: 1, total: 40, discount: 0, finalPrice: 40, paymentMethod: '', fee: 0, amountReceived: 40, status: 'PAGO', paymentDate: '', notes: '', saleType: 'PRODUTO' },
  { dog: 'Belinha', tutor: 'Ionice Leite', service: 'Banho', freq: 'P', start: '18/04/2026', end: '18/04/2026', unitPrice: 40, days: 1, total: 40, discount: 0, finalPrice: 40, paymentMethod: '', fee: 0, amountReceived: 40, status: 'PAGO', paymentDate: '', notes: '', saleType: 'PRODUTO' },
  { dog: 'Bucky', tutor: 'Lucas de Carvalho Xavier', service: 'Creche', freq: 'MENSAL 2X', start: '20/04/2026', end: '20/05/2026', unitPrice: 640, days: 1, total: 640, discount: 10, finalPrice: 576, paymentMethod: 'PIX', fee: 0, amountReceived: 555.96, status: 'PAGO', paymentDate: '', notes: '', saleType: 'MENSAL' },
  { dog: 'Thifany', tutor: 'Roselaine da Mota', service: 'Hotel', freq: '1 DIA', start: '20/04/2026', end: '21/04/2026', unitPrice: 200, days: 1, total: 200, discount: 0, finalPrice: 200, paymentMethod: '', fee: 0, amountReceived: 200, status: 'PAGO', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Hotel', freq: '1 DIA', start: '21/04/2026', end: '22/04/2026', unitPrice: 200, days: 2, total: 400, discount: 10, finalPrice: 360, paymentMethod: '', fee: 0, amountReceived: 0, status: 'PENDENTE', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Leonardo', tutor: 'Thaís Gabrielly Pereira Mançano', service: 'Creche', freq: 'MENSAL 2X', start: '22/04/2026', end: '22/05/2026', unitPrice: 640, days: 1, total: 640, discount: 10, finalPrice: 576, paymentMethod: 'PIX', fee: 0, amountReceived: 576, status: 'PAGO', paymentDate: '', notes: '', saleType: 'MENSAL' },
  { dog: 'Bucky', tutor: 'Lucas de Carvalho Xavier', service: 'Hotel', freq: '5 DIAS', start: '24/04/2026', end: '29/04/2026', unitPrice: 150, days: 5, total: 750, discount: 10, finalPrice: 640, paymentMethod: '', fee: 0, amountReceived: 640, status: 'PAGO', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Sirius Black', tutor: 'Aline Porto', service: 'Hotel', freq: '3 DIAS', start: '24/04/2026', end: '27/04/2026', unitPrice: 150, days: 3, total: 450, discount: 10, finalPrice: 400, paymentMethod: '', fee: 0, amountReceived: 400, status: 'PAGO', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Ramiro', tutor: 'Barbara Gomes', service: 'Hotel', freq: '2 DIAS', start: '24/04/2026', end: '26/04/2026', unitPrice: 150, days: 2, total: 300, discount: 20, finalPrice: 240, paymentMethod: '', fee: 0, amountReceived: 240, status: 'PAGO', paymentDate: '', notes: 'Uso de saldo 120', saleType: 'HOTEL' },
  { dog: 'Romain', tutor: 'Gabriel Montanher', service: 'Creche', freq: 'MENSAL 2X', start: '25/04/2026', end: '24/05/2026', unitPrice: 640, days: 1, total: 640, discount: 22, finalPrice: 500, paymentMethod: '', fee: 0, amountReceived: 500, status: 'PAGO', paymentDate: '', notes: '', saleType: 'MENSAL' },
  { dog: 'Theo', tutor: 'Gabriel Montanher', service: 'Creche', freq: 'MENSAL 2X', start: '25/04/2026', end: '24/05/2026', unitPrice: 640, days: 1, total: 640, discount: 22, finalPrice: 500, paymentMethod: '', fee: 0, amountReceived: 500, status: 'PAGO', paymentDate: '', notes: '', saleType: 'MENSAL' },
  { dog: 'Sol', tutor: 'Carla', service: 'Daycare', freq: '1 DIA', start: '29/04/2026', end: '29/04/2026', unitPrice: 115, days: 1, total: 115, discount: 0, finalPrice: 115, paymentMethod: '', fee: 0, amountReceived: 115, status: 'PAGO', paymentDate: '', notes: '', saleType: 'AVULSO' },
  { dog: 'Sol', tutor: 'Carla', service: 'Banho', freq: 'P', start: '29/04/2026', end: '29/04/2026', unitPrice: 90, days: 1, total: 90, discount: 0, finalPrice: 90, paymentMethod: '', fee: 0, amountReceived: 90, status: 'PAGO', paymentDate: '', notes: '', saleType: 'PRODUTO' },
  { dog: 'Júpiter', tutor: 'Nadia', service: 'Hotel', freq: '4 DIAS', start: '30/04/2026', end: '04/05/2026', unitPrice: 160, days: 4, total: 640, discount: 0, finalPrice: 640, paymentMethod: '', fee: 0, amountReceived: 640, status: 'PAGO', paymentDate: '', notes: '', saleType: 'HOTEL' },
  { dog: 'Betina', tutor: 'Eunira Keiko', service: 'Creche', freq: 'MENSAL 1X', start: '11/05/2026', end: '10/06/2026', unitPrice: 460, days: 1, total: 460, discount: 0, finalPrice: 460, paymentMethod: '', fee: 0, amountReceived: 0, status: 'AGENDADO', paymentDate: '', notes: '', saleType: 'MENSAL' },
  { dog: 'Ramiro', tutor: 'Barbara Gomes', service: 'Hotel', freq: '2 DIAS', start: '24/04/2026', end: '26/04/2026', unitPrice: 150, days: 2, total: 300, discount: 20, finalPrice: 240, paymentMethod: 'PIX', fee: 0, amountReceived: 240, status: 'PAGO', paymentDate: '', notes: 'Uso de saldo 120', saleType: 'HOTEL' },
  { dog: 'Ramiro', tutor: 'Barbara Gomes', service: 'Hotel', freq: '2 DIAS', start: '24/04/2026', end: '26/04/2026', unitPrice: 150, days: 2, total: 300, discount: 20, finalPrice: 240, paymentMethod: 'PIX', fee: 0, amountReceived: 240, status: 'PAGO', paymentDate: '', notes: 'Uso de saldo 120' },
]

async function main() {
  // Get all dogs
  const dogs = await prisma.dog.findMany({
    select: { id: true, name: true, ownerName: true },
  })

  // Get all products
  const products = await prisma.product.findMany({
    select: { id: true, name: true, category: true, price: true },
  })

  // Helper functions
  const findDog = (name) => dogs.find(d => d.name.toLowerCase() === name.toLowerCase())
  const findProduct = (service, freq, unitPrice) => {
    // Try to find matching product
    if (service === 'Banho') {
      const porteMap = { 'P': 'Pequeno', 'G': 'Grande', 'GG': 'Extra Grande' }
      const porte = porteMap[freq] || freq
      return products.find(p => p.name.includes('Banho') && p.name.includes(porte))
    }
    if (service === 'Creche' || service === 'Daycare') {
      if (freq.includes('MENSAL')) {
        const freqNum = freq.match(/\d+/)?.[0]
        const isHalfDay = freq.includes('MEIO') || false
        const periodLabel = isHalfDay ? 'Meio Período' : 'Período Integral'
        return products.find(p => p.name.includes(`${freqNum}x/semana`) && p.name.includes(periodLabel))
      }
      return products.find(p => p.name.includes('Diária') && p.name.includes('Creche'))
    }
    if (service === 'Hotel') {
      if (unitPrice === 200) return products.find(p => p.name.includes('Hotel') && p.price === 200)
      return products.find(p => p.name.includes('Hotel') && p.price === 150)
    }
    if (service === 'Pernoite') {
      return products.find(p => p.name.includes('Pernoite'))
    }
    if (service === 'Pacote -DC') {
      if (unitPrice === 1000) return products.find(p => p.name.includes('10 Dias'))
      return products.find(p => p.name.includes('5 Dias'))
    }
    return null
  }

  const parseDate = (dateStr) => {
    const parts = dateStr.split('/')
    return new Date(parts[2], parts[1] - 1, parts[0])
  }

  let imported = 0
  let skipped = 0
  let errors = []

  for (const sale of historicalSales) {
    try {
      const dog = findDog(sale.dog)
      if (!dog) {
        errors.push(`Cão não encontrado: ${sale.dog}`)
        skipped++
        continue
      }

      const product = findProduct(sale.service, sale.freq, sale.unitPrice)
      if (!product) {
        errors.push(`Produto não encontrado: ${sale.service} ${sale.freq} R$${sale.unitPrice}`)
        skipped++
        continue
      }

      const saleDate = parseDate(sale.start)
      const startDate = parseDate(sale.start)
      const endDate = parseDate(sale.end)
      const discountAmount = (sale.discount / 100) * sale.total

      await prisma.sales.create({
        data: {
          dogId: dog.id,
          saleType: sale.saleType || 'HOTEL',
          saleDate,
          startDate,
          endDate,
          basePrice: sale.total,
          finalPrice: sale.finalPrice,
          discount: discountAmount,
          paymentMethod: sale.paymentMethod || null,
          paymentFee: sale.fee,
          amountReceived: sale.amountReceived,
          paymentStatus: sale.status === 'ANDAMENTO' ? 'PENDENTE' : sale.status,
          paymentDate: sale.paymentDate || null,
          notes: sale.notes || null,
          items: {
            create: [{
              productId: product.id,
              quantity: sale.days,
              unitPrice: sale.unitPrice,
              totalPrice: sale.total,
            }],
          },
        },
      })

      imported++
      console.log(`✅ Importado: ${sale.dog} - ${sale.service} - R$ ${sale.finalPrice}`)
    } catch (error) {
      errors.push(`Erro ao importar ${sale.dog} - ${sale.service}: ${error.message}`)
      skipped++
    }
  }

  console.log('')
  console.log('=== RESUMO DA IMPORTAÇÃO ===')
  console.log(`✅ Importados: ${imported}`)
  console.log(`⏭️  Pulados: ${skipped}`)
  console.log(`❌ Erros: ${errors.length}`)
  
  if (errors.length > 0) {
    console.log('')
    console.log('=== ERROS ===')
    errors.forEach(err => console.log(`❌ ${err}`))
  }

  console.log('')
  console.log('✅ Importação concluída!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
