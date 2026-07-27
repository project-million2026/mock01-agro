import { test as base, expect } from '@playwright/test'

// Credenciais da MASSA DE TESTE (criadas pelo `python-backend/seed.py`, documentadas no pacote de
// QA). São fixtures de ambiente de teste — nunca credenciais reais de produção.
export const TEST_USER = {
  email: process.env.E2E_EMAIL || 'admin@telemetria.com',
  password: process.env.E2E_PASSWORD || 'admin',
}

/**
 * `test` com sessão já autenticada. Faz login uma vez por teste pela TELA (não injetando token),
 * porque o login em si é parte do que precisa ser verificado de ponta a ponta.
 */
export const test = base.extend({
  auth: async ({ page }, use) => {
    await page.goto('/login')
    await page.getByLabel(/e-?mail/i).fill(TEST_USER.email)
    await page.getByLabel(/senha/i).fill(TEST_USER.password)
    await page.getByRole('button', { name: /entrar/i }).click()
    // O login só termina quando saímos de /login — se a API estiver fora, falha aqui com clareza.
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
    await use(page)
  },
})

export { expect }
