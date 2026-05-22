'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Package, Plus, Edit2, Trash2, Search } from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string | null
  category: string
  price: number
  isActive: boolean
}

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: 'PRODUTO',
    price: '',
  })

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
    setLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [])

  async function addProduct() {
    try {
      if (!productForm.name || !productForm.price) {
        toast.error('Preencha o nome e o preço')
        return
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productForm.name,
          description: productForm.description,
          category: productForm.category,
          price: productForm.price,
        }),
      })

      if (res.ok) {
        toast.success('Produto cadastrado com sucesso!')
        setShowAddModal(false)
        setProductForm({ name: '', description: '', category: 'PRODUTO', price: '' })
        loadProducts()
      } else {
        toast.error('Erro ao cadastrar produto')
      }
    } catch {
      toast.error('Erro ao cadastrar produto')
    }
  }

  async function updateProduct() {
    if (!editingProduct) return

    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productForm.name,
          description: productForm.description,
          category: productForm.category,
          price: productForm.price,
        }),
      })

      if (res.ok) {
        toast.success('Produto atualizado com sucesso!')
        setShowEditModal(false)
        setEditingProduct(null)
        setProductForm({ name: '', description: '', category: 'PRODUTO', price: '' })
        loadProducts()
      } else {
        toast.error('Erro ao atualizar produto')
      }
    } catch {
      toast.error('Erro ao atualizar produto')
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Produto excluído com sucesso!')
        loadProducts()
      } else {
        toast.error('Erro ao excluir produto')
      }
    } catch {
      toast.error('Erro ao excluir produto')
    }
  }

  function openEditModal(product: Product) {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price.toString(),
    })
    setShowEditModal(true)
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Package className="w-8 h-8" /> Produtos
      </h1>

      {/* Search and Add */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              className="input pl-10"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Categoria</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Descrição</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Preço</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Nenhum produto encontrado
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{product.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${getCategoryColor(product.category)}`}>
                        {product.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-[300px] truncate">
                      {product.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-red-600"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Novo Produto</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nome</label>
                <input
                  type="text"
                  className="input"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Ex: Diária de Creche"
                />
              </div>
              <div>
                <label className="label">Categoria</label>
                <select
                  className="select"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                >
                  <option value="HOTEL">🏨 Hotel</option>
                  <option value="CRECHE">🐾 Creche (Mensalidade)</option>
                  <option value="AVULSO">💵 Avulso (Diária)</option>
                  <option value="PACOTE">📦 Pacote de Diárias</option>
                  <option value="SERVICO">✂️ Serviço (Banho/Tosa)</option>
                  <option value="PRODUTO">�️ Produto</option>
                </select>
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea
                  className="input"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Descrição do produto..."
                  rows={2}
                />
              </div>
              <div>
                <label className="label">Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  placeholder="Ex: 115.00"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button onClick={addProduct} className="btn-primary flex-1">
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Editar Produto</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nome</label>
                <input
                  type="text"
                  className="input"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Categoria</label>
                <select
                  className="select"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                >
                  <option value="HOTEL">🏨 Hotel</option>
                  <option value="CRECHE">🐾 Creche (Mensalidade)</option>
                  <option value="AVULSO">💵 Avulso (Diária)</option>
                  <option value="PACOTE">📦 Pacote de Diárias</option>
                  <option value="SERVICO">✂️ Serviço (Banho/Tosa)</option>
                  <option value="PRODUTO">�️ Produto</option>
                </select>
              </div>
              <div>
                <label className="label">Descrição</label>
                <textarea
                  className="input"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <label className="label">Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowEditModal(false)} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button onClick={updateProduct} className="btn-primary flex-1">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
