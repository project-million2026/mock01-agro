import { test, expect, TEST_USER } from './fixtures.js'

/**
 * Navegação por ROTAS REAIS — é exatamente o que a SPA de página única não conseguia fazer:
 * link direto, F5 mantendo a tela e o botão Voltar do navegador.
 */

test('raiz redireciona e rota protegida manda para o login guardando o destino', async ({ page }) => {
  await page.goto('/oficina?tab=os')
  await expect(page).toHaveURL(/\/login\?next=/)
  // O destino (com query) tem de sobreviver ao redirecionamento.
  expect(decodeURIComponent(new URL(page.url()).searchParams.get('next'))).toBe('/oficina?tab=os')
})

test('login volta para o destino original (?next=)', async ({ page }) => {
  await page.goto('/reports')
  await expect(page).toHaveURL(/\/login/)
  await page.getByLabel(/e-?mail/i).fill(TEST_USER.email)
  await page.getByLabel(/senha/i).fill(TEST_USER.password)
  await page.getByRole('button', { name: /entrar/i }).click()
  await expect(page).toHaveURL(/\/reports$/)
})

test('cada item do menu tem URL própria e o F5 mantém a tela', async ({ auth: page }) => {
  const rotas = [
    ['Painel', '/dashboard'],
    ['Frotas', '/machines'],
    ['Operadores', '/operators'],
    ['Talhões', '/fields'],
    ['Oficina', '/oficina'],
    ['Relatórios', '/reports'],
  ]
  for (const [label, url] of rotas) {
    await page.getByRole('link', { name: label, exact: false }).first().click()
    await expect(page).toHaveURL(new RegExp(`${url}(\\?|$)`))
    await page.reload()                                  // F5 não pode voltar para o painel
    await expect(page).toHaveURL(new RegExp(`${url}(\\?|$)`))
    await expect(page.locator('aside')).toBeVisible()     // o shell sobreviveu ao reload
  }
})

test('botão Voltar do navegador anda entre telas em vez de sair do app', async ({ auth: page }) => {
  await page.goto('/machines')
  await expect(page).toHaveURL(/\/machines/)
  await page.goto('/operators')
  await expect(page).toHaveURL(/\/operators/)
  await page.goBack()
  await expect(page).toHaveURL(/\/machines/)             // voltou para a tela anterior, não saiu
  await page.goForward()
  await expect(page).toHaveURL(/\/operators/)
})

test('link direto abre a subaba da Oficina e a troca de aba reflete na URL', async ({ auth: page }) => {
  await page.goto('/oficina?tab=estoque')
  await expect(page.getByRole('button', { name: /Peças & Estoque/i })).toBeVisible()
  await page.getByRole('button', { name: /Ordens de Serviço/i }).click()
  await expect(page).toHaveURL(/\/oficina\?tab=os/)      // a URL acompanha a aba
})

test('seleção de frota vira parâmetro de URL na telemetria', async ({ auth: page }) => {
  await page.goto('/telemetry?fleet=TR-001')
  await expect(page).toHaveURL(/fleet=TR-001/)
  await page.reload()
  await expect(page).toHaveURL(/fleet=TR-001/)           // a frota sobrevive ao F5
})

test('logout leva ao login e preserva a preferência de tema', async ({ auth: page }) => {
  await page.goto('/dashboard')
  const temaAntes = await page.evaluate(() => {
    localStorage.setItem('theme', 'light')
    return localStorage.getItem('theme')
  })
  await page.getByRole('button', { name: /sair/i }).click()
  await expect(page).toHaveURL(/\/login/)
  const depois = await page.evaluate(() => ({
    token: localStorage.getItem('token'),
    theme: localStorage.getItem('theme'),
  }))
  expect(depois.token).toBeNull()          // credencial removida
  expect(depois.theme).toBe(temaAntes)     // preferência de UI preservada (não é sessão)
})

test('sessão expirada (401) derruba para o login guardando a rota', async ({ auth: page }) => {
  await page.goto('/machines')
  // Força o 401 na rede em vez de plantar um token inválido: assim o teste verifica o CONTRATO
  // ("a API disse 401 → o app manda para o login preservando a rota") sem depender de o navegador
  // reusar ou não respostas em cache — o que tornava o teste intermitente.
  await page.route('**/api/**', (route) => route.fulfill({
    status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Token expirado' }),
  }))
  // O redirecionamento é tão imediato que aborta a navegação em curso (`ERR_ABORTED`) — tanto o
  // reload quanto um `waitForURL` (que espera o evento `load`). Observar a URL por polling evita
  // depender de eventos de navegação que legitimamente não completam.
  await page.reload().catch(() => {})
  await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(/\/login/)
  expect(decodeURIComponent(new URL(page.url()).searchParams.get('next') || '')).toContain('/machines')
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull()   // credencial descartada
})
