'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import OficinaPage from '@/components/pages/OficinaPage'
import FeatureGate from '@/components/shell/FeatureGate'
import { useSession } from '@/components/shell/SessionContext'

// A subaba da Oficina vira parâmetro de URL: `/oficina?tab=os` abre direto nas Ordens de Serviço
// (era o pedido — link direto para a O.S.). `replace` em vez de `push` para trocar de aba não
// empilhar histórico, senão o botão Voltar percorreria aba por aba.
function OficinaRoute() {
  const router = useRouter()
  const { user, features } = useSession()
  const tab = useSearchParams().get('tab')
  return (
    <OficinaPage
      currentUserRole={user?.role}
      features={features}
      setPage={(id) => router.push(`/${id}`)}
      initialTab={tab}
      onTabChange={(t) => router.replace(`/oficina?tab=${t}`, { scroll: false })}
    />
  )
}

export default function Page() {
  return (
    <FeatureGate feature="oficina">
      <Suspense fallback={<p className="p-8 text-muted-foreground animate-pulse">Carregando Oficina...</p>}>
        <OficinaRoute />
      </Suspense>
    </FeatureGate>
  )
}
