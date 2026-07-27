'use client'

import { Suspense } from 'react'
import AuthGate from '@/components/shell/AuthGate'
import { SessionProvider } from '@/components/shell/SessionContext'
import AppShell from '@/components/shell/AppShell'

/**
 * Layout das telas autenticadas. Por ser layout de route group, NÃO remonta ao navegar entre
 * rotas — a sessão, o polling de alertas e o WebSocket seguem vivos; só o conteúdo troca.
 * O <Suspense> é exigido pelo `useSearchParams` do AuthGate (sem ele o `next build` falha).
 */
export default function AppLayout({ children }) {
  return (
    <Suspense fallback={null}>
      <AuthGate>
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </AuthGate>
    </Suspense>
  )
}
