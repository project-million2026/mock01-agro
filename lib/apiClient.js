const CONNECTION_MSG = 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'

// Extrai uma mensagem de erro LEGÍVEL da resposta HTTP (nunca "???"):
//  - REGRA DE NEGÓCIO (4xx): mostra o motivo EXPLÍCITO do backend (`detail`), ex.: "Selecione o
//    fornecedor". FastAPI usa `detail` (string OU array de validação 422); legado usava `error`.
//  - TÉCNICO (5xx): erro do servidor (não é culpa/decisão do usuário) — sinaliza como tal + código.
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
  return msg   // regra de negócio: motivo explícito do backend
}

// Sessão inválida/expirada: derruba a credencial e manda para o login guardando onde o usuário
// estava. Sem isto ele permanece numa tela "logada" com a sessão morta, colecionando toasts de
// erro em cada requisição. Remove item a item — tema e outras preferências de UI não são sessão.
const onUnauthorized = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('lastActivity')
  } catch { /* storage indisponível */ }
  if (window.location.pathname === '/login') return   // já está lá; não faz loop
  const dest = window.location.pathname + window.location.search
  window.location.replace(`/login?next=${encodeURIComponent(dest)}`)
}

// fetch que distingue falha de CONEXÃO (rede/servidor fora) de erro HTTP (regra de negócio/técnico).
const request = async (path, init) => {
  let res
  try {
    res = await fetch(`/api${path}`, init)
  } catch {
    throw new Error(CONNECTION_MSG)   // rede caiu / servidor inacessível
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    if (res.status === 401) onUnauthorized()
    throw new Error(errorMessage(res.status, body))
  }
  return res
}

export const api = async (path, opts = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await request(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  return res.json()
}

// Upload multipart (ex.: PDF de O.S.). NÃO seta Content-Type — o browser define o boundary do
// multipart automaticamente a partir do FormData.
export const apiUpload = async (path, formData) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await request(path, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  })
  return res.json()
}

// Baixa um arquivo de um endpoint autenticado (relatórios): faz fetch com o token,
// pega o blob e dispara o download no browser (um <a href> não enviaria o Authorization).
export const apiDownload = async (path, filename) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await request(path, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
