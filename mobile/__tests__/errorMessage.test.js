import { errorMessage } from '../src/api/client'

// Paridade com o vitest do web (__tests__/apiClient.test.js): a UX de erro do app tem de ser a
// mesma — conexão × regra de negócio (detail) × técnico (5xx). Nunca "???".
describe('errorMessage (mobile) — paridade com o web', () => {
  it('regra de negócio: mostra o detail explícito do backend', () => {
    expect(errorMessage(409, { detail: 'Estoque insuficiente de Correia' }))
      .toBe('Estoque insuficiente de Correia')
  })

  it('422 (array de validação) vira texto legível com o campo', () => {
    const msg = errorMessage(422, { detail: [{ loc: ['body', 'email'], msg: 'field required' }] })
    expect(msg).toContain('email')
    expect(msg).toContain('field required')
  })

  it('técnico: 5xx nunca vaza o detail — mostra código', () => {
    expect(errorMessage(500, { detail: 'stack interno' })).toContain('Erro no servidor (500)')
  })

  it('401 → sessão expirada', () => {
    expect(errorMessage(401, null)).toContain('Sessão expirada')
  })

  it('403 sem detail → mensagem de permissão', () => {
    expect(errorMessage(403, null)).toContain('permissão')
  })

  it('4xx sem corpo → fallback genérico', () => {
    expect(errorMessage(400, null)).toBe('Não foi possível concluir a ação')
  })

  it('legado: aceita `error` (string)', () => {
    expect(errorMessage(409, { error: 'Falhou' })).toBe('Falhou')
  })
})
