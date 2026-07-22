'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { DollarSign, Plus, Trash2, ShoppingCart, Search, History, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Main page component with Suspense wrapper
export default function VendasPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="text-4xl animate-bounce">🐕</div></div>}>
      <VendasContent />
    </Suspense>
  )
}

interface Product {
  id: string
  name: string
  description: string | null
  category: string
  price: number
}

interface Dog {
  id: string
  name: string
  ownerName: string
  matricula: string | null
  isActive: boolean
}

interface CartItem {
  productId: string | null
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

function VendasContent() {
  const searchParams = useSearchParams()
  const urlDogId = searchParams.get('dogId')

  const [products, setProducts] = useState<Product[]>([])
  const [dogs, setDogs] = useState<Dog[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedDog, setSelectedDog] = useState<string>(urlDogId || '')
  const [discount, setDiscount] = useState<string>('0')
  const [notes, setNotes] = useState<string>('')
  const [saleStartDate, setSaleStartDate] = useState<string>('')
  const [saleEndDate, setSaleEndDate] = useState<string>('')
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  // Payment fields
  const [amountReceived, setAmountReceived] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState<string>('PAGO')
  const [paymentDate, setPaymentDate] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [paymentFee, setPaymentFee] = useState<string>('0')
  const [isExempt, setIsExempt] = useState<boolean>(false)

  const [lastPrices, setLastPrices] = useState<Record<string, { unitPrice: number; saleDate: string; discount?: number; finalPrice?: number; basePrice?: number; startDate?: string | null; endDate?: string | null; saleType?: string }>>({})

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch {
      toast.error('Erro ao carregar produtos')
    }
  }

  const loadDogs = async () => {
    try {
      const res = await fetch('/api/dogs')
      if (res.ok) {
        const data = await res.json()
        setDogs(data)
      }
    } catch {
      toast.error('Erro ao carregar cães')
    }
  }

  useEffect(() => {
    loadProducts()
    loadDogs()
    setLoading(false)
  }, [])

  const fetchLastPrice = async (dogId: string, productId: string) => {
    if (!dogId || !productId) return
    try {
      const res = await fetch(`/api/sales/last-price?dogId=${dogId}&productId=${productId}`)
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setLastPrices(prev => ({ ...prev, [productId]: data }))
          // SUGGESTION only — user must click "Usar" button to apply
          // Removed auto-apply of price and discount to respect user's choice
          // Auto-fill next period for MENSAL (CRECHE) — advance by one month (dates are helpful)
          if ((data.saleType === 'MENSAL' || data.saleType === 'CRECHE') && data.endDate) {
            const lastEnd = new Date(data.endDate)
            lastEnd.setHours(12, 0, 0, 0)
            const nextStart = new Date(lastEnd)
            nextStart.setDate(nextStart.getDate() + 1)
            const nextEnd = new Date(nextStart)
            nextEnd.setMonth(nextEnd.getMonth() + 1)
            nextEnd.setDate(nextEnd.getDate() - 1)
            setSaleStartDate(nextStart.toISOString().split('T')[0])
            setSaleEndDate(nextEnd.toISOString().split('T')[0])
          }
        }
      }
    } catch {}
  }

  const applyLastPrice = (productId: string, unitPrice: number) => {
    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, unitPrice, totalPrice: item.quantity * unitPrice }
        : item
    ))
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id)
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
          : item
      ))
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
      }])
      if (selectedDog) fetchLastPrice(selectedDog, product.id)
    }
  }

  const removeFromCart = (productId: string | null) => {
    setCart(cart.filter(item => item.productId !== productId))
  }

  const updateCartQuantity = (productId: string | null, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice }
        : item
    ))
  }

  // Detect if any cart item needs service dates (HOTEL, CRECHE, PACOTE)
  const cartCategories = cart.map(item => {
    const prod = products.find(p => p.id === item.productId)
    return prod?.category || ''
  })
  const cartHasHotel = cartCategories.includes('HOTEL')
  const cartHasCreche = cartCategories.includes('CRECHE')
  const needsServiceDates = cartCategories.some(c => ['HOTEL', 'CRECHE', 'PACOTE'].includes(c))

  const cartTotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)
  const discountAmount = parseFloat(discount) || 0
  const finalTotal = cartTotal - discountAmount

  const checkoutSale = async () => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio')
      return
    }

    const discountValue = parseFloat(discount) || 0
    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0)
    const finalPrice = total - discountValue
    const receivedAmount = isExempt ? 0 : (parseFloat(amountReceived) || finalPrice)

    console.log('=== Checkout Sale ===')
    console.log('Cart:', cart)
    console.log('Selected Dog:', selectedDog)
    console.log('Final Price:', finalPrice)
    console.log('Discount:', discountValue)
    console.log('Is Exempt:', isExempt)
    console.log('Amount Received:', receivedAmount)
    console.log('Payment Status:', paymentStatus)
    console.log('Payment Date:', paymentDate)
    console.log('Payment Method:', paymentMethod)
    console.log('Payment Fee:', paymentFee)
    console.log('Notes:', notes)

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleDate: new Date().toISOString(),
          finalPrice,
          discount: discountValue,
          isExempt,
          amountReceived: receivedAmount,
          paymentStatus: isExempt ? 'PAGO' : paymentStatus,
          paymentDate: paymentDate || null,
          paymentMethod: paymentMethod || null,
          paymentFee: parseFloat(paymentFee) || 0,
          notes: notes || null,
          dogId: selectedDog || null,
          saleStartDate: saleStartDate || null,
          saleEndDate: saleEndDate || null,
          items: cart.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      })

      console.log('Resposta status:', res.status)

      if (res.ok) {
        toast.success('Venda registrada com sucesso!')
        setCart([])
        setDiscount('0')
        setNotes('')
        setSelectedDog('')
        setAmountReceived('')
        setPaymentStatus('PAGO')
        setPaymentDate('')
        setPaymentMethod('')
        setPaymentFee('0')
        setIsExempt(false)
        setSaleStartDate('')
        setSaleEndDate('')
        setMobileCartOpen(false)
      } else {
        const errorData = await res.json()
        console.error('Erro na resposta:', errorData)
        toast.error(`Erro ao registrar venda: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao registrar venda:', error)
      toast.error('Erro ao registrar venda')
    }
  }

  const productCategories = Array.from(new Set(products.map(p => p.category))).sort()
  const filteredProducts = products.filter(p =>
    (!productCategoryFilter || p.category === productCategoryFilter) &&
    (p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearchTerm.toLowerCase()))
  )

  const getCategoryDotColor = (category: string) => {
    switch (category) {
      case 'HOTEL': return 'bg-blue-100 text-blue-700'
      case 'AVULSO': return 'bg-orange-100 text-orange-700'
      case 'PACOTE': return 'bg-purple-100 text-purple-700'
      case 'SERVICO': return 'bg-green-100 text-green-700'
      case 'PRODUTO': return 'bg-amber-100 text-amber-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Shared cart panel — rendered inline in the desktop sidebar and inside the mobile bottom sheet
  const cartPanelContent = (
    <>
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <ShoppingCart className="w-5 h-5" /> Carrinho
        <span className="text-sm font-normal text-gray-500">({cart.length} itens)</span>
      </h2>

      {/* Dog Selection */}
      <div className="mb-4">
        <label className="label">Cão (opcional)</label>
        <select
          className="select"
          value={selectedDog}
          onChange={(e) => {
            setSelectedDog(e.target.value)
            setLastPrices({})
            if (e.target.value) {
              cart.forEach(item => { if (item.productId) fetchLastPrice(e.target.value, item.productId) })
            }
          }}
        >
          <option value="">Selecione um cão (opcional)</option>
          {dogs.map(dog => (
            <option key={dog.id} value={dog.id}>
              {dog.name}{dog.ownerName ? ` — ${dog.ownerName}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Cart Items */}
      <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
        {cart.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Carrinho vazio</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.productId} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                <p className="text-xs text-gray-500">
                  R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} un.
                </p>
                {item.productId && lastPrices[item.productId] && (() => {
                  const lp = lastPrices[item.productId!]
                  const alreadyApplied = lp.unitPrice === item.unitPrice
                  // Fix timezone issue by parsing YYYY-MM-DD directly
                  const lpDateRaw = lp.saleDate
                  const lpDate = (() => {
                    try {
                      if (!lpDateRaw) return ''
                      if (lpDateRaw.includes('-') && !lpDateRaw.includes('T')) {
                        const [y, m] = lpDateRaw.split('-')
                        return `${m}/${y.slice(2)}`
                      }
                      const d = parseISO(lpDateRaw)
                      if (isNaN(d.getTime())) return ''
                      return format(d, 'MM/yy', { locale: ptBR })
                    } catch {
                      return ''
                    }
                  })()
                  const lastDiscount = lp.discount ?? 0
                  const discountAlreadyApplied = lastDiscount > 0 && parseFloat(discount) === lastDiscount
                  return (
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <div className="flex items-center gap-1">
                        <span className={`text-xs ${alreadyApplied ? 'text-green-600' : 'text-amber-600'}`}>
                          {alreadyApplied ? '✓ ' : ''}Último preço: R$ {(lp.finalPrice ?? lp.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-gray-400">({lpDate})</span>
                        </span>
                        {!alreadyApplied && (
                          <button
                            onClick={() => applyLastPrice(item.productId!, lp.unitPrice)}
                            className="text-xs text-amber-700 font-semibold underline hover:text-amber-900"
                          >Usar</button>
                        )}
                      </div>
                      {lastDiscount > 0 && (
                        <div className="flex items-center gap-1">
                          <span className={`text-xs ${discountAlreadyApplied ? 'text-green-600' : 'text-purple-600'}`}>
                            {discountAlreadyApplied ? '✓ ' : ''}Último desconto: R$ {lastDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {!discountAlreadyApplied && (
                            <button
                              onClick={() => setDiscount(String(lastDiscount))}
                              className="text-xs text-purple-700 font-semibold underline hover:text-purple-900"
                            >Usar</button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                  className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                  className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => removeFromCart(item.productId)}
                className="p-1.5 rounded hover:bg-red-100 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      {cart.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm items-center gap-2">
            <span className="text-gray-600">Desconto:</span>
            <input
              type="number"
              step="0.01"
              className="input w-24 text-right"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span className="text-gray-800">Total:</span>
            <span className="text-green-600">
              R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Service Dates — shown for HOTEL, CRECHE, PACOTE */}
          {needsServiceDates && (
            <div className="space-y-2 pt-3 border-t border-blue-200 bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                {cartHasHotel ? '🏨 Período da Estadia' : cartHasCreche ? '📅 Período da Mensalidade' : '📦 Vigência do Serviço'}
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="label text-xs">Início *</label>
                  <input
                    type="date"
                    className="input text-sm"
                    value={saleStartDate}
                    onChange={(e) => {
                      setSaleStartDate(e.target.value)
                      if (cartHasCreche && e.target.value && !saleEndDate) {
                        const d = new Date(e.target.value)
                        d.setMonth(d.getMonth() + 1)
                        setSaleEndDate(d.toISOString().split('T')[0])
                      }
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label className="label text-xs">Fim {cartHasHotel ? '*' : ''}</label>
                  <input
                    type="date"
                    className="input text-sm"
                    value={saleEndDate}
                    onChange={(e) => setSaleEndDate(e.target.value)}
                    min={saleStartDate}
                  />
                </div>
              </div>
              {cartHasHotel && !saleStartDate && (
                <p className="text-xs text-amber-600">⚠ Informe as datas da estadia para criar o agendamento automaticamente.</p>
              )}
              {cartHasHotel && saleStartDate && saleEndDate && (
                <p className="text-xs text-green-700">✓ Agendamento será criado automaticamente para este período.</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <textarea
              className="input"
              placeholder="Notas da venda..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Payment Fields */}
          <div className="space-y-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isExempt"
                checked={isExempt}
                onChange={(e) => setIsExempt(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="isExempt" className="text-sm font-semibold text-purple-700">
                Isenção de Pagamento
              </label>
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-gray-600">Valor em Conta:</span>
              <input
                type="number"
                step="0.01"
                className="input w-24 text-right"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder="0.00"
                disabled={isExempt}
              />
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-gray-600">Status:</span>
              <select
                className="input w-32"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                <option value="PAGO">PAGO</option>
                <option value="PENDENTE">PENDENTE</option>
                <option value="PROGRAMADA">PROGRAMADA</option>
              </select>
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-gray-600">Método:</span>
              <input
                type="text"
                className="input w-40"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="PIX, Crédito, etc."
              />
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-gray-600">Data Pagamento:</span>
              <input
                type="date"
                className="input w-36"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-gray-600">Taxa (%):</span>
              <input
                type="number"
                step="0.01"
                className="input w-20 text-right"
                value={paymentFee}
                onChange={(e) => setPaymentFee(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            onClick={checkoutSale}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            <DollarSign className="w-5 h-5" /> Faturar
          </button>
        </div>
      )}
    </>
  )

  return (
    <div className="p-3 md:p-6 pb-24 lg:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign className="w-7 h-7 md:w-8 md:h-8" /> PDV - Ponto de Venda
        </h1>
        <Link
          href="/vendas/historico"
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <History className="w-4 h-4 text-purple-600" /> Histórico
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Catalog */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search */}
          <div className="card">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  className="input pl-10"
                  placeholder="Buscar produtos..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                />
              </div>
            </div>
            {productCategories.length > 1 && (
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setProductCategoryFilter('')}
                  className={`text-xs px-3 py-1 rounded-full font-medium border ${!productCategoryFilter ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  Todos
                </button>
                {productCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setProductCategoryFilter(cat)}
                    className={`text-xs px-3 py-1 rounded-full font-medium border ${productCategoryFilter === cat ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Products — dense list so many more items are scannable without scrolling */}
          <div className="card p-0 overflow-hidden">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Carregando produtos...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nenhum produto encontrado</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredProducts.map(product => {
                  const inCart = cart.find(i => i.productId === product.id)
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 transition-colors"
                    >
                      <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-semibold ${getCategoryDotColor(product.category)}`}>
                        {product.category}
                      </span>
                      <button
                        onClick={() => addToCart(product)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-gray-400 truncate">{product.description}</p>
                        )}
                      </button>
                      <span className="shrink-0 text-sm font-semibold text-gray-700">
                        R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {inCart ? (
                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            onClick={() => updateCartQuantity(product.id, inCart.quantity - 1)}
                            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{inCart.quantity}</span>
                          <button
                            onClick={() => updateCartQuantity(product.id, inCart.quantity + 1)}
                            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="shrink-0 w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center"
                          title="Adicionar ao carrinho"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart — desktop sidebar, always visible */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="card sticky top-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
            {cartPanelContent}
          </div>
        </div>
      </div>

      {/* Mobile floating cart bar — tap to open full checkout without scrolling past the catalog/history */}
      {cart.length > 0 && !mobileCartOpen && (
        <button
          onClick={() => setMobileCartOpen(true)}
          className="lg:hidden fixed bottom-4 left-3 right-3 z-40 bg-purple-600 text-white rounded-xl shadow-lg px-4 py-3 flex items-center justify-between"
        >
          <span className="flex items-center gap-2 font-semibold text-sm">
            <ShoppingCart className="w-5 h-5" />
            {cart.length} {cart.length === 1 ? 'item' : 'itens'}
          </span>
          <span className="font-bold">R$ {finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </button>
      )}

      {/* Mobile cart bottom sheet */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileCartOpen(false)} />
          <div className="relative w-full bg-white rounded-t-2xl max-h-[92vh] overflow-y-auto p-4 pb-6 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto" />
            </div>
            <button
              onClick={() => setMobileCartOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
            {cartPanelContent}
          </div>
        </div>
      )}

    </div>
  )
}
