import Constants from 'expo-constants'
import { getToken, clearCredentials } from '../auth/storage'

// Base da API. Em dev, o celular fala DIRETO com o backend na Wi-Fi (o compose expõe :8000) —
// defina EXPO_PUBLIC_API_URL=http://<IP-do-PC>:8000. Em prod, o domínio HTTPS do nginx.
const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://localhost:8000'
).replace(/\/$/, '')

const CONNECTION_MSG = 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'

// PORT FIEL do lib/apiClient.js do web — mesma UX de erro: conexão × regra de negócio (detail do
// backend) × técnico (5xx). Mantido idêntico de propósito para paridade comportamental entre
// plataformas (há teste de unidade espelhando o vitest do web).
export const errorMessage = (status, body) => {
  let msg = null
  if (body) {
    if (typeof body.detail === 'string') msg = body.detail
    else if (Array.isArray(body.detail)) msg = body.detail.map(d => (d.loc ? `${d.loc.at(-1)}: ` : '') + (d.msg || '')).join('; ')
    else if (typeof body.error === 'string') msg = body.error
    else if (body.detail) msg = JSON.stringify(body.detail)
  }
  if (status >= 500) return `Erro no servidor (${status}). Tente novamente em instantes.`
  if (status === 401) return 'Sessão expirada. Entre novamente.'
  if (!msg) msg = status === 403 ? 'Você não tem permissão para esta ação' : 'Não foi possível concluir a ação'
  return msg
}

// Sessão inválida/expirada: derruba a credencial e emite o evento que o SessionProvider escuta
// para voltar ao login. Equivale ao interceptor 401 do web (lá é window.location; aqui é o router).
const authListeners = new Set()
export const onAuthExpired = (fn) => { authListeners.add(fn); return () => authListeners.delete(fn) }

const handleUnauthorized = async () => {
  await clearCredentials()
  authListeners.forEach(fn => { try { fn() } catch { /* noop */ } })
}

// fetch que distingue falha de CONEXÃO (rede/servidor fora) de erro HTTP.
const request = async (path, init = {}) => {
  const token = await getToken()
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    })
  } catch {
    throw new Error(CONNECTION_MSG)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    if (res.status === 401) await handleUnauthorized()
    throw new Error(errorMessage(res.status, body))
  }
  return res
}

export const api = async (path, opts = {}) => (await request(path, opts)).json()

// POST helper com corpo JSON.
export const apiPost = (path, body) =>
  api(path, { method: 'POST', body: body != null ? JSON.stringify(body) : undefined })

export const apiPut = (path, body) =>
  api(path, { method: 'PUT', body: body != null ? JSON.stringify(body) : undefined })

export { BASE_URL }
