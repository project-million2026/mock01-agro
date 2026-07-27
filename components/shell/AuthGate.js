'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

/**
 * Guarda de rota do lado do cliente. O token vive no localStorage, que o servidor não enxerga —
 * então o gate é aqui, com três estados explícitos:
 *
 *   checking → renderiza nada (o storage só existe depois da hidratação). Evita o flash de tela
 *              protegida E mantém as páginas fora do prerender do build: no `next build` o estado
 *              é sempre `checking`, então nenhuma tela logada é renderizada estaticamente.
 *   anon     → manda para /login guardando o destino em ?next=, para voltar depois do login.
 *   authed   → libera os filhos.
 *
 * Isto é UX de navegação, não segurança: a autoridade continua sendo o backend (RLS + RBAC + 403).
 */
export default function AuthGate({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    // queueMicrotask: o storage só existe após a hidratação e setState direto no corpo do efeito
    // dispara render em cascata (padrão já usado no resto do app).
    queueMicrotask(() => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      setStatus(token ? 'authed' : 'anon')
    })
  }, [pathname])

  useEffect(() => {
    if (status !== 'anon') return
    const qs = searchParams?.toString()
    const dest = pathname + (qs ? `?${qs}` : '')
    router.replace(`/login?next=${encodeURIComponent(dest)}`)
  }, [status, pathname, searchParams, router])

  if (status !== 'authed') return null
  return children
}
