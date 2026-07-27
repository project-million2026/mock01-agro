// Cliente do PAINEL ADMIN DO SISTEMA (F3) — separado do app das orgs. Usa um token próprio
// (localStorage 'sysadmin_token') e o prefixo /api/sys-admin. Nunca compartilha o token dos usuários.
const KEY = 'sysadmin_token'

export const sysToken = () => (typeof window !== 'undefined' ? localStorage.getItem(KEY) : null)
export const sysLogout = () => { if (typeof window !== 'undefined') localStorage.removeItem(KEY) }

export const sysApi = async (path, opts = {}) => {
  const token = sysToken()
  const res = await fetch(`/api/sys-admin${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: 'Erro' }))
    throw new Error(e.detail || e.error || 'Erro')
  }
  return res.json()
}

export const sysLogin = async (email, password) => {
  const r = await sysApi('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (typeof window !== 'undefined' && r.token) localStorage.setItem(KEY, r.token)
  return r
}
