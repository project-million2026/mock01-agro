'use client'

import { useRouter } from 'next/navigation'
import DashboardPage from '@/components/pages/DashboardPage'

// Adaptador: a página fala em ids de tela (`setPage('machines')`) e não sabe que rotas existem —
// aqui o id vira URL. Como o id do menu É o segmento, não há tabela de tradução.
export default function Page() {
  const router = useRouter()
  return (
    <DashboardPage
      setPage={(id) => router.push(`/${id}`)}
      onSelectFleet={(fleet) => router.push(`/telemetry?fleet=${encodeURIComponent(fleet)}`)}
    />
  )
}
