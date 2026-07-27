'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Wrench, ClipboardList, Package, Truck, History, LayoutDashboard, Gauge } from 'lucide-react'

// Sub-telas reaproveitadas (marco Oficina Inteligente — Fatia A: consolidação do módulo).
// IMPORTANTE: o Next (`next build`, Turbopack) exige `import()` com path LITERAL E o objeto de
// opções INLINE (nada de helper/variável) — senão o build de produção quebra (era o caso do
// frontend Docker, que ficava travado numa imagem antiga).
const _spin = <p className="p-8 text-muted-foreground animate-pulse">Carregando...</p>
const OficinaPanelPage = dynamic(() => import('@/components/pages/OficinaPanelPage'), { loading: () => _spin })
const MaintenancePage = dynamic(() => import('@/components/pages/MaintenancePage'), { loading: () => _spin })
const OrdensServicoPage = dynamic(() => import('@/components/pages/OrdensServicoPage'), { loading: () => _spin })
const EstoquePage = dynamic(() => import('@/components/pages/EstoquePage'), { loading: () => _spin })
const FornecedoresPage = dynamic(() => import('@/components/pages/FornecedoresPage'), { loading: () => _spin })
const MachineHistoryPage = dynamic(() => import('@/components/pages/MachineHistoryPage'), { loading: () => _spin })
const PecasPorKmPage = dynamic(() => import('@/components/pages/PecasPorKmPage'), { loading: () => _spin })

// Cada sub-item continua gateado pela sua flag fina (maintenance/stock); `oficina` (guarda-chuva)
// controla o módulo.
const SUBTABS = [
  { id: 'painel', label: 'Painel', icon: LayoutDashboard, feature: 'maintenance', render: (r, goto) => <OficinaPanelPage onNavigate={goto} /> },
  { id: 'manutencao', label: 'Manutenção', icon: Wrench, feature: 'maintenance', render: (r) => <MaintenancePage currentUserRole={r} /> },
  { id: 'os', label: 'Ordens de Serviço', icon: ClipboardList, feature: 'maintenance', render: (r) => <OrdensServicoPage currentUserRole={r} /> },
  { id: 'estoque', label: 'Peças & Estoque', icon: Package, feature: 'stock', render: (r) => <EstoquePage currentUserRole={r} /> },
  { id: 'fornecedores', label: 'Fornecedores', icon: Truck, feature: 'stock', render: (r) => <FornecedoresPage currentUserRole={r} /> },
  { id: 'pecas-km', label: 'Peças por km', icon: Gauge, feature: 'stock', render: () => <PecasPorKmPage /> },
  { id: 'historico', label: 'Histórico da Máquina', icon: History, feature: 'maintenance', render: () => <MachineHistoryPage /> },
]

export default function OficinaPage({ currentUserRole, features, setPage, initialTab, onTabChange }) {
  // Enquanto o plano não carregou (features null), mostra tudo para evitar flicker.
  const has = (f) => !f || !Array.isArray(features) || features.includes(f)
  const visible = SUBTABS.filter((t) => has(t.feature))
  // `initialTab` vem da URL (?tab=os) — só é aceito se a aba existir e estiver no plano.
  const [tab, setTab] = useState(
    (initialTab && visible.some((t) => t.id === initialTab) ? initialTab : visible[0]?.id) || 'manutencao')
  const active = visible.find((t) => t.id === tab) || visible[0]

  // Troca de aba: além do estado, avisa quem monta a página para espelhar na URL (link direto).
  const select = (id) => { setTab(id); onTabChange?.(id) }

  // Navegação a partir do Painel: sub-aba interna (manutencao/os…) ou página de topo (alerts).
  const goto = (target) => {
    if (target === 'alerts') { setPage?.('alerts'); return }
    if (visible.some((t) => t.id === target)) select(target)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Wrench className="w-6 h-6 text-primary" />Oficina</h1>
        <p className="text-muted-foreground text-sm">Manutenção, ordens de serviço, peças e fornecedores em um só lugar</p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border">
        {visible.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => select(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4" />{t.label}
            </button>
          )
        })}
      </div>

      <div>{active?.render(currentUserRole, goto)}</div>
    </div>
  )
}
