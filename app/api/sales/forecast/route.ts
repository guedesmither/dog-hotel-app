import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MONTH_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function monthKey(y: number, m0: number) {
  return `${y}-${String(m0 + 1).padStart(2, '0')}`
}
function shiftMonth(y: number, m0: number, delta: number) {
  const total = y * 12 + m0 + delta
  return { y: Math.floor(total / 12), m0: ((total % 12) + 12) % 12 }
}
function labelOf(k: string) {
  const [y, m] = k.split('-')
  return `${MONTH_PT[Number(m) - 1]}/${y.slice(2)}`
}
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const round2 = (v: number) => Math.round(v * 100) / 100

type Cat = 'HOTEL' | 'PACOTE' | 'SERVICOS'
type CatAll = Cat | 'CRECHE'
// MENSAL não entra nas categorias de crescimento — a creche é projetada cão a cão, evitando dupla contagem
const catOf = (saleType: string): Cat | null =>
  saleType === 'HOTEL' ? 'HOTEL' : saleType === 'PACOTE' ? 'PACOTE' : saleType === 'MENSAL' ? null : 'SERVICOS'
// Usado apenas para apurar o realizado (inclui MENSAL como CRECHE)
const catAllOf = (saleType: string): CatAll =>
  saleType === 'HOTEL' ? 'HOTEL' : saleType === 'PACOTE' ? 'PACOTE' : saleType === 'MENSAL' ? 'CRECHE' : 'SERVICOS'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const role = (session.user as { role?: string }).role
  if (role === 'TUTOR') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const now = new Date()
  // Mês alvo: ?month=YYYY-MM (padrão: mês corrente). Permite projetar meses futuros.
  const monthParam = new URL(req.url).searchParams.get('month')
  let year = now.getFullYear()
  let m0 = now.getMonth()
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    year = parseInt(monthParam.slice(0, 4))
    m0 = parseInt(monthParam.slice(5, 7)) - 1
  }
  const curKey = monthKey(year, m0)
  const daysInMonth = new Date(year, m0 + 1, 0).getDate()
  const nowIdx = now.getFullYear() * 12 + now.getMonth()
  const targetIdx = year * 12 + m0
  const isCurrentMonth = targetIdx === nowIdx
  // Linha "realizado": mês atual vai até hoje; passado mostra tudo; futuro mostra o que já está registrado (ex.: vendas programadas)
  const actualLimitDay = isCurrentMonth ? now.getDate() : daysInMonth

  // prev[0] = mês passado, prev[1] = m-2, prev[2] = m-3
  const prev = [1, 2, 3].map(d => shiftMonth(year, m0, -d))
  const startWindow = new Date(prev[2].y, prev[2].m0, 1)
  const endWindow = new Date(year, m0 + 1, 0, 23, 59, 59, 999)

  const [dogs, windowSales] = await Promise.all([
    // Sem filtro de isActive: baixas do mês alvo não afetam a base (estado no fim do mês anterior)
    prisma.dog.findMany({
      where: { isBolsista: false, dogStatus: 'CRECHE' },
      select: {
        id: true, name: true, ownerName: true, isActive: true,
        sales: {
          where: { saleType: 'MENSAL', paymentStatus: { not: 'CANCELADO' }, isExempt: false },
          select: { saleDate: true, finalPrice: true, paymentStatus: true },
          orderBy: { saleDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.sales.findMany({
      where: {
        saleDate: { gte: startWindow, lte: endWindow },
        paymentStatus: { not: 'CANCELADO' },
        isExempt: false,
      },
      select: { saleDate: true, saleType: true, finalPrice: true, dogId: true, paymentStatus: true },
    }),
  ])

  // ── Creche (MENSAL): base = estado das mensalidades no fim do mês anterior ao alvo ──
  // Mensalidades agregadas/perdidas no mês alvo NÃO entram na projeção
  const cutoff = new Date(prev[0].y, prev[0].m0 + 1, 0, 23, 59, 59, 999)
  // Mensalista vigente na base deve ter venda MENSAL nos últimos ~40 dias (ciclo mensal + tolerância)
  const staleThreshold = new Date(cutoff.getTime() - 40 * 24 * 3600 * 1000)
  const crecheDaily = new Array(daysInMonth + 1).fill(0)
  const crecheDogs: any[] = []
  const staleDogs: any[] = []
  let crecheTotal = 0

  for (const dog of dogs) {
    const mensalSales = dog.sales.filter(s => new Date(s.saleDate) <= cutoff)
    if (mensalSales.length === 0) continue
    const last = mensalSales[mensalSales.length - 1]
    const lastDate = new Date(last.saleDate)
    if (lastDate < staleThreshold) {
      // Aviso só para cães ainda ativos — inativos antigos não são acionáveis
      if (dog.isActive) {
        staleDogs.push({ id: dog.id, name: dog.name, ownerName: dog.ownerName, lastSaleDate: lastDate.toISOString().slice(0, 10), amount: last.finalPrice })
      }
      continue
    }
    // Dia típico de cobrança: dia do mês mais frequente nas vendas MENSAL (desempate: mais recente)
    const dayCount = new Map<number, { count: number; lastIdx: number }>()
    mensalSales.forEach((s, idx) => {
      const d = new Date(s.saleDate).getDate()
      const cur = dayCount.get(d) || { count: 0, lastIdx: -1 }
      dayCount.set(d, { count: cur.count + 1, lastIdx: idx })
    })
    let billingDay = lastDate.getDate()
    let best = { count: -1, lastIdx: -1 }
    for (const [d, v] of Array.from(dayCount)) {
      if (v.count > best.count || (v.count === best.count && v.lastIdx > best.lastIdx)) {
        best = v
        billingDay = d
      }
    }
    const day = Math.min(billingDay, daysInMonth)
    crecheDaily[day] += last.finalPrice
    crecheTotal += last.finalPrice
    crecheDogs.push({
      id: dog.id, name: dog.name, ownerName: dog.ownerName,
      amount: last.finalPrice, billingDay: day,
      lastSaleDate: lastDate.toISOString().slice(0, 10),
      paymentStatus: last.paymentStatus,
    })
  }
  crecheDogs.sort((a, b) => b.amount - a.amount)

  // ── Agregação das vendas da janela (m-3 … mês atual) ──
  const monthTotals: Record<Cat, number[]> = { HOTEL: [0, 0, 0], PACOTE: [0, 0, 0], SERVICOS: [0, 0, 0] } // idx 0=m-1, 1=m-2, 2=m-3
  const lastMonthDaily: Record<Cat, number[]> = { HOTEL: new Array(32).fill(0), PACOTE: new Array(32).fill(0), SERVICOS: new Array(32).fill(0) }
  const actualDailyCur = new Array(daysInMonth + 1).fill(0)  // realizado (PAGO + PENDENTE)
  const scheduledDailyCur = new Array(daysInMonth + 1).fill(0) // programado (AGENDADO + PROGRAMADA)
  const actualByCat: Record<CatAll, number> = { CRECHE: 0, HOTEL: 0, PACOTE: 0, SERVICOS: 0 }
  const scheduledByCat: Record<CatAll, number> = { CRECHE: 0, HOTEL: 0, PACOTE: 0, SERVICOS: 0 }
  const SCHEDULED = new Set(['AGENDADO', 'PROGRAMADA'])
  const prevDaily: number[][] = prev.map(p => new Array(new Date(p.y, p.m0 + 1, 0).getDate() + 1).fill(0))

  for (const s of windowSales) {
    const d = new Date(s.saleDate)
    const key = monthKey(d.getFullYear(), d.getMonth())
    const day = d.getDate()
    if (key === curKey) {
      if (SCHEDULED.has(s.paymentStatus || '')) {
        scheduledDailyCur[day] += s.finalPrice
        scheduledByCat[catAllOf(s.saleType)] += s.finalPrice
      } else {
        actualDailyCur[day] += s.finalPrice
        actualByCat[catAllOf(s.saleType)] += s.finalPrice
      }
      continue
    }
    const pIdx = prev.findIndex(p => monthKey(p.y, p.m0) === key)
    if (pIdx < 0) continue
    prevDaily[pIdx][day] += s.finalPrice
    const cat = catOf(s.saleType)
    if (!cat) continue
    monthTotals[cat][pIdx] += s.finalPrice
    if (pIdx === 0) lastMonthDaily[cat][day] += s.finalPrice
  }

  // ── Creche projetada no realizado+programado: mensalistas sem venda no mês entram como programado ──
  const dogsWithMensalThisMonth = new Set<string>()
  for (const s of windowSales) {
    if (s.saleType === 'MENSAL' && monthKey(new Date(s.saleDate).getFullYear(), new Date(s.saleDate).getMonth()) === curKey) {
      if (s.dogId) dogsWithMensalThisMonth.add(s.dogId)
    }
  }
  // Creche projetada NÃO entra no realizado+programado — é forecast, não venda real
  const projectedDailyCur = new Array(daysInMonth + 1).fill(0)
  let crecheProjectedScheduled = 0
  for (const cd of crecheDogs) {
    if (dogsWithMensalThisMonth.has(cd.id)) continue
    projectedDailyCur[cd.billingDay] += cd.amount
    crecheProjectedScheduled += cd.amount
  }

  // ── Hotel / Pacotes / Serviços: último mês × (1 + crescimento médio dos últimos 3 meses) ──
  function forecastCat(cat: Cat) {
    const [m1, m2, m3] = monthTotals[cat]
    const growths: number[] = []
    if (m2 > 0) growths.push((m1 - m2) / m2)
    if (m3 > 0) growths.push((m2 - m3) / m3)
    const avgGrowth = growths.length ? growths.reduce((a, b) => a + b, 0) / growths.length : 0
    // Crescimento nulo para Pacotes e Serviços; Hotel mantém a média dos últimos 3 meses
    const g = cat === 'HOTEL' ? clamp(avgGrowth, -0.5, 1) : 0
    const forecast = Math.max(0, m1 * (1 + g))
    // Distribuição diária segue o padrão do mês passado; se vazio, distribui uniformemente
    const daily = new Array(daysInMonth + 1).fill(0)
    const patternTotal = lastMonthDaily[cat].reduce((a, b) => a + b, 0)
    for (let d = 1; d <= daysInMonth; d++) {
      daily[d] = patternTotal > 0 ? forecast * (lastMonthDaily[cat][d] || 0) / patternTotal : forecast / daysInMonth
    }
    return { lastMonth: round2(m1), avgGrowthPct: round2(g * 100), forecast: round2(forecast), daily }
  }

  const hotel = forecastCat('HOTEL')
  const pacote = forecastCat('PACOTE')
  const servicos = forecastCat('SERVICOS')

  // ── Série acumulada diária (forecast vs atual vs meses anteriores) ──
  const prevCums = prevDaily.map(arr => {
    let c = 0
    return arr.map(v => (c += v))
  })
  const chart: any[] = []
  let cumF = 0
  let cumA = 0
  let cumRP = 0
  for (let d = 1; d <= daysInMonth; d++) {
    cumF += crecheDaily[d] + hotel.daily[d] + pacote.daily[d] + servicos.daily[d]
    cumA += actualDailyCur[d]
    cumRP += actualDailyCur[d] + scheduledDailyCur[d]
    chart.push({
      day: d,
      forecast: round2(cumF),
      atual: d <= actualLimitDay ? round2(cumA) : null,
      realizadoProg: round2(cumRP),
      prev1: d < prevCums[0].length ? round2(prevCums[0][d]) : null,
      prev2: d < prevCums[1].length ? round2(prevCums[1][d]) : null,
      prev3: d < prevCums[2].length ? round2(prevCums[2][d]) : null,
    })
  }

  const prevMonths = prev.map((p, i) => ({
    key: monthKey(p.y, p.m0),
    label: labelOf(monthKey(p.y, p.m0)),
    total: round2(prevDaily[i].reduce((a, b) => a + b, 0)),
  }))

  // Cães ativos de creche fora da base — candidatos a inclusão manual no cenário Consensus
  const projectedIds = new Set(crecheDogs.map(d => d.id))
  const otherDogs = dogs
    .filter(d => d.isActive && !projectedIds.has(d.id))
    .map(d => ({ id: d.id, name: d.name, ownerName: d.ownerName }))

  return NextResponse.json({
    month: curKey,
    monthLabel: labelOf(curKey),
    baseMonthLabel: labelOf(monthKey(prev[0].y, prev[0].m0)),
    daysInMonth,
    todayDay: isCurrentMonth ? now.getDate() : null,
    totals: {
      creche: round2(crecheTotal),
      hotel: hotel.forecast,
      pacote: pacote.forecast,
      servicos: servicos.forecast,
      total: round2(crecheTotal + hotel.forecast + pacote.forecast + servicos.forecast),
    },
    atualTotal: actualLimitDay > 0 ? round2(actualDailyCur.reduce((a, b) => a + b, 0)) : 0,
    programadoTotal: round2(scheduledDailyCur.reduce((a, b) => a + b, 0)),
    realizadoProgTotal: round2(actualDailyCur.reduce((a, b) => a + b, 0) + scheduledDailyCur.reduce((a, b) => a + b, 0)),
    crecheProjected: round2(crecheProjectedScheduled),
    categories: {
      creche: { forecast: round2(crecheTotal), atual: round2(actualByCat.CRECHE), programado: round2(scheduledByCat.CRECHE), delta: round2(actualByCat.CRECHE - crecheTotal) },
      hotel: { lastMonth: hotel.lastMonth, avgGrowthPct: hotel.avgGrowthPct, forecast: hotel.forecast, daily: hotel.daily, atual: round2(actualByCat.HOTEL), programado: round2(scheduledByCat.HOTEL), delta: round2(actualByCat.HOTEL - hotel.forecast) },
      pacote: { lastMonth: pacote.lastMonth, avgGrowthPct: pacote.avgGrowthPct, forecast: pacote.forecast, daily: pacote.daily, atual: round2(actualByCat.PACOTE), programado: round2(scheduledByCat.PACOTE), delta: round2(actualByCat.PACOTE - pacote.forecast) },
      servicos: { lastMonth: servicos.lastMonth, avgGrowthPct: servicos.avgGrowthPct, forecast: servicos.forecast, daily: servicos.daily, atual: round2(actualByCat.SERVICOS), programado: round2(scheduledByCat.SERVICOS), delta: round2(actualByCat.SERVICOS - servicos.forecast) },
    },
    prevMonths,
    chart,
    crecheDogs,
    staleDogs,
    otherDogs,
  })
}
