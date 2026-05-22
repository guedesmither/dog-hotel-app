'use client'

import { useState, useEffect } from 'react'
import { X, Printer, FileText, ChevronDown, ChevronUp } from 'lucide-react'

interface SaleItem {
  id: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product: { name: string; category: string } | null
}

interface Sale {
  id: string
  saleDate: string
  saleType: string
  finalPrice: number
  paymentStatus: string
  startDate: string | null
  endDate: string | null
  notes: string | null
  dog: { id: string; name: string; ownerName: string } | null
  items: SaleItem[]
}

interface Props {
  sales: Sale[]
  onClose: () => void
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR')
}

function fmtCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export default function CobrancaModal({ sales, onClose }: Props) {
  const [companyName, setCompanyName] = useState('Hotel Canino')
  const [companyInfo, setCompanyInfo] = useState('')
  const [selectedOwner, setSelectedOwner] = useState('')
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set())
  const [observations, setObservations] = useState('')
  const [showCompany, setShowCompany] = useState(false)

  const owners = Array.from(
    new Set(sales.filter(s => s.dog?.ownerName).map(s => s.dog!.ownerName))
  ).sort()

  const ownerSales = selectedOwner
    ? sales.filter(s => s.dog?.ownerName === selectedOwner)
    : []

  useEffect(() => {
    const pendente = new Set(
      ownerSales.filter(s => s.paymentStatus === 'PENDENTE').map(s => s.id)
    )
    setSelectedSaleIds(pendente)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOwner])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cobranca_company')
      if (saved) {
        const data = JSON.parse(saved)
        if (data.name) setCompanyName(data.name)
        if (data.info) setCompanyInfo(data.info)
      }
    } catch {}
  }, [])

  function saveCompanyInfo() {
    localStorage.setItem('cobranca_company', JSON.stringify({ name: companyName, info: companyInfo }))
  }

  function toggleSale(id: string) {
    const next = new Set(selectedSaleIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedSaleIds(next)
  }

  function selectAll() {
    setSelectedSaleIds(new Set(ownerSales.map(s => s.id)))
  }

  function deselectAll() {
    setSelectedSaleIds(new Set())
  }

  const selectedSales = ownerSales.filter(s => selectedSaleIds.has(s.id))
  const total = selectedSales.reduce((sum, s) => sum + s.finalPrice, 0)

  function getServiceName(sale: Sale): string {
    if (sale.items.length > 0) {
      return sale.items
        .map(i => `${i.product?.name || 'Serviço'}${i.quantity > 1 ? ` x${i.quantity}` : ''}`)
        .join(', ')
    }
    return sale.saleType
  }

  function getPeriod(sale: Sale): string {
    if (sale.startDate && sale.endDate) {
      return `${fmtDate(sale.startDate)} a ${fmtDate(sale.endDate)}`
    }
    return fmtDate(sale.saleDate)
  }

  function handlePrint() {
    saveCompanyInfo()

    if (selectedSales.length === 0) return

    const today = new Date().toLocaleDateString('pt-BR')
    const dogNames = Array.from(new Set(selectedSales.map(s => s.dog?.name).filter(Boolean))).join(', ')

    const rows = selectedSales.map(sale => `
      <tr>
        <td>${getServiceName(sale)}</td>
        <td>${getPeriod(sale)}</td>
        <td class="right">R$ ${fmtCurrency(sale.finalPrice)}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Cobrança – ${selectedOwner}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 48px; max-width: 680px; margin: 0 auto; }
    .header { text-align: center; padding-bottom: 18px; margin-bottom: 22px; border-bottom: 2px solid #222; }
    .header h1 { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
    .header p { font-size: 11px; color: #555; margin-top: 5px; line-height: 1.5; }
    .badge { display: inline-block; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; padding: 3px 10px; font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 20px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .meta span { font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 22px; }
    thead th { background: #f5f5f5; padding: 9px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #ddd; }
    td { padding: 9px 12px; border: 1px solid #ddd; font-size: 13px; vertical-align: top; }
    .right { text-align: right; }
    .total-row td { font-weight: 700; font-size: 14px; background: #f9f9f9; border-top: 2px solid #333; }
    .obs { margin-top: 24px; }
    .obs-title { font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; color: #555; }
    .obs-box { border: 1px solid #ccc; padding: 12px; min-height: 60px; font-size: 13px; white-space: pre-wrap; line-height: 1.6; }
    .signature { margin-top: 50px; display: flex; justify-content: flex-end; }
    .sig-block { text-align: center; }
    .sig-line { border-top: 1px solid #333; width: 260px; margin-bottom: 6px; }
    .sig-label { font-size: 12px; color: #555; }
    .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 11px; color: #888; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${companyName}</h1>
    ${companyInfo ? `<p>${companyInfo.replace(/\n/g, '<br>')}</p>` : ''}
  </div>

  <div style="text-align:center"><span class="badge">Recibo de Cobrança</span></div>

  <div class="meta"><span><strong>Tutor:</strong> ${selectedOwner}</span><span><strong>Emissão:</strong> ${today}</span></div>
  ${dogNames ? `<div class="meta"><span><strong>Cão(ões):</strong> ${dogNames}</span></div>` : ''}

  <table>
    <thead>
      <tr>
        <th style="width:45%">Serviço</th>
        <th style="width:35%">Período</th>
        <th style="width:20%;text-align:right">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="2" class="right">TOTAL</td>
        <td class="right">R$ ${fmtCurrency(total)}</td>
      </tr>
    </tbody>
  </table>

  ${observations ? `
  <div class="obs">
    <div class="obs-title">Observações</div>
    <div class="obs-box">${observations}</div>
  </div>` : ''}

  <div class="signature">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">${companyName}</div>
    </div>
  </div>

  <div class="footer">
    <span>Este documento não tem valor fiscal.</span>
    <span>Emitido em ${today}</span>
  </div>
</body>
</html>`

    const win = window.open('', '_blank', 'width=820,height=700')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.onload = () => { win.focus(); win.print() }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-2xl my-auto shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" /> Gerar Cobrança / Recibo
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Company info — collapsible */}
          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowCompany(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700"
            >
              <span>🏢 Dados da Empresa (aparecem no recibo)</span>
              {showCompany ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showCompany && (
              <div className="p-4 space-y-3">
                <input
                  type="text"
                  className="input"
                  placeholder="Nome da empresa"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                />
                <textarea
                  className="input text-sm"
                  placeholder="Endereço, telefone, CNPJ, PIX... (cada linha aparece abaixo do nome)"
                  value={companyInfo}
                  onChange={e => setCompanyInfo(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-gray-400">Salvo automaticamente ao gerar o PDF.</p>
              </div>
            )}
          </div>

          {/* Owner selector */}
          <div>
            <label className="label">Tutor</label>
            <select className="input" value={selectedOwner} onChange={e => setSelectedOwner(e.target.value)}>
              <option value="">— Selecione o tutor —</option>
              {owners.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Sales selector */}
          {selectedOwner && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Serviços a incluir</label>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-xs text-purple-600 hover:underline">Selecionar todos</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={deselectAll} className="text-xs text-gray-500 hover:underline">Limpar</button>
                </div>
              </div>

              {ownerSales.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Nenhuma venda encontrada para este tutor.</p>
              ) : (
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {ownerSales.map(sale => (
                    <label key={sale.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSaleIds.has(sale.id)}
                        onChange={() => toggleSale(sale.id)}
                        className="w-4 h-4 accent-purple-600 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{getServiceName(sale)}</p>
                        <p className="text-xs text-gray-500">{getPeriod(sale)}{sale.dog?.name ? ` — ${sale.dog.name}` : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-800">R$ {fmtCurrency(sale.finalPrice)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          sale.paymentStatus === 'PENDENTE' ? 'bg-amber-100 text-amber-700' :
                          sale.paymentStatus === 'PAGO' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {sale.paymentStatus}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {selectedSales.length > 0 && (
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                  <span className="text-sm text-gray-500">{selectedSales.length} serviço(s) selecionado(s)</span>
                  <span className="text-base font-bold text-purple-700">Total: R$ {fmtCurrency(total)}</span>
                </div>
              )}
            </div>
          )}

          {/* Observations */}
          {selectedOwner && (
            <div>
              <label className="label">Observações <span className="text-gray-400 font-normal">(opcional — aparece no recibo)</span></label>
              <textarea
                className="input"
                placeholder="Ex: Pagamento via PIX até 30/05. Chave: 00.000.000/0001-00"
                value={observations}
                onChange={e => setObservations(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={handlePrint}
            disabled={!selectedOwner || selectedSales.length === 0}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </button>
        </div>
      </div>
    </div>
  )
}
