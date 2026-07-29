'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Dog,
  PlusCircle,
  Users,
  LogOut,
  Menu,
  X,
  CalendarDays,
  UtensilsCrossed,
  Eye,
  CalendarPlus,
  CalendarRange,
  History,
  TrendingUp,
  ClipboardCheck,
  DollarSign,
  Package,
  ChevronDown,
  ChevronRight,
  ReceiptText,
  BarChart3,
  Calendar,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn, ROLE_LABELS } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
}

interface NavSection {
  title: string
  items: NavItem[]
}

const sectionMeta: Record<string, { emoji: string; label: string; activeBg: string; activeText: string; hoverBg: string; hoverText: string; titleColor: string; titleBorder: string }> = {
  'Visão Geral':   { emoji: '📊', label: 'Visão Geral',   activeBg: 'bg-gray-200',    activeText: 'text-gray-900',   hoverBg: 'hover:bg-gray-100',   hoverText: 'hover:text-gray-900',   titleColor: 'text-gray-600',   titleBorder: 'border-gray-400' },
  'Cadastro':      { emoji: '📋', label: 'Cadastro',      activeBg: 'bg-blue-100',    activeText: 'text-blue-800',   hoverBg: 'hover:bg-blue-50',    hoverText: 'hover:text-blue-800',   titleColor: 'text-blue-700',   titleBorder: 'border-blue-500' },
  'Agenda':        { emoji: '📅', label: 'Agenda',        activeBg: 'bg-teal-100',    activeText: 'text-teal-800',   hoverBg: 'hover:bg-teal-50',    hoverText: 'hover:text-teal-800',   titleColor: 'text-teal-700',   titleBorder: 'border-teal-500' },
  'Monitoria':     { emoji: '👁️', label: 'Monitoria',     activeBg: 'bg-orange-100',  activeText: 'text-orange-800', hoverBg: 'hover:bg-orange-50',  hoverText: 'hover:text-orange-800', titleColor: 'text-orange-700', titleBorder: 'border-orange-500' },
  'Finanças':      { emoji: '💰', label: 'Finanças',      activeBg: 'bg-emerald-100', activeText: 'text-emerald-800',hoverBg: 'hover:bg-emerald-50', hoverText: 'hover:text-emerald-800',titleColor: 'text-emerald-700',titleBorder: 'border-emerald-500' },
  'Administração': { emoji: '⚙️', label: 'Administração', activeBg: 'bg-slate-200',   activeText: 'text-slate-900',  hoverBg: 'hover:bg-slate-100',  hoverText: 'hover:text-slate-900',  titleColor: 'text-slate-600',  titleBorder: 'border-slate-500' },
}

const navSections: NavSection[] = [
  {
    title: 'Visão Geral',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
        roles: ['ADMIN', 'MANAGER', 'MONITOR'],
      },
    ],
  },
  {
    title: 'Cadastro',
    items: [
      {
        href: '/dogs',
        label: 'Cães',
        icon: <Dog className="w-5 h-5" />,
        roles: ['ADMIN', 'MANAGER', 'MONITOR'],
      },
      {
        href: '/dogs/new',
        label: 'Novo Cão',
        icon: <PlusCircle className="w-5 h-5" />,
        roles: ['ADMIN', 'MANAGER'],
      },
      {
        href: '/produtos',
        label: 'Produtos',
        icon: <Package className="w-5 h-5" />,
        roles: ['ADMIN', 'MANAGER'],
      },
      {
        href: '/admin/users',
        label: 'Usuários',
        icon: <Users className="w-5 h-5" />,
        roles: ['ADMIN'],
      },
    ],
  },
  {
    title: 'Agenda',
    items: [
      {
        href: '/agenda',
        label: 'Agenda',
        icon: <CalendarRange className="w-5 h-5" />,
        roles: ['ADMIN', 'MANAGER'],
      },
      {
        href: '/historico',
        label: 'Histórico',
        icon: <History className="w-5 h-5" />,
        roles: ['ADMIN', 'MANAGER'],
      },
    ],
  },
  {
    title: 'Monitoria',
    items: [
      {
        href: '/alimentacao',
        label: 'Monitoria do Dia',
        icon: <Eye className="w-5 h-5" />,
        roles: ['ADMIN', 'MANAGER', 'MONITOR'],
      },
    ],
  },
  {
    title: 'Finanças',
    items: [
      {
        href: '/vendas',
        label: 'Vendas',
        icon: <DollarSign className="w-5 h-5" />,
        roles: ['ADMIN', 'MANAGER'],
      },
      {
        href: '/relatorio',
        label: 'Relatórios',
        icon: <BarChart3 className="w-5 h-5" />,
        roles: ['ADMIN', 'MANAGER'],
      },
      {
        href: '/lancamentos',
        label: 'Lançamentos',
        icon: <ReceiptText className="w-5 h-5" />,
        roles: ['ADMIN', 'MANAGER'],
      },
    ],
  },
  {
    title: 'Administração',
    items: [
      {
        href: '/admin/changes',
        label: 'Alterações',
        icon: <ClipboardCheck className="w-5 h-5" />,
        roles: ['ADMIN', 'MANAGER'],
      },
      {
        href: '/admin/users',
        label: 'Gerenciar Usuários',
        icon: <Users className="w-5 h-5" />,
        roles: ['ADMIN', 'MANAGER'],
      },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['Visão Geral', 'Agenda']))
  const role = (session?.user as { role?: string })?.role || ''

  const tutorDogId = (session?.user as { tutorDogId?: string })?.tutorDogId
  const [pendingCount, setPendingCount] = useState(0)

  const toggleSection = (title: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(title)) {
        newSet.delete(title)
      } else {
        newSet.add(title)
      }
      return newSet
    })
  }

  useEffect(() => {
    if (role === 'ADMIN' || role === 'MANAGER') {
      fetch('/api/admin/changes?status=PENDING')
        .then((r) => r.json())
        .then((d) => setPendingCount(Array.isArray(d) ? d.length : 0))
        .catch(() => {})
    }
  }, [role])

  const visibleSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.roles || item.roles.includes(role))
    }))
    .filter(section => section.items.length > 0)

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-brand-tealLight">
        <img
          src="/logo.png"
          alt="AU-Ê Petcare"
          className="h-14 w-auto object-contain"
          style={{ height: '56px', width: 'auto', maxWidth: '100%', display: 'block' }}
          onError={(e) => {
            const t = e.currentTarget
            t.style.display = 'none'
            const fallback = t.nextElementSibling as HTMLElement | null
            if (fallback) fallback.style.display = 'flex'
          }}
        />
        {/* Fallback caso o arquivo ainda não exista */}
        <div className="items-center gap-3 hidden">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-sm" style={{background: 'linear-gradient(135deg, #4D2075, #7B4FA6)'}}>
            🐾
          </div>
          <div>
            <h1 className="font-bold text-brand-purple text-sm tracking-tight">AU-Ê Petcare</h1>
            <p className="text-xs text-brand-tealDark font-medium">Creche & Hotel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {role === 'TUTOR' ? (
          <>
            {tutorDogId && (
              <Link href={`/dogs/${tutorDogId}`} onClick={() => setMobileOpen(false)}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  pathname.startsWith(`/dogs/${tutorDogId}`) ? 'bg-brand-tealLight text-brand-purple font-semibold shadow-sm' : 'text-gray-600 hover:bg-brand-tealLight hover:text-brand-purple')}>
                <Dog className="w-5 h-5" />
                Meu Cão
              </Link>
            )}
            <Link href="/historico" onClick={() => setMobileOpen(false)}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                pathname === '/historico' ? 'bg-brand-tealLight text-brand-purple font-semibold shadow-sm' : 'text-gray-600 hover:bg-brand-tealLight hover:text-brand-purple')}>
              <History className="w-5 h-5" />
              Histórico
            </Link>
          </>
        ) : (
          visibleSections.map((section) => {
            const isOpen = openSections.has(section.title)
            const meta = sectionMeta[section.title] || sectionMeta['Visão Geral']
            return (
              <div key={section.title}>
                <button
                  onClick={() => toggleSection(section.title)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 mb-1.5 w-full rounded-lg transition-colors',
                    `border-l-4 ${meta.titleBorder}`
                  )}
                >
                  <span className="text-sm">{meta.emoji}</span>
                  <span className={cn('flex-1 text-left text-xs font-bold uppercase tracking-wider', meta.titleColor)}>
                    {section.title}
                  </span>
                  {isOpen
                    ? <ChevronDown className={cn('w-3.5 h-3.5', meta.titleColor)} />
                    : <ChevronRight className={cn('w-3.5 h-3.5', meta.titleColor)} />}
                </button>
                <div
                  className={cn(
                    'space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out pl-1',
                    isOpen ? 'max-h-96 opacity-100 mb-2' : 'max-h-0 opacity-0'
                  )}
                >
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                          isActive
                            ? cn(meta.activeBg, meta.activeText, 'font-bold shadow-sm')
                            : cn('text-gray-600 font-medium', meta.hoverBg, meta.hoverText)
                        )}
                      >
                        <span className={isActive ? meta.activeText : 'text-gray-400'}>{item.icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {item.href === '/admin/changes' && pendingCount > 0 && (
                          <span className="text-xs font-bold bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                            {pendingCount}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </nav>

      <div className="px-3 py-4 border-t border-brand-tealLight">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-gray-700 truncate">{session?.user?.name}</p>
          <p className="text-xs text-gray-500">{ROLE_LABELS[role] || role}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-50 text-white p-2 rounded-xl shadow-lg"
        style={{ background: 'linear-gradient(135deg, #4D2075, #7B4FA6)' }}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-white border-r border-brand-tealLight z-40 transition-transform duration-300',
          'md:sticky md:top-0 md:h-screen md:translate-x-0 md:shrink-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
