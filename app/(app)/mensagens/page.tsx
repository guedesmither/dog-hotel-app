'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Bot, User, Sparkles, Power, Phone, Dog as DogIcon, QrCode, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WhatsAppMessage {
  id: string
  direction: string
  source: string
  text: string
  status: string
  aiSuggestion: string | null
  createdAt: string
}

interface WhatsAppConversation {
  id: string
  phoneNumber: string
  contactName: string | null
  autoReply: boolean
  lastMessageAt: string | null
  dog: { id: string; name: string; ownerName: string; photoUrl: string | null } | null
  messages?: WhatsAppMessage[]
}

function formatPhone(phone: string): string {
  if (phone.length >= 13) {
    const ddi = phone.slice(0, 2)
    const ddd = phone.slice(2, 4)
    const part1 = phone.slice(4, phone.length - 4)
    const part2 = phone.slice(-4)
    return `+${ddi} (${ddd}) ${part1}-${part2}`
  }
  return phone
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Hoje'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function MensagensPage() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [selectedConv, setSelectedConv] = useState<WhatsAppConversation | null>(null)
  const [loading, setLoading] = useState(true)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [waStatus, setWaStatus] = useState<{ configured: boolean; connected: boolean; qrCode?: string | null; phone?: string; message?: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const loadConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/whatsapp/conversations?conversationId=${id}`)
    if (res.ok) {
      const data = await res.json()
      setSelectedConv(data)
      setShowMobileChat(true)
      setSuggestion(null)
    }
  }, [])

  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [loadConversations])

  useEffect(() => {
    fetch('/api/whatsapp/status').then(r => r.json()).then(setWaStatus).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedConv) {
      loadConversation(selectedConv.id)
    }
  }, [conversations.length]) // Reload when conversation list changes

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedConv?.messages])

  async function sendMessage() {
    if (!selectedConv || !messageText.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/whatsapp/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConv.id, text: messageText.trim() }),
      })
      if (res.ok) {
        setMessageText('')
        setSuggestion(null)
        await loadConversation(selectedConv.id)
        await loadConversations()
      }
    } finally {
      setSending(false)
    }
  }

  async function toggleAutoReply() {
    if (!selectedConv) return
    const res = await fetch('/api/whatsapp/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: selectedConv.id, action: 'toggleAutoReply' }),
    })
    if (res.ok) {
      const data = await res.json()
      setSelectedConv({ ...selectedConv, autoReply: data.autoReply })
    }
  }

  async function getSuggestion() {
    if (!selectedConv) return
    setSuggesting(true)
    try {
      const res = await fetch('/api/whatsapp/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConv.id, action: 'suggest' }),
      })
      if (res.ok) {
        const data = await res.json()
        setSuggestion(data.suggestion)
      }
    } finally {
      setSuggesting(false)
    }
  }

  function useSuggestion() {
    if (suggestion) {
      setMessageText(suggestion)
      setSuggestion(null)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] md:h-[calc(100vh-2rem)] gap-2">
      {/* Connection status banner */}
      {waStatus && !waStatus.configured && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Z-API não configurada. Adicione ZAPI_INSTANCE_ID e ZAPI_TOKEN nas variáveis de ambiente.</span>
        </div>
      )}
      {waStatus && waStatus.configured && !waStatus.connected && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <QrCode className="w-4 h-4 shrink-0" />
          <span>WhatsApp não conectado. Escaneie o QR code no painel da Z-API para conectar.</span>
          {waStatus.qrCode && (
            <img src={waStatus.qrCode} alt="QR Code" className="w-16 h-16 rounded border border-blue-200" />
          )}
        </div>
      )}
      {waStatus && waStatus.connected && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          WhatsApp conectado{waStatus.phone ? ` · ${waStatus.phone}` : ''}
        </div>
      )}

    <div className="flex flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Conversation list */}
      <div className={cn(
        'w-full md:w-80 border-r border-gray-200 flex flex-col',
        showMobileChat && selectedConv ? 'hidden md:flex' : 'flex'
      )}>
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Phone className="w-4 h-4 text-green-600" />
            Mensagens
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">WhatsApp · Gemini AI</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-400">Carregando...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">
              Nenhuma conversa ainda.<br />
              As mensagens recebidas aparecerão aqui.
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={cn(
                  'w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors',
                  selectedConv?.id === conv.id && 'bg-green-50'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    {conv.dog?.photoUrl ? (
                      <img src={conv.dog.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <Phone className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-sm text-gray-800 truncate">
                        {conv.contactName || conv.dog?.ownerName || formatPhone(conv.phoneNumber)}
                      </p>
                      {conv.lastMessageAt && (
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatDate(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {conv.dog && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                          <DogIcon className="w-2.5 h-2.5" /> {conv.dog.name}
                        </span>
                      )}
                      {conv.autoReply && (
                        <span className="text-[9px] bg-purple-100 text-purple-600 px-1 rounded-full flex items-center gap-0.5">
                          <Bot className="w-2 h-2" /> AI
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={cn(
        'flex-1 flex flex-col',
        !showMobileChat || !selectedConv ? 'hidden md:flex' : 'flex'
      )}>
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Phone className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Selecione uma conversa</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
              <button
                className="md:hidden text-gray-500 hover:text-gray-700"
                onClick={() => setShowMobileChat(false)}
              >
                ←
              </button>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                {selectedConv.dog?.photoUrl ? (
                  <img src={selectedConv.dog.photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <Phone className="w-4 h-4 text-green-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800 truncate">
                  {selectedConv.contactName || selectedConv.dog?.ownerName || formatPhone(selectedConv.phoneNumber)}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedConv.dog ? `🐶 ${selectedConv.dog.name}` : formatPhone(selectedConv.phoneNumber)}
                </p>
              </div>
              <button
                onClick={toggleAutoReply}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  selectedConv.autoReply
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
                title={selectedConv.autoReply ? 'Auto-resposta ativa' : 'Auto-resposta desativada'}
              >
                <Bot className="w-3.5 h-3.5" />
                {selectedConv.autoReply ? 'AI ON' : 'AI OFF'}
                <Power className="w-3 h-3" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
              {(selectedConv.messages || []).map((msg) => (
                <div
                  key={msg.id}
                  className={cn('flex', msg.direction === 'INBOUND' ? 'justify-start' : 'justify-end')}
                >
                  <div className={cn(
                    'max-w-[75%] rounded-lg px-3 py-2 text-sm',
                    msg.direction === 'INBOUND'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : msg.source === 'AI'
                        ? 'bg-purple-100 text-purple-900'
                        : 'bg-green-500 text-white'
                  )}>
                    {msg.source === 'AI' && msg.direction === 'OUTBOUND' && (
                      <div className="flex items-center gap-1 text-[10px] text-purple-500 mb-0.5">
                        <Bot className="w-2.5 h-2.5" /> Gemini
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] opacity-60">{formatTime(msg.createdAt)}</span>
                      {msg.direction === 'OUTBOUND' && msg.status === 'READ' && (
                        <span className="text-[10px] opacity-60">✓✓</span>
                      )}
                      {msg.direction === 'OUTBOUND' && msg.status === 'FAILED' && (
                        <span className="text-[10px] text-red-400">falhou</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestion banner */}
            {suggestion && (
              <div className="px-4 py-2 bg-purple-50 border-t border-purple-200">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-purple-800 flex-1">{suggestion}</p>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={useSuggestion}
                    className="px-3 py-1 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  >
                    Usar sugestão
                  </button>
                  <button
                    onClick={() => setSuggestion(null)}
                    className="px-3 py-1 text-xs bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <button
                  onClick={getSuggestion}
                  disabled={suggesting}
                  className="p-2 rounded-lg text-purple-500 hover:bg-purple-50 transition-colors disabled:opacity-50"
                  title="Sugerir resposta com IA"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !sending) sendMessage() }}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !messageText.trim()}
                  className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  )
}
