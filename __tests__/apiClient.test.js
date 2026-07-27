import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api, apiUpload, apiDownload, errorMessage } from '@/lib/apiClient'

describe('apiClient.errorMessage — mensagens legíveis (nunca "???")', () => {
  it('regra de negócio: mostra o detail EXPLÍCITO do backend', () => {
    expect(errorMessage(409, { detail: 'Selecione o fornecedor da peça' }))
      .toBe('Selecione o fornecedor da peça')
  })

  it('422 (array de validação) vira texto legível com o campo', () => {
    const msg = errorMessage(422, { detail: [{ loc: ['body', 'supplierId'], msg: 'field required' }] })
    expect(msg).toContain('supplierId')
    expect(msg).toContain('field required')
  })

  it('técnico: 5xx nunca vaza detail — mostra código do servidor', () => {
    expect(errorMessage(500, { detail: 'stack trace interno' })).toContain('Erro no servidor (500)')
  })

  it('401 → sessão expirada', () => {
    expect(errorMessage(401, null)).toContain('Sessão expirada')
  })

  it('403 sem detail → mensagem de permissão explícita', () => {
    expect(errorMessage(403, null)).toContain('permissão')
  })

  it('4xx sem corpo → fallback genérico, não vazio', () => {
    expect(errorMessage(400, null)).toBe('Não foi possível concluir a ação')
  })

  it('legado: aceita `error` (string) além de `detail`', () => {
    expect(errorMessage(409, { error: 'Estoque insuficiente' })).toBe('Estoque insuficiente')
  })
})

describe('apiClient.api', () => {
  beforeEach(() => {
    localStorage.clear()
    global.fetch = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prefixa /api e envia Content-Type JSON', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: 1 }) })
    await api('/fields')
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/fields')
    expect(opts.headers['Content-Type']).toBe('application/json')
  })

  it('inclui Authorization quando há token no localStorage', async () => {
    localStorage.setItem('token', 'abc123')
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    await api('/x')
    const [, opts] = global.fetch.mock.calls[0]
    expect(opts.headers.Authorization).toBe('Bearer abc123')
  })

  it('NÃO inclui Authorization sem token', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) })
    await api('/x')
    const [, opts] = global.fetch.mock.calls[0]
    expect(opts.headers.Authorization).toBeUndefined()
  })

  it('lança Error com a mensagem do backend quando !ok', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Falhou' }) })
    await expect(api('/x')).rejects.toThrow('Falhou')
  })

  it('mensagem de regra de negócio (4xx) quando corpo não é JSON', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 409, json: async () => { throw new Error('not json') } })
    await expect(api('/x')).rejects.toThrow('Não foi possível concluir')
  })

  it('mensagem TÉCNICA em 5xx', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    await expect(api('/x')).rejects.toThrow('Erro no servidor')
  })

  it('mensagem de CONEXÃO quando o fetch falha (rede)', async () => {
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(api('/x')).rejects.toThrow('Sem conexão')
  })

  it('devolve o JSON parseado em caso de sucesso', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ items: [1, 2] }) })
    const data = await api('/fields')
    expect(data).toEqual({ items: [1, 2] })
  })
})

describe('apiClient.apiUpload', () => {
  beforeEach(() => { localStorage.clear(); global.fetch = vi.fn() })
  afterEach(() => vi.restoreAllMocks())

  it('faz POST multipart SEM Content-Type (browser define o boundary) e inclui Authorization', async () => {
    localStorage.setItem('token', 'tk')
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ recognized: true }) })
    const fd = new FormData(); fd.append('file', new Blob(['x']), 'a.pdf')
    const r = await apiUpload('/service-orders/extract-pdf', fd)
    const [url, opts] = global.fetch.mock.calls[0]
    expect(url).toBe('/api/service-orders/extract-pdf')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Content-Type']).toBeUndefined()
    expect(opts.headers.Authorization).toBe('Bearer tk')
    expect(opts.body).toBe(fd)
    expect(r).toEqual({ recognized: true })
  })

  it('lança Error com a mensagem do backend quando !ok', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ detail: 'PDF inválido' }) })
    await expect(apiUpload('/x', new FormData())).rejects.toThrow('PDF inválido')
  })
})

describe('apiClient.apiDownload', () => {
  beforeEach(() => {
    localStorage.clear(); global.fetch = vi.fn()
    global.URL.createObjectURL = vi.fn(() => 'blob:x')
    global.URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => vi.restoreAllMocks())

  it('baixa o blob e dispara o download quando ok', async () => {
    global.fetch.mockResolvedValue({ ok: true, blob: async () => new Blob(['pdf']) })
    await apiDownload('/service-orders/1/pdf', 'os-1.pdf')
    expect(global.fetch).toHaveBeenCalledWith('/api/service-orders/1/pdf', expect.any(Object))
    expect(global.URL.createObjectURL).toHaveBeenCalled()
  })

  it('lança erro quando a resposta não é ok', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    await expect(apiDownload('/x', 'x.pdf')).rejects.toThrow('Erro no servidor')
  })
})
