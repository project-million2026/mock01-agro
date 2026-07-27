import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'expo-router'
import { api, apiPost, onAuthExpired } from '../api/client'
import { getUser, saveSession, clearCredentials } from './storage'

// Sessão do app — port do components/shell/SessionContext.js do web. Guarda user/features, faz o
// bootstrap do plano (GET /features) e centraliza login/logout. `status` dá o estado de carga
// inicial (restaurar sessão salva) para o AuthGate decidir sem flash.
const SessionContext = createContext(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession precisa estar dentro de <SessionProvider>')
  return ctx
}

export function SessionProvider({ children }) {
  const router = useRouter()
  const [status, setStatus] = useState('loading')   // loading | authed | anon
  const [user, setUserState] = useState(null)
  const [features, setFeatures] = useState(null)     // null = plano ainda carregando
  const [plan, setPlan] = useState(null)             // nome do plano (standard/pro/enterprise)

  const bootstrap = useCallback(async () => {
    // Se o /features responde, o token é válido; senão o interceptor 401 já limpou e caímos em anon.
    try {
      const res = await api('/api/features')
      setFeatures(res.features || [])
      setPlan(res.plan || null)
      setStatus('authed')
    } catch {
      setStatus((s) => (s === 'authed' ? s : 'anon'))
    }
  }, [])

  // Restaura a sessão salva no arranque.
  useEffect(() => {
    (async () => {
      const saved = await getUser()
      if (saved) { setUserState(saved); await bootstrap() }
      else setStatus('anon')
    })()
  }, [bootstrap])

  // Interceptor 401 (emitido pelo client): derruba a sessão e volta ao login.
  useEffect(() => onAuthExpired(() => {
    setUserState(null); setFeatures(null); setPlan(null); setStatus('anon')
    router.replace('/login')
  }), [router])

  const login = useCallback(async (email, password) => {
    const res = await apiPost('/api/auth/login', { email, password })
    await saveSession(res.token, res.user)
    setUserState(res.user)
    await bootstrap()
    return res.user
  }, [bootstrap])

  const logout = useCallback(async () => {
    await clearCredentials()
    setUserState(null); setFeatures(null); setPlan(null); setStatus('anon')
    router.replace('/login')
  }, [router])

  // Enquanto o plano não carregou (null), mostra tudo — o gate real é o backend (403).
  const hasFeature = useCallback(
    (f) => !f || features === null || features.includes(f), [features])

  const value = useMemo(
    () => ({ status, user, features, plan, hasFeature, login, logout }),
    [status, user, features, plan, hasFeature, login, logout])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
