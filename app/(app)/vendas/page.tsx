'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { DollarSign, Plus, Trash2, ShoppingCart, Package, Calendar, Search, FileText, Printer } from 'lucide-react'
import CobrancaModal from './CobrancaModal'
import PrintModal from './PrintModal'

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

interface SaleItem {
  id: string
  quantity: number
  unitPrice: number
  totalPrice: number
  product: Product | null
}

interface Sale {
  id: string
  saleDate: string
  saleType: string
  basePrice: number
  discount: number | null
  finalPrice: number
  amountReceived: number | null
  paymentStatus: string
  paymentDate: string | null
  paymentMethod: string | null
  paymentFee: number
  notes: string | null
  manualBaixa: boolean
  manualBaixaDate: string | null
  serviceDate: string | null
  isExempt: boolean
  startDate: string | null
  endDate: string | null
  dog: {
    id: string
    name: string
    ownerName: string
    ownerCpf: string | null
    matricula: string | null
    photoUrl: string | null
  } | null
  items: {
    id: string
    quantity: number
    unitPrice: number
    totalPrice: number
    product: Product | null
  }[]
  packages?: {
    id: string
    totalDays: number
    remainingDays: number
    packageType: string
  }[]
  serviceStatus?: string
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
  const [sales, setSales] = useState<Sale[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedDog, setSelectedDog] = useState<string>('')
  const [discount, setDiscount] = useState<string>('0')
  const [notes, setNotes] = useState<string>('')
  const [saleStartDate, setSaleStartDate] = useState<string>('')
  const [saleEndDate, setSaleEndDate] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7))
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [selectedDogId, setSelectedDogId] = useState<string>(urlDogId || '')
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const salesSectionRef = useRef<HTMLDivElement>(null)
  
  // Payment fields
  const [amountReceived, setAmountReceived] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState<string>('PAGO')
  const [paymentDate, setPaymentDate] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [paymentFee, setPaymentFee] = useState<string>('0')
  const [isExempt, setIsExempt] = useState<boolean>(false)
  
  // Edit sale modal
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [editAmountReceived, setEditAmountReceived] = useState<string>('')
  const [editPaymentStatus, setEditPaymentStatus] = useState<string>('PAGO')
  const [editPaymentDate, setEditPaymentDate] = useState<string>('')
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('')
  const [editSaleDate, setEditSaleDate] = useState<string>('')
  const [editServiceDate, setEditServiceDate] = useState<string>('')
  const [editStartDate, setEditStartDate] = useState<string>('')
  const [editEndDate, setEditEndDate] = useState<string>('')
  const [editDiscount, setEditDiscount] = useState<string>('')
  const [editNotes, setEditNotes] = useState<string>('')
  const [editBasePrice, setEditBasePrice] = useState<string>('')
  const [editFinalPrice, setEditFinalPrice] = useState<string>('')
  const [showCobrancaModal, setShowCobrancaModal] = useState(false)
  const [printSaleId, setPrintSaleId] = useState<string | undefined>(undefined)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [lastPrices, setLastPrices] = useState<Record<string, { unitPrice: number; saleDate: string }>>({})

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

  const loadSales = async () => {
    try {
      const params = new URLSearchParams()
      const currentYearMonth = new Date().toISOString().slice(0, 7)
      const hasTextSearch = !!(selectedDogId || searchTerm)
      if (!hasTextSearch) {
        if (startDate && endDate) {
          // date range takes priority over month
        } else if (selectedMonth) {
          params.append('yearMonth', selectedMonth)
        } else {
          params.append('yearMonth', currentYearMonth)
        }
      }
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (statusFilter) {
        if (statusFilter.startsWith('service:')) {
          params.append('serviceStatus', statusFilter.replace('service:', ''))
        } else if (statusFilter.startsWith('type:')) {
          params.append('saleType', statusFilter.replace('type:', ''))
        } else {
          params.append('status', statusFilter)
        }
      }
      if (selectedDogId) params.append('dogId', selectedDogId)
      else if (searchTerm) params.append('search', searchTerm)
      
      const url = params.toString() ? `/api/sales?${params.toString()}` : '/api/sales'
      console.log('Carregando vendas de:', url)
      const res = await fetch(url)
      console.log('Status da resposta:', res.status)
      if (res.ok) {
        const data = await res.json()
        console.log('Vendas carregadas:', data.length)
        setSales(data)
      } else {
        const error = await res.text()
        console.error('Erro ao carregar vendas:', res.status, error)
        toast.error(`Erro ao carregar vendas: ${res.status}`)
      }
    } catch (error) {
      console.error('Erro ao carregar vendas:', error)
      toast.error('Erro ao carregar vendas')
    }
  }

  useEffect(() => {
    console.log('useEffect executado, selectedMonth:', selectedMonth, 'startDate:', startDate, 'endDate:', endDate, 'statusFilter:', statusFilter, 'searchTerm:', searchTerm)
    loadProducts()
    loadDogs()
    loadSales()
    setLoading(false)
  }, [selectedMonth, startDate, endDate, statusFilter, searchTerm, selectedDogId])

  // Sync URL dogId with filter
  useEffect(() => {
    if (urlDogId && urlDogId !== selectedDogId) {
      setSelectedDogId(urlDogId)
    }
  }, [urlDogId])

  const fetchLastPrice = async (dogId: string, productId: string) => {
    if (!dogId || !productId) return
    try {
      const res = await fetch(`/api/sales/last-price?dogId=${dogId}&productId=${productId}`)
      if (res.ok) {
        const data = await res.json()
        if (data) setLastPrices(prev => ({ ...prev, [productId]: data }))
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
        loadSales()
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

  async function deleteSale(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return

    try {
      const res = await fetch(`/api/sales/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Venda excluída com sucesso!')
        loadSales()
      } else {
        toast.error('Erro ao excluir venda')
      }
    } catch {
      toast.error('Erro ao excluir venda')
    }
  }

  async function completeSale(id: string) {
    if (!confirm('Tem certeza que deseja dar baixa manual neste serviço?')) return

    try {
      console.log('Tentando baixar venda:', id)
      const res = await fetch(`/api/sales/${id}/complete`, { method: 'POST' })
      console.log('Resposta status:', res.status)
      
      if (res.ok) {
        toast.success('Serviço baixado manualmente com sucesso!')
        loadSales()
      } else {
        const errorData = await res.json()
        console.error('Erro na resposta:', errorData)
        toast.error(`Erro ao dar baixa: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao dar baixa no serviço:', error)
      toast.error('Erro ao dar baixa no serviço')
    }
  }

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale)
    setEditAmountReceived((sale.amountReceived ?? '').toString())
    setEditPaymentStatus(sale.paymentStatus)
    setEditPaymentDate(sale.paymentDate ? new Date(sale.paymentDate).toISOString().split('T')[0] : '')
    setEditPaymentMethod(sale.paymentMethod || '')
    setEditSaleDate(sale.saleDate ? new Date(sale.saleDate).toISOString().split('T')[0] : '')
    setEditServiceDate(sale.serviceDate ? new Date(sale.serviceDate).toISOString().split('T')[0] : '')
    setEditStartDate(sale.startDate ? new Date(sale.startDate).toISOString().split('T')[0] : '')
    setEditEndDate(sale.endDate ? new Date(sale.endDate).toISOString().split('T')[0] : '')
    setEditDiscount((sale.discount ?? 0).toString())
    setEditNotes(sale.notes || '')
    setEditBasePrice(sale.basePrice.toString())
    setEditFinalPrice(sale.finalPrice.toString())
  }

  const updateSalePayment = async () => {
    if (!editingSale) return

    try {
      const res = await fetch(`/api/sales/${editingSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountReceived: parseFloat(editAmountReceived) || 0,
          paymentStatus: editPaymentStatus,
          paymentDate: editPaymentDate || null,
          paymentMethod: editPaymentMethod || null,
          saleDate: editSaleDate || null,
          serviceDate: editServiceDate || null,
          startDate: editStartDate || null,
          endDate: editEndDate || null,
          discount: parseFloat(editDiscount) || 0,
          notes: editNotes || null,
          basePrice: parseFloat(editBasePrice) || 0,
          finalPrice: parseFloat(editFinalPrice) || 0,
        }),
      })

      if (res.ok) {
        toast.success('Venda atualizada com sucesso!')
        setEditingSale(null)
        loadSales()
      } else {
        const errorData = await res.json()
        console.error('Erro na resposta:', errorData)
        toast.error(`Erro ao atualizar venda: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('Erro ao atualizar venda:', error)
      toast.error('Erro ao atualizar venda')
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(productSearchTerm.toLowerCase())
  )

  const totalSales = sales.reduce((sum, sale) => sum + sale.finalPrice, 0)

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'HOTEL': return 'bg-blue-100 text-blue-700'
      case 'AVULSO': return 'bg-orange-100 text-orange-700'
      case 'PACOTE': return 'bg-purple-100 text-purple-700'
      case 'SERVICO': return 'bg-green-100 text-green-700'
      case 'PRODUTO': return 'bg-amber-100 text-amber-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign className="w-8 h-8" /> PDV - Ponto de Venda
        </h1>
        <button
          onClick={() => setShowCobrancaModal(true)}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <FileText className="w-4 h-4 text-purple-600" /> Gerar Cobrança
        </button>
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
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-8 text-gray-500">Carregando produtos...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">Nenhum produto encontrado</div>
            ) : (
              filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="card p-4 text-left hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Package className="w-8 h-8 text-purple-500" />
                    <span className={`text-xs px-2 py-1 rounded font-medium ${getCategoryColor(product.category)}`}>
                      {product.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{product.description}</p>
                  )}
                  <p className="text-lg font-bold text-green-600">
                    R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="mt-2 text-xs text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    + Adicionar ao carrinho
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Sales History */}
          <div className="card">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Histórico de Vendas
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="search"
                    className="input text-sm w-48"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setSelectedDogId(''); setSearchDropdownOpen(true) }}
                    onFocus={() => setSearchDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setSearchDropdownOpen(false), 150)}
                    placeholder="Buscar cão/tutor..."
                    autoComplete="off"
                  />
                  {selectedDogId && (
                    <button
                      type="button"
                      onClick={() => { setSelectedDogId(''); setSearchTerm('') }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                    >×</button>
                  )}
                  {searchDropdownOpen && !selectedDogId && (() => {
                    const term = searchTerm.toLowerCase()
                    const matches = dogs.filter(d =>
                      !term ||
                      d.name.toLowerCase().includes(term) ||
                      d.ownerName.toLowerCase().includes(term)
                    )
                    if (matches.length === 0) return null
                    return (
                      <div className="absolute z-50 left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {matches.map(d => (
                          <button
                            key={d.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-purple-50 flex flex-col border-b border-gray-100 last:border-0"
                            onMouseDown={() => {
                              setSearchTerm(`${d.name} (${d.ownerName})`)
                              setSelectedDogId(d.id)
                              setSearchDropdownOpen(false)
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-800 text-sm">{d.name}</span>
                              {!d.isActive && <span className="text-xs px-1 py-0.5 rounded bg-gray-100 text-gray-400">inativo</span>}
                              {d.matricula && <span className="text-xs text-gray-400">#{d.matricula}</span>}
                            </div>
                            <span className="text-xs text-gray-500">{d.ownerName}</span>
                          </button>
                        ))}
                      </div>
                    )
                  })()}
                </div>
                <select
                  className="input text-sm w-40"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos os status</option>
                  <optgroup label="Pagamento">
                    <option value="PAGO">✅ Pago</option>
                    <option value="PENDENTE">⏳ Pendente</option>
                    <option value="AGENDADO">�️ Agendado</option>
                  </optgroup>
                  <optgroup label="Serviço">
                    <option value="service:AGENDADO">📌 Serviço Agendado</option>
                    <option value="service:ANDAMENTO">🔄 Em Andamento</option>
                    <option value="service:OK">✔️ Concluído (OK)</option>
                  </optgroup>
                  <optgroup label="Tipo">
                    <option value="type:MENSAL">📋 Mensalidade</option>
                    <option value="type:AVULSO">🎟️ Avulso</option>
                    <option value="type:HOTEL">🏨 Hotel</option>
                    <option value="type:PACOTE">📦 Pacote</option>
                  </optgroup>
                </select>
                <input
                  type="date"
                  className="input text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="De"
                />
                <span className="text-gray-500">até</span>
                <input
                  type="date"
                  className="input text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="Até"
                />
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter(''); setSearchTerm(''); setSelectedDogId('') }}
                  className="btn-secondary text-sm px-3"
                >
                  Limpar
                </button>
              </div>
            </div>
            <div className="mb-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium">Total Geral</p>
                  <p className="text-lg font-bold text-gray-800">
                    R$ {sales.reduce((sum, sale) => sum + sale.finalPrice, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-600 font-medium">Recebido</p>
                  <p className="text-lg font-bold text-green-700">
                    R$ {sales.filter(s => s.paymentStatus === 'PAGO').reduce((sum, sale) => sum + (sale.amountReceived ?? 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center bg-indigo-50 rounded-lg p-3">
                  <p className="text-xs text-indigo-600 font-medium">Programado (à receber)</p>
                  <p className="text-lg font-bold text-indigo-700">
                    R$ {sales.filter(s => s.paymentStatus === 'PROGRAMADA' || s.paymentStatus === 'AGENDADO' || (s.serviceStatus === 'AGENDADO' && s.paymentStatus !== 'PAGO')).reduce((sum, sale) => sum + sale.finalPrice, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-center bg-yellow-50 rounded-lg p-3">
                  <p className="text-xs text-yellow-600 font-medium">Pendente</p>
                  <p className="text-lg font-bold text-yellow-700">
                    R$ {sales.filter(s => s.paymentStatus === 'PENDENTE' && s.serviceStatus !== 'AGENDADO').reduce((sum, sale) => sum + sale.finalPrice, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Data</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Itens</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 hidden md:table-cell">Valor Bruto</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 hidden md:table-cell">Desconto</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">Valor Final</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700 hidden sm:table-cell">Valor Pago</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700">Status</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                        Nenhuma venda neste período
                      </td>
                    </tr>
                  ) : (
                    sales.map(sale => (
                      <tr key={sale.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(sale.saleDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-start gap-3">
                            {/* Dog avatar */}
                            <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                              {sale.dog?.photoUrl
                                ? <img src={sale.dog.photoUrl} alt={sale.dog.name} className="w-full h-full object-cover" />
                                : <span className="text-lg">🐾</span>}
                            </div>
                            <div className="min-w-0">
                              {sale.dog && (
                                <Link href={`/dogs/${sale.dog.id}/resumo`} className="font-bold text-gray-900 text-sm leading-tight hover:text-purple-700 hover:underline">{sale.dog.name}</Link>
                              )}
                              {sale.dog?.ownerName && (
                                <p className="text-xs text-gray-400 mb-1">{sale.dog.ownerName}</p>
                              )}
                              <div className="space-y-0.5">
                                {sale.items.map(item => (
                                  <div key={item.id} className="flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      item.product?.category === 'HOTEL' ? 'bg-blue-400' :
                                      item.product?.category === 'CRECHE' ? 'bg-teal-400' :
                                      item.product?.category === 'PACOTE' ? 'bg-purple-400' :
                                      item.product?.category === 'AVULSO' ? 'bg-orange-400' :
                                      item.product?.category === 'SERVICO' ? 'bg-green-400' : 'bg-gray-300'
                                    }`} />
                                    <span className="text-xs text-gray-600">{item.quantity > 1 ? `${item.quantity}x ` : ''}{item.product?.name || 'Item'}</span>
                                  </div>
                                ))}
                              </div>
                              {sale.serviceStatus && (() => {
                                  const st = sale.serviceStatus
                                  const isXY = /^\d+\/\d+$/.test(st)
                                  const colorCls = st === 'OK' ? 'bg-gray-100 text-gray-500'
                                    : (st === 'ANDAMENTO' || isXY) ? 'bg-amber-50 text-amber-700'
                                    : st === 'AGENDADO' ? 'bg-blue-50 text-blue-700'
                                    : 'bg-purple-50 text-purple-700'
                                  const label = isXY ? `EM ANDAMENTO (${st})` : st
                                  return <span className={`inline-block text-xs font-semibold mt-1 px-1.5 py-0.5 rounded ${colorCls}`}>{label}</span>
                                })()}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800 hidden md:table-cell">
                          R$ {sale.basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-red-600 hidden md:table-cell">
                          {sale.discount && sale.discount > 0 ? `R$ ${sale.discount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-800">
                          R$ {sale.finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-green-600 hidden sm:table-cell">
                          R$ {(sale.amountReceived ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {sale.isExempt && (
                              <span className="inline-block px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                                ISENTO
                              </span>
                            )}
                            {(() => {
                              const isPago = sale.paymentStatus === 'PAGO'
                              // Service done but not paid → show as PENDENTE
                              const isServiceDone = sale.serviceStatus === 'OK' || sale.manualBaixa
                              const isScheduled = sale.paymentStatus === 'AGENDADO' || sale.paymentStatus === 'PROGRAMADA'
                              const effectiveStatus = isPago ? 'PAGO'
                                : (isServiceDone && isScheduled) ? 'PENDENTE'
                                : isScheduled ? 'AGENDADO'
                                : 'PENDENTE'
                              const colorClass = effectiveStatus === 'PAGO' ? 'bg-green-100 text-green-700'
                                : effectiveStatus === 'AGENDADO' ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-yellow-100 text-yellow-700'
                              return (
                                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                                  {effectiveStatus}
                                </span>
                              )
                            })()}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {!sale.manualBaixa && (
                              <button
                                onClick={() => completeSale(sale.id)}
                                className="text-green-500 hover:text-green-700 text-xs font-medium"
                              >
                                Baixar
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(sale)}
                              className="text-blue-500 hover:text-blue-700 text-xs"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => { setPrintSaleId(sale.id); setShowPrintModal(true) }}
                              className="text-gray-400 hover:text-gray-600"
                              title="Imprimir recibo / demonstrativo"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteSale(sale.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
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
                        const lpDate = new Date(lp.saleDate).toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' })
                        return (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-xs ${alreadyApplied ? 'text-green-600' : 'text-amber-600'}`}>
                              {alreadyApplied ? '✓ ' : ''}Última: R$ {lp.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-gray-400">({lpDate})</span>
                            </span>
                            {!alreadyApplied && (
                              <button
                                onClick={() => applyLastPrice(item.productId!, lp.unitPrice)}
                                className="text-xs text-amber-700 font-semibold underline hover:text-amber-900"
                              >Usar</button>
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
          </div>
        </div>
      </div>

      {/* Print Modal */}
      {showPrintModal && (
        <PrintModal
          sales={sales}
          initialSaleId={printSaleId}
          onClose={() => { setShowPrintModal(false); setPrintSaleId(undefined) }}
        />
      )}

      {/* Cobrança Modal */}
      {showCobrancaModal && (
        <CobrancaModal
          sales={sales}
          onClose={() => setShowCobrancaModal(false)}
        />
      )}

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Editar Pagamento - {editingSale.dog?.name}</h3>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <label className="label">Valor em Conta</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={editAmountReceived}
                  onChange={(e) => setEditAmountReceived(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={editPaymentStatus}
                  onChange={(e) => setEditPaymentStatus(e.target.value)}
                >
                  <option value="PAGO">PAGO</option>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="PROGRAMADA">PROGRAMADA</option>
                </select>
              </div>
              <div>
                <label className="label">Método de Pagamento</label>
                <input
                  type="text"
                  className="input"
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  placeholder="PIX, Crédito, etc."
                />
              </div>
              <div>
                <label className="label">Data da Venda</label>
                <input
                  type="date"
                  className="input"
                  value={editSaleDate}
                  onChange={(e) => setEditSaleDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Data do Pagamento</label>
                <input
                  type="date"
                  className="input"
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                />
              </div>

              {/* Dia de Execução — para serviços de dia único (BANHO, AVULSO, CRECHE 1 diária) */}
              {(() => {
                const cats = editingSale.items.map(i => i.product?.category || '')
                const isBanho = cats.includes('SERVICO') || cats.includes('BANHO')
                const isAvulso = cats.includes('AVULSO') || editingSale.saleType === 'AVULSO'
                const isCreche = cats.includes('CRECHE') && !editingSale.startDate // CRECHE sem período = 1 diária
                if (!isBanho && !isAvulso && !isCreche) return null
                return (
                <div className="space-y-3 pt-3 border-t border-green-200">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">📅 Dia de Execução</p>
                  <div>
                    <input
                      type="date"
                      className="input"
                      value={editServiceDate}
                      onChange={(e) => setEditServiceDate(e.target.value)}
                    />
                  </div>
                </div>
                )
              })()}

              {/* Vigência do serviço — detecta pela categoria dos itens */}
              {(() => {
                const cats = editingSale.items.map(i => i.product?.category || '')
                const isHotel = cats.includes('HOTEL') || editingSale.saleType === 'HOTEL'
                const isCreche = cats.includes('CRECHE') || editingSale.saleType === 'MENSAL'
                const isPacote = cats.includes('PACOTE') || editingSale.saleType === 'PACOTE'
                if (!isHotel && !isCreche && !isPacote) return null
                const label = isHotel ? '🏨 Período da Estadia' : isCreche ? '📅 Vigência da Mensalidade' : '📦 Vigência do Pacote'
                return (
                <div className="space-y-3 pt-3 border-t border-blue-200">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{label}</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="label">Início</label>
                      <input
                        type="date"
                        className="input"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="label">Fim</label>
                      <input
                        type="date"
                        className="input"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        min={editStartDate}
                      />
                    </div>
                  </div>
                </div>
                )
              })()}

              {/* Valores da venda */}
              <div className="space-y-3 pt-3 border-t border-gray-200">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="label">Valor Bruto</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={editBasePrice}
                      onChange={(e) => setEditBasePrice(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="label">Desconto</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Valor Final</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={editFinalPrice}
                    onChange={(e) => setEditFinalPrice(e.target.value)}
                  />
                </div>
              </div>

              {/* Notas */}
              <div className="pt-3 border-t border-gray-200">
                <label className="label">Notas</label>
                <textarea
                  className="input"
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Observações da venda..."
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={updateSalePayment}
                  className="btn-primary flex-1"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditingSale(null)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
