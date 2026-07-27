'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import TelemetryPage from '@/components/pages/TelemetryPage'

// A frota selecionada era estado do componente-raiz; virou parâmetro de URL, então F5 e link
// direto (`/telemetry?fleet=TR-001`) preservam a seleção. O `key` força o remount ao trocar de
// frota, que é o que a página espera de `initialFleet`.
function TelemetryRoute() {
  const fleet = useSearchParams().get('fleet')
  return <TelemetryPage key={fleet || '_'} initialFleet={fleet} />
}

// <Suspense> é obrigatório com useSearchParams — sem ele o `next build` falha.
export default function Page() {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground animate-pulse">Carregando Telemetria...</p>}>
      <TelemetryRoute />
    </Suspense>
  )
}
