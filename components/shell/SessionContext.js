'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Estado de sessão da aplicação — vive no layout do route group, que NÃO remonta entre
 * navegações. É o que garante que o polling de alertas, o bootstrap do plano e o controle de
 * inatividade continuem rodando ao trocar de tela (antes isso morava no `app/page.js` monolítico).
 */
const SessionContext = createContext(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession precisa estar dentro de <SessionProvider>')
  return ctx
}

// Credenciais são removidas item a item (não `localStorage.clear()`): o tema e outras
// preferências de UI não pertencem à sessão e não devem sumir no logout.
export function clearCredentials() {
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('lastActivity')
  } catch { /* storage indisponível */ }
}

export function SessionProvider({ children }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [features, setFeatures] = useState(null)   // null = plano ainda carregando
  const [farms, setFarms] = useState([])
  const [deviceTypes, setDeviceTypes] = useState([])
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const u = localStorage.getItem('user')
        if (u) setUser(JSON.parse(u))
      } catch (e) { console.error('Erro ao ler o usuário da sessão', e) }
    })
  }, [])

  const logout = useCallback(() => {
    clearCredentials()
    setUser(null)
    router.replace('/login')
  }, [router])

  // Bootstrap do plano/sessão (features, fazendas, tipos de dispositivo, timeout de inatividade).
  useEffect(() => {
    let alive = true
    import('@/lib/apiClient').then(({ api }) => {
      api('/settings/sessionTimeout')
        .then(res => { if (res?.value) localStorage.setItem('globalSessionTimeout', res.value) })
        .catch(() => {})
      api('/features').then(res => alive && setFeatures(res.features || [])).catch(() => alive && setFeatures([]))
      api('/farms').then(res => alive && setFarms(res.items || [])).catch(() => {})
      api('/flespi/device-types')
        .then(res => alive && setDeviceTypes([
          { label: 'Nenhum / Não Integrado', value: 'none' },
          ...(res.device_types || []).map(d => ({ label: d.name, value: d.id ? d.id.toString() : 'none' })),
        ]))
        .catch(() => {})
    })
    return () => { alive = false }
  }, [])

  // Alertas abertos: alimenta o badge do menu e avisa dos novos. O WebSocket dispara o refresh
  // imediato; o intervalo de 60s fica só como reconciliação/fallback.
  useEffect(() => {
    let seen = null   // null na primeira carga: não faz toast do que já existia
    let unsub = () => {}
    const poll = () => {
      import('@/lib/apiClient').then(({ api }) => {
        api('/alerts?status=open&limit=50').then(res => {
          const items = res.items || []
          setAlertCount(items.length)
          const ids = new Set(items.map(a => a.id))
          if (seen) {
            items.filter(a => !seen.has(a.id)).forEach(a => {
              const who = a.operatorName || a.operatorRfid
              toast.warning(`[${a.fleetNumber}${who ? ' · ' + who : ''}] ${a.message}`)
            })
          }
          seen = ids
        }).catch(() => {})
      })
    }
    poll()
    import('@/lib/dashboardSocket').then(({ subscribeDashboard }) => {
      unsub = subscribeDashboard((msg) => { if (msg.type === 'alert') poll() })
    })
    const i = setInterval(poll, 60000)
    return () => { clearInterval(i); unsub() }
  }, [])

  // Expiração por inatividade: desloga se o usuário passou do tempo configurado sem interagir.
  useEffect(() => {
    const expired = () => {
      const last = localStorage.getItem('lastActivity')
      const minutes = parseInt(localStorage.getItem('globalSessionTimeout') || '30', 10)
      if (!last) return false
      return Date.now() - parseInt(last, 10) > minutes * 60 * 1000
    }
    // Já expirou ao abrir a tela: desloga fora do corpo do efeito (evita render em cascata).
    if (expired()) { queueMicrotask(logout); return }

    const id = setInterval(() => { if (expired()) logout() }, 30000)
    let lastUpdate = 0
    const touch = () => {
      const now = Date.now()
      if (now - lastUpdate > 5000) {          // throttle: no máximo 1 escrita a cada 5s
        localStorage.setItem('lastActivity', now.toString())
        lastUpdate = now
      }
    }
    localStorage.setItem('lastActivity', Date.now().toString())
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart']
    events.forEach(e => window.addEventListener(e, touch))
    return () => {
      clearInterval(id)
      events.forEach(e => window.removeEventListener(e, touch))
    }
  }, [logout])

  // Enquanto o plano não carregou (null), mostra tudo — evita o flicker de módulos sumindo.
  // O gate de verdade é o backend (403); isto é só apresentação.
  const hasFeature = useCallback(
    (f) => !f || features === null || features.includes(f), [features])

  const value = useMemo(
    () => ({ user, features, farms, deviceTypes, alertCount, hasFeature, logout }),
    [user, features, farms, deviceTypes, alertCount, hasFeature, logout])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
