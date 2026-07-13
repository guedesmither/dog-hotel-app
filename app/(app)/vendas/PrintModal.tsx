'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, Printer, FileText, Receipt } from 'lucide-react'

const EMPRESA = {
  razaoSocial: 'AUE PETCARE E LAZER LTDA - ME',
  nomeFantasia: 'AUE PETCARE & LAZER',
  cnpj: '64.093.803/0001-10',
  endereco: 'Av. Santo Antônio, 1568 - Vila Osasco, Osasco - SP',
  cnae: '9609-2/08 – Alojamento de animais domésticos',
}

interface SaleItem {
  id: string; quantity: number; unitPrice: number; totalPrice: number
  product: { id: string; name: string; category: string } | null
}
interface Sale {
  id: string; saleDate: string; saleType: string
  basePrice: number; finalPrice: number; discount?: number | null
  amountReceived: number | null; paymentStatus: string
  paymentMethod: string | null; paymentDate: string | null
  serviceDate: string | null
  startDate: string | null; endDate: string | null; notes: string | null
  manualBaixa?: boolean
  serviceStatus?: string
  dog: { id: string; name: string; ownerName: string; ownerCpf: string | null; matricula: string | null; photoUrl: string | null } | null
  items: SaleItem[]
}

type DocType = 'demonstrativo' | 'recibo'

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}
function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function shortId(id: string) {
  return id.slice(-6).toUpperCase()
}

function getServiceLabel(s: Sale): { label: string; cssClass: string } {
  const status = s.serviceStatus
  // REALIZADO: service done
  if (status === 'OK' || s.manualBaixa) return { label: 'REALIZADO', cssClass: 'realizado' }
  // PROGRAMADO: payment not yet due (check BEFORE serviceStatus ANDAMENTO)
  if (s.paymentStatus === 'PROGRAMADA' || s.paymentStatus === 'AGENDADO') return { label: 'PROGRAMADO', cssClass: 'agendado' }
  // EM ANDAMENTO: actively in progress
  if (status === 'ANDAMENTO') return { label: 'EM ANDAMENTO', cssClass: 'andamento' }
  // X/Y pattern = package days used → EM ANDAMENTO only if saleType is PACOTE
  if (status && /^\d+\/\d+$/.test(status) && s.saleType === 'PACOTE') return { label: 'EM ANDAMENTO', cssClass: 'andamento' }
  return { label: 'AGENDADO', cssClass: 'agendado' }
}

function buildHTML(sales: Sale[], docType: DocType, origin: string): string {
  const now = new Date()
  const today = `${String(now.getDate()).padStart(2, '0')} de ${now.toLocaleString('pt-BR', { month: 'long' })} de ${now.getFullYear()}`
  const docNum = Date.now().toString().slice(-6)

  // Group by owner
  const byOwner = new Map<string, Sale[]>()
  for (const s of sales) {
    const key = s.dog?.ownerName || 'Cliente'
    if (!byOwner.has(key)) byOwner.set(key, [])
    byOwner.get(key)!.push(s)
  }

  const pages = Array.from(byOwner.entries()).map(([owner, ownerSales]) => {
    const ownerCpf = ownerSales.find(s => s.dog?.ownerCpf)?.dog?.ownerCpf || null
    const totalGross     = ownerSales.reduce((t, s) => t + (s.items.length > 0 ? s.items.reduce((a, i) => a + i.totalPrice, 0) : s.basePrice), 0)
    const totalDiscount  = ownerSales.reduce((t, s) => t + (s.discount ?? 0), 0)
    const totalNet       = totalGross - totalDiscount
    const totalReceived  = ownerSales.filter(s => s.paymentStatus === 'PAGO').reduce((t, s) => t + (s.amountReceived ?? s.finalPrice), 0)
    const totalPending   = ownerSales.filter(s => s.paymentStatus === 'PENDENTE').reduce((t, s) => t + s.finalPrice, 0)
    const totalProgrammed = ownerSales.filter(s => s.paymentStatus === 'PROGRAMADA' || s.paymentStatus === 'AGENDADO').reduce((t, s) => t + s.finalPrice, 0)
    const dogs = Array.from(new Set(ownerSales.map(s => s.dog ? `${s.dog.name}${s.dog.matricula ? ` (${s.dog.matricula})` : ''}` : null).filter((x): x is string => !!x))).join(', ')
    const payMethods = Array.from(new Set(ownerSales.map(s => s.paymentMethod).filter((x): x is string => !!x))).join(', ')
    const allNotes = ownerSales.map(s => s.notes).filter(Boolean).join(' | ')

    const serviceRows = ownerSales.flatMap(s => {
      const cats = s.items.map(i => i.product?.category || '')
      const isBanho = cats.includes('SERVICO') || cats.includes('BANHO')
      const isAvulso = cats.includes('AVULSO') || s.saleType === 'AVULSO'
      const isCreche = cats.includes('CRECHE') && !s.startDate // CRECHE sem período = 1 diária
      const isHotel = cats.includes('HOTEL') || s.saleType === 'HOTEL'
      const isPacote = cats.includes('PACOTE') || s.saleType === 'PACOTE'
      const isMensal = s.saleType === 'MENSAL'

      // Use serviceDate for single-day services, startDate/endDate for period-based services
      let periodo = '—'
      if (isBanho || isAvulso || isCreche) {
        // Single-day service - use serviceDate if available
        periodo = s.serviceDate ? fmtDate(s.serviceDate) : (s.startDate ? fmtDate(s.startDate) : '—')
      } else if (isHotel || isPacote || isMensal) {
        // Period-based service - use startDate/endDate
        periodo = s.startDate ? `${fmtDate(s.startDate)}${s.endDate ? ' a ' + fmtDate(s.endDate) : ''}` : '—'
      }

      const discount = s.discount || 0
      const itemsGross = s.items.reduce((a, i) => a + i.totalPrice, 0)
      if (s.items.length > 0) {
        return s.items.map(i => {
          const itemDiscount = itemsGross > 0 ? discount * (i.totalPrice / itemsGross) : 0
          return `
          <tr>
            <td>${fmtDate(s.saleDate)}</td>
            <td>${s.dog?.name || '—'}</td>
            <td>${i.product?.name || s.saleType}</td>
            <td>${periodo}</td>
            <td style="text-align:center">${i.quantity}</td>
            <td style="text-align:right">${fmtCurrency(i.unitPrice)}</td>
            <td style="text-align:right">${fmtCurrency(i.totalPrice)}</td>
            <td style="text-align:right">${itemDiscount > 0 ? fmtCurrency(itemDiscount) : '—'}</td>
            <td style="text-align:right">${fmtCurrency(i.totalPrice - itemDiscount)}</td>
            <td style="text-align:center"><span class="badge ${getServiceLabel(s).cssClass}">${getServiceLabel(s).label}</span></td>
          </tr>`
        })
      }
      return [`<tr>
        <td>${fmtDate(s.saleDate)}</td>
        <td>${s.dog?.name || '—'}</td>
        <td>${s.saleType}</td>
        <td>${periodo}</td>
        <td style="text-align:center">1</td>
        <td style="text-align:right">${fmtCurrency(s.basePrice)}</td>
        <td style="text-align:right">${fmtCurrency(s.basePrice)}</td>
        <td style="text-align:right">${discount > 0 ? fmtCurrency(discount) : '—'}</td>
        <td style="text-align:right">${fmtCurrency(s.finalPrice)}</td>
        <td style="text-align:center"><span class="badge ${getServiceLabel(s).cssClass}">${getServiceLabel(s).label}</span></td>
      </tr>`]
    }).join('')

    const header = `
      <div class="header">
        <img src="${origin}/logo.png" alt="Logo" class="logo-img"/>
        <div class="company">
          <div class="company-name">${EMPRESA.nomeFantasia}</div>
          <div class="company-sub">${EMPRESA.razaoSocial}</div>
          <div class="company-sub">CNPJ: ${EMPRESA.cnpj}</div>
          <div class="company-sub">${EMPRESA.endereco}</div>
        </div>
      </div>`

    const table = `
      <table class="items-table">
        <thead><tr>
          <th>Data</th><th>Animal</th><th>Serviço</th><th>Período</th>
          <th style="text-align:center">Qtd</th><th style="text-align:right">Unit.</th>
          <th style="text-align:right">Bruto</th><th style="text-align:right">Desc.</th>
          <th style="text-align:right">Total</th><th style="text-align:center">Status</th>
        </tr></thead>
        <tbody>${serviceRows}</tbody>
      </table>`

    const totalsBlockDemonstrativo = `
      <div class="totals">
        ${totalDiscount > 0 ? `<div class="total-row"><span>Subtotal</span><span>${fmtCurrency(totalGross)}</span></div>` : ''}
        ${totalDiscount > 0 ? `<div class="total-row red"><span>Desconto</span><span>− ${fmtCurrency(totalDiscount)}</span></div>` : ''}
        <div class="total-row grand"><span>TOTAL</span><span>${fmtCurrency(totalNet)}</span></div>
        ${totalReceived > 0 ? `<div class="total-row green"><span>✓ Recebido</span><span>${fmtCurrency(totalReceived)}</span></div>` : ''}
      </div>`

    const totalsBlockRecibo = `
      <div class="totals">
        <div class="total-row"><span>Subtotal</span><span>${fmtCurrency(totalGross)}</span></div>
        ${totalDiscount > 0 ? `<div class="total-row red"><span>Desconto</span><span>− ${fmtCurrency(totalDiscount)}</span></div>` : ''}
        <div class="total-row grand"><span>TOTAL</span><span>${fmtCurrency(totalNet)}</span></div>
      </div>`

    const footer = `
      <div class="footer">
        <p>Osasco, ${today}</p>
        <div class="sig-wrap">
          <div class="sig-block"><div class="sig-line"></div><p>${EMPRESA.nomeFantasia}</p><p style="font-size:10px">${EMPRESA.cnpj}</p></div>
          <div class="sig-block"><div class="sig-line"></div><p>Assinatura do Tutor</p></div>
        </div>
      </div>`

    if (docType === 'demonstrativo') {
      return `<div class="doc-page">
        ${header}
        <div class="doc-title-bar">
          <span class="doc-title">DEMONSTRATIVO DE SERVIÇOS PRESTADOS</span>
          <span class="doc-num">Nº ${docNum} &nbsp;·&nbsp; Emissão: ${today}</span>
        </div>
        <div class="client-block">
          <div><span class="label">Tutor</span> ${owner}</div>
          ${ownerCpf ? `<div><span class="label">CPF</span> ${ownerCpf}</div>` : ''}
          <div><span class="label">Animal(is)</span> ${dogs}</div>
          ${payMethods ? `<div><span class="label">Forma de pagamento</span> ${payMethods}</div>` : ''}
        </div>
        <div class="section-title">SERVIÇOS PRESTADOS</div>
        ${table}
        ${totalsBlockDemonstrativo}
        ${allNotes ? `<div class="notes"><strong>Observações:</strong> ${allNotes}</div>` : ''}
        ${footer}
      </div>`
    } else {
      // RECIBO
      const introText = totalReceived > 0
        ? `Recebi de <strong>${owner}</strong> a quantia de <strong class="valor">${fmtCurrency(totalReceived)}</strong> referente aos serviços prestados conforme detalhado abaixo.`
        : `Declaramos que <strong>${owner}</strong> possui saldo a regularizar no valor de <strong class="valor">${fmtCurrency(totalNet)}</strong> conforme serviços abaixo.`
      return `<div class="doc-page">
        ${header}
        <div class="doc-title-bar">
          <span class="doc-title">RECIBO DE SERVIÇOS</span>
          <span class="doc-num">Nº ${docNum} &nbsp;·&nbsp; Emissão: ${today}</span>
        </div>
        <div class="client-block">
          <div><span class="label">Tutor</span> ${owner}</div>
          ${ownerCpf ? `<div><span class="label">CPF</span> ${ownerCpf}</div>` : ''}
          <div><span class="label">Animal(is)</span> ${dogs}</div>
          ${payMethods ? `<div><span class="label">Forma de pagamento</span> ${payMethods}</div>` : ''}
        </div>
        <p class="recibo-intro">${introText}</p>
        <div class="section-title">DETALHAMENTO DOS SERVIÇOS</div>
        ${table}
        ${totalsBlockRecibo}
        ${allNotes ? `<div class="notes"><strong>Observações:</strong> ${allNotes}</div>` : ''}
        ${footer}
        <div class="counterpart">
          <div class="cut-line">✂ ─────────────────────────────────────────────────────────────────────</div>
          <p class="counterpart-title">VIA DO TUTOR – ${owner}</p>
          <p style="font-size:12px;margin:8px 0">Ref: ${docType === 'recibo' ? 'Recibo' : 'Demonstrativo'} Nº ${docNum} &nbsp;·&nbsp; ${EMPRESA.nomeFantasia} &nbsp;·&nbsp; CNPJ ${EMPRESA.cnpj}</p>
          <p style="font-size:12px;margin:4px 0">Animal(is): ${dogs} &nbsp;·&nbsp; Total: ${fmtCurrency(totalNet)} &nbsp;·&nbsp; Recebido: ${fmtCurrency(totalReceived)}</p>
          <div class="footer" style="margin-top:24px">
            <p>Osasco, ${today}</p>
            <div class="sig-wrap"><div class="sig-block"><div class="sig-line"></div><p>Assinatura do Tutor</p></div></div>
          </div>
        </div>
      </div>`
    }
  }).join('<div class="page-break"></div>')

  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;font-size:13px;color:#111;background:#fff}
    .doc-page{padding:28px 36px;max-width:780px;margin:0 auto}
    .header{display:flex;align-items:center;gap:16px;margin-bottom:14px}
    .logo-img{height:64px;width:auto;object-fit:contain;flex-shrink:0}
    .company{flex:1}
    .company-name{font-size:17px;font-weight:700;color:#1a1a1a;line-height:1.2}
    .company-sub{font-size:10.5px;color:#555;margin-top:2px}
    .doc-title-bar{display:flex;justify-content:space-between;align-items:baseline;background:#1a1a1a;color:#fff;padding:7px 12px;border-radius:4px;margin-bottom:12px}
    .doc-title{font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase}
    .doc-num{font-size:10px;opacity:.8}
    .client-block{background:#f7f7f7;border-radius:4px;padding:10px 14px;margin-bottom:14px;display:flex;flex-wrap:wrap;gap:12px;font-size:12.5px}
    .client-block div{min-width:180px}
    .label{font-size:10px;font-weight:700;text-transform:uppercase;color:#888;display:block;margin-bottom:1px}
    .section-title{font-size:10px;font-weight:700;letter-spacing:1px;color:#888;text-transform:uppercase;margin-bottom:6px;border-bottom:1px solid #ddd;padding-bottom:3px}
    .items-table{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:12px}
    .items-table th{background:#f0f0f0;padding:5px 7px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;border-bottom:2px solid #ddd}
    .items-table td{padding:5px 7px;border-bottom:1px solid #eee;vertical-align:top}
    .items-table tr:last-child td{border-bottom:none}
    .badge{display:inline-block;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase}
    .badge.realizado{background:#dcfce7;color:#166534}
    .badge.andamento{background:#fef3c7;color:#92400e}
    .badge.agendado{background:#e0e7ff;color:#3730a3}
    .totals{border-top:2px solid #111;padding-top:8px;margin-bottom:16px;max-width:340px;margin-left:auto}
    .total-row{display:flex;justify-content:space-between;padding:2.5px 0;font-size:12.5px}
    .total-row.grand{font-size:15px;font-weight:700;border-top:1px solid #ccc;padding-top:5px;margin-top:3px}
    .total-row.red{color:#c00}
    .total-row.green{color:#166534}
    .total-row.blue{color:#3730a3}
    .total-row.orange{color:#92400e}
    .recibo-intro{font-size:13.5px;line-height:1.75;margin:12px 0 16px;padding:12px;background:#f9f9f9;border-left:3px solid #333;border-radius:0 4px 4px 0}
    .valor{font-size:15px;color:#166534}
    .notes{margin-top:8px;padding:8px 12px;background:#fffbeb;border-left:3px solid #f59e0b;font-size:11.5px;color:#444;border-radius:0 4px 4px 0}
    .footer{margin-top:36px;font-size:11.5px;color:#555;text-align:center}
    .sig-wrap{display:flex;justify-content:center;gap:60px;margin-top:28px}
    .sig-block{text-align:center}
    .sig-line{width:200px;border-top:1px solid #555;margin-bottom:5px}
    .counterpart{margin-top:20px}
    .cut-line{font-size:10px;color:#bbb;letter-spacing:1px;margin:14px 0}
    .counterpart-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;text-align:center;margin-bottom:6px}
    .page-break{page-break-after:always;height:0}
    @media print{.page-break{page-break-after:always}}
  `

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
  <base href="${origin}/"/>
  <title>${docType === 'recibo' ? 'Recibo' : 'Demonstrativo'} – ${EMPRESA.nomeFantasia}</title>
  <style>${css}</style></head><body>${pages}</body></html>`
}

function SaleRow({ sale, selected, toggle }: { sale: Sale; selected: Set<string>; toggle: (id: string) => void }) {
  const svcLabel = getServiceLabel(sale)
  const statusCfg =
    svcLabel.cssClass === 'realizado' ? { label: 'REALIZADO',    cls: 'bg-green-100 text-green-700' } :
    svcLabel.cssClass === 'andamento' ? { label: 'EM ANDAMENTO', cls: 'bg-amber-100 text-amber-700' } :
                                        { label: 'AGENDADO',     cls: 'bg-indigo-100 text-indigo-700' }
  return (
    <label className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 ${selected.has(sale.id) ? 'bg-amber-50' : ''}`}>
      <input type="checkbox" checked={selected.has(sale.id)} onChange={() => toggle(sale.id)} className="mt-0.5 rounded" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-800 leading-tight">{sale.dog?.name || '—'} <span className="text-gray-400 font-normal text-xs">· {sale.dog?.ownerName}</span></p>
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${statusCfg.cls}`}>{statusCfg.label}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{fmtDate(sale.saleDate)} · {sale.items.map(i => i.product?.name || sale.saleType).join(', ')} · <span className="font-semibold">{(sale.amountReceived ?? sale.finalPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
      </div>
    </label>
  )
}

export default function PrintModal({ sales, initialSaleId, onClose }: {
  sales: Sale[]
  initialSaleId?: string
  onClose: () => void
}) {
  const [docType, setDocType] = useState<DocType>('demonstrativo')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSaleId ? [initialSaleId] : []))
  const [scheduledSales, setScheduledSales] = useState<Sale[]>([])
  const [loadingScheduled, setLoadingScheduled] = useState(true)

  useEffect(() => {
    fetch('/api/sales?status=AGENDADO')
      .then(r => r.json())
      .then((data: Sale[]) => {
        const currentIds = new Set(sales.map(s => s.id))
        setScheduledSales(data.filter(s => !currentIds.has(s.id)))
      })
      .catch(() => {})
      .finally(() => setLoadingScheduled(false))
  }, [])

  const allAvailable = useMemo(() => [...sales, ...scheduledSales], [sales, scheduledSales])

  const filtered = useMemo(() => {
    const pool = allAvailable
    if (!search.trim()) return pool
    const q = search.toLowerCase()
    return pool.filter(s =>
      s.dog?.name.toLowerCase().includes(q) ||
      s.dog?.ownerName.toLowerCase().includes(q)
    )
  }, [allAvailable, search])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function print() {
    const chosen = sales.filter(s => selected.has(s.id))
    if (!chosen.length) return
    const html = buildHTML(chosen, docType, window.location.origin)
    const w = window.open('', '_blank', 'width=850,height=700')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 400)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Printer className="w-5 h-5" /> Imprimir Documento
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Doc type */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tipo de documento</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDocType('demonstrativo')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${docType === 'demonstrativo' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                <FileText className="w-4 h-4" /> Demonstrativo
              </button>
              <button onClick={() => setDocType('recibo')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${docType === 'recibo' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                <Receipt className="w-4 h-4" /> Recibo
              </button>
            </div>
          </div>

          {/* Search */}
          <input className="input text-sm" placeholder="Filtrar por cão ou tutor..." value={search} onChange={e => setSearch(e.target.value)} />

          {/* Sale list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Selecione os serviços</p>
              <button onClick={() => setSelected(new Set(filtered.map(s => s.id)))} className="text-xs text-amber-600 hover:underline">Selecionar todos</button>
            </div>
            <div className="space-y-1 max-h-72 overflow-y-auto border rounded-lg p-1">
              {filtered.length === 0 && <p className="text-center py-4 text-gray-400 text-sm">Nenhuma venda encontrada</p>}
              {(() => {
                const currentIds = new Set(sales.map(s => s.id))
                const filteredCurrent = filtered.filter(s => currentIds.has(s.id))
                const filteredScheduled = filtered.filter(s => !currentIds.has(s.id))
                return (
                  <>
                    {filteredCurrent.map(sale => <SaleRow key={sale.id} sale={sale} selected={selected} toggle={toggle} />)}
                    {filteredScheduled.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 px-2 py-1.5 mt-1">
                          <div className="flex-1 h-px bg-indigo-200" />
                          <span className="text-xs font-semibold text-indigo-500 uppercase">Serviços Agendados</span>
                          <div className="flex-1 h-px bg-indigo-200" />
                        </div>
                        {filteredScheduled.map(sale => <SaleRow key={sale.id} sale={sale} selected={selected} toggle={toggle} />)}
                      </>
                    )}
                    {loadingScheduled && (
                      <p className="text-center py-2 text-xs text-gray-400">Carregando agendamentos...</p>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">{selected.size} selecionado{selected.size !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={print} disabled={selected.size === 0}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
