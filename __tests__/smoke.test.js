import { describe, it, expect } from 'vitest'

// Smoke test mínimo para o CI de frontend ter algo verde.
// Expandir com testes de componentes/hooks (ver .agents/standards/FRONTEND_STANDARDS.md).
describe('smoke', () => {
  it('sanity: soma', () => {
    expect(1 + 1).toBe(2)
  })
})
