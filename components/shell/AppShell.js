'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Tractor, MapPinned, Map as MapIcon,
  LogOut, Sparkles, Building2, BookOpen, UserCog, UserCheck, Wrench,
  Bell, FileText, ChevronLeft, ChevronRight, Menu, X, CloudSun, Sun, Moon, Route,
} from 'lucide-react'
import { Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { useSession } from '@/components/shell/SessionContext'

// Casca da aplicação: menu, tema e avisos. Vive no layout do route group, então NÃO remonta ao
// navegar — só o conteúdo troca. O id de cada item É o segmento da URL (`/dashboard`, `/oficina`…),
// o que dispensa qualquer tabela de tradução entre menu e rota.
const MENU = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'machines', label: 'Frotas', icon: Tractor },
  { id: 'operators', label: 'Operadores', icon: UserCheck },
  { id: 'telemetry', label: 'Telemetria e Rotas', icon: MapPinned },
  { id: 'farms', label: 'Fazendas', icon: MapPinned },
  { id: 'fields', label: 'Talhões', icon: MapIcon },
  { id: 'buildings', label: 'Prédios', icon: Building2 },
  { id: 'oficina', label: 'Oficina', icon: Wrench, feature: 'oficina' },
  { id: 'work-plans', label: 'Plano de Rota', icon: Route, feature: 'oficina' },
  { id: 'weather', label: 'Clima', icon: CloudSun, feature: 'weather' },
  { id: 'alerts', label: 'Alertas', icon: Bell, badgeKey: 'alertCount', feature: 'alerts' },
  { id: 'reports', label: 'Relatórios', icon: FileText, feature: 'reports' },
  { id: 'simulator', label: 'Simulador', icon: Sparkles },
  { id: 'users', label: 'Usuários', icon: UserCog },
  { id: 'wiki', label: 'Base de Conhecimento', icon: BookOpen },
]

export default function AppShell({ children }) {
  const pathname = usePathname()
  const { user, alertCount, hasFeature, logout } = useSession()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const onResize = () => setIsCollapsed(window.innerWidth < 1024)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // O script do layout raiz já aplicou o tema antes da pintura; aqui só sincronizamos o estado.
  useEffect(() => {
    queueMicrotask(() => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light'))
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    try { localStorage.setItem('theme', next) } catch { /* ignore */ }
    setTheme(next)
  }

  const visibleMenu = MENU.filter(m => hasFeature(m.feature))
  const isWiki = pathname === '/wiki'

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground selection:bg-primary/30">
      <Toaster richColors closeButton position="top-right" theme={theme} />

      {/* Barra superior (mobile) */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 border-b border-border/40 bg-card/80 backdrop-blur-md flex items-center px-4 gap-3 z-40">
        <Button variant="ghost" size="icon" className="-ml-2 shrink-0" onClick={() => setIsMobileOpen(true)}>
          <Menu className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-md shrink-0 object-cover" />
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-green-300 bg-clip-text text-transparent">Agro Telemetria</h1>
        </div>
      </div>

      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setIsMobileOpen(false)} />
      )}

      <aside className={`
        fixed md:relative top-0 left-0 h-full z-50 border-r border-border/40 bg-card/95 md:bg-card/30 backdrop-blur-md flex flex-col transition-all duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        <div className={`border-b border-border/40 flex ${isCollapsed ? 'flex-col items-center justify-center p-4 gap-4' : 'items-center justify-between p-6'}`}>
          {!isCollapsed && (
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-lg shrink-0 object-cover" />
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-green-300 bg-clip-text text-transparent whitespace-nowrap">Agro Telemetria</h1>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Plataforma SaaS</p>
            </div>
          )}
          {isCollapsed && <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-lg shrink-0 object-cover" />}

          <Button variant="ghost" size="icon" className="hidden md:flex shrink-0" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setIsMobileOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {visibleMenu.map(m => {
            const href = `/${m.id}`
            const active = pathname === href || pathname.startsWith(`${href}/`)
            const badge = m.badgeKey === 'alertCount' ? alertCount : 0
            return (
              <Link
                key={m.id}
                href={href}
                title={isCollapsed ? m.label : undefined}
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 group overflow-hidden
                  ${isCollapsed ? 'justify-center py-3 px-2' : 'px-3 py-2.5'}
                  ${active
                    ? 'bg-primary/10 text-primary shadow-[inset_4px_0_0_0_rgba(34,197,94,1)]'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <span className="relative shrink-0">
                  <m.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${active ? 'text-primary' : ''}`} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                {!isCollapsed && <span className="whitespace-nowrap opacity-100 transition-opacity duration-300 flex-1 text-left">{m.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className={`p-4 border-t border-border/40 bg-black/20 flex flex-col ${isCollapsed ? 'items-center' : ''}`}>
          <div className={`flex items-center gap-3 mb-4 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-primary to-green-900 flex items-center justify-center font-bold shadow-lg shadow-primary/20 border border-primary/20">
              {user?.name?.charAt(0) || 'U'}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            title={isCollapsed ? 'Sair' : undefined}
            className={`w-full text-muted-foreground hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/20 transition-colors ${isCollapsed ? 'px-0 justify-center' : 'justify-start'}`}
            onClick={logout}
          >
            <LogOut className={`w-4 h-4 ${isCollapsed ? '' : 'mr-2'}`} /> {!isCollapsed && 'Sair do Sistema'}
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-grid-white/[0.02] relative custom-scrollbar md:pt-0 pt-16">
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          className="absolute top-3 right-3 z-30 inline-flex items-center justify-center w-9 h-9 rounded-full border border-border bg-card/80 backdrop-blur text-muted-foreground hover:text-foreground hover:bg-accent shadow-sm transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] pointer-events-none" />
        <div className={`relative min-h-full mx-auto ${isWiki ? 'p-4 max-w-full' : 'p-8 max-w-7xl'}`}>
          {children}
        </div>
      </main>
    </div>
  )
}
