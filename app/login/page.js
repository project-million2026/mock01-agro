'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthPage from '@/components/AuthPage'

// Rota própria de login: dá URL ao "estado deslogado" e permite voltar ao destino original
// (?next=) depois de autenticar — inclusive quando a sessão expira no meio de uma tela.
function LoginRoute() {
  const router = useRouter()
  const next = useSearchParams().get('next')
  const dest = next && next.startsWith('/') ? next : '/dashboard'   // só destino interno

  // Já logado (ex.: abriu /login com sessão válida) → segue direto.
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) router.replace(dest)
  }, [router, dest])

  // O AuthPage já persiste token/user no localStorage; aqui só decidimos para onde ir.
  return <AuthPage onAuth={() => router.replace(dest)} />
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginRoute />
    </Suspense>
  )
}
