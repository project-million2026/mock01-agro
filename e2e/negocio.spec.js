import { test, expect } from './fixtures.js'

/**
 * Fluxos de NEGÓCIO ponta a ponta: navegador → API → Postgres. Cobrem o que nem o vitest
 * (unidade) nem o pytest (API isolada) veem — a fiação completa entre tela, contrato e dados.
 */

test('ciclo da O.S.: criar → aprovar → fechar dá baixa no estoque', async ({ auth: page }) => {
  // Saldo da peça ANTES, lido pela própria API (a mesma fonte que a tela usa).
  const antes = await page.evaluate(async () => {
    const t = localStorage.getItem('token')
    const r = await fetch('/api/parts', { headers: { Authorization: `Bearer ${t}` } })
    const b = await r.json()
    const p = (b.items || []).find(x => x.sku === 'FLT-100')
    return { id: p?.id, qty: p?.quantity, cost: p?.unitCost }
  })
  expect(antes.id, 'a massa de teste precisa ter a peça FLT-100').toBeTruthy()

  // Cria a O.S. com 2 unidades da peça, aprova e fecha — pelo mesmo caminho que a tela usa.
  const resultado = await page.evaluate(async ({ partId, cost }) => {
    const t = localStorage.getItem('token')
    const h = { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    const criar = await fetch('/api/service-orders', {
      method: 'POST', headers: h,
      body: JSON.stringify({
        title: 'E2E — troca de filtro', fleetNumber: 'TR-001',
        items: [{ kind: 'part', description: 'Filtro', partId, quantity: 2, unitCost: cost }],
      }),
    })
    const os = await criar.json()
    const ap = await fetch(`/api/service-orders/${os.id}/approve`, { method: 'POST', headers: h })
    const aprovada = await ap.json()
    const fc = await fetch(`/api/service-orders/${os.id}/close`, { method: 'POST', headers: h })
    const fechada = await fc.json()
    return { id: os.id, statusAprovada: aprovada.status, statusFechada: fechada.status, custo: fechada.actualCost }
  }, { partId: antes.id, cost: antes.cost })

  expect(resultado.statusAprovada).toBe('aprovada')
  expect(resultado.statusFechada).toBe('fechada')
  expect(resultado.custo).toBeCloseTo(2 * antes.cost, 2)

  // O estoque tem de ter caído exatamente 2 — é a regra do service layer chegando ao banco.
  const depois = await page.evaluate(async () => {
    const t = localStorage.getItem('token')
    const r = await fetch('/api/parts', { headers: { Authorization: `Bearer ${t}` } })
    const b = await r.json()
    return (b.items || []).find(x => x.sku === 'FLT-100')?.quantity
  })
  expect(depois).toBeCloseTo(antes.qty - 2, 2)

  // E a O.S. aparece fechada na tela de Ordens de Serviço.
  await page.goto('/oficina?tab=os')
  await expect(page.getByText('E2E — troca de filtro').first()).toBeVisible()
})

test('regra de negócio bloqueada mostra o MOTIVO explícito (estoque insuficiente)', async ({ auth: page }) => {
  const erro = await page.evaluate(async () => {
    const t = localStorage.getItem('token')
    const h = { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    const parts = await (await fetch('/api/parts', { headers: h })).json()
    const p = (parts.items || []).find(x => x.sku === 'ROL-440')      // nasce com saldo baixo
    const os = await (await fetch('/api/service-orders', {
      method: 'POST', headers: h,
      body: JSON.stringify({
        title: 'E2E — estoque insuficiente', fleetNumber: 'TR-001',
        items: [{ kind: 'part', description: 'Rolamento', partId: p.id, quantity: 9999, unitCost: p.unitCost }],
      }),
    })).json()
    await fetch(`/api/service-orders/${os.id}/approve`, { method: 'POST', headers: h })
    const r = await fetch(`/api/service-orders/${os.id}/close`, { method: 'POST', headers: h })
    return { status: r.status, detail: (await r.json()).detail }
  })
  expect(erro.status).toBe(409)                       // conflito de regra, não erro técnico
  expect(erro.detail).toContain('Estoque insuficiente')
  expect(erro.detail).toMatch(/há .* pedido/)         // diz quanto há e quanto foi pedido
})

test('relatórios de cruzamento carregam com a massa de teste', async ({ auth: page }) => {
  await page.goto('/reports')
  await expect(page.getByText(/Confiabilidade & Custo/i).first()).toBeVisible()
  await expect(page.getByText(/Reincidência/i).first()).toBeVisible()
  // % corretiva precisa vir preenchida (a massa tem 30 preventivas × 30 corretivas).
  await expect(page.getByText('%').first()).toBeVisible()
})

test('peças por km calcula a partir do km do GPS e do consumo', async ({ auth: page }) => {
  const dados = await page.evaluate(async () => {
    const t = localStorage.getItem('token')
    const r = await fetch('/api/kpis/parts-per-km?days=90', { headers: { Authorization: `Bearer ${t}` } })
    return r.json()
  })
  expect(dados.machines.length).toBeGreaterThan(0)
  const m = dados.machines[0]
  expect(m.distanceKm).toBeGreaterThan(0)             // km veio do rollup do worker
  expect(m.partsQty).toBeGreaterThan(0)               // consumo veio da baixa da O.S.
  expect(m.kmPerPart).toBeGreaterThan(0)              // e o cruzamento produziu a razão

  await page.goto('/oficina?tab=pecas-km')
  await expect(page.getByPlaceholder(/Buscar peça/i)).toBeVisible()
})

test('busca do estoque filtra por nome e por código', async ({ auth: page }) => {
  await page.goto('/oficina?tab=estoque')
  const busca = page.getByPlaceholder(/Buscar por nome, SKU/i)
  await expect(busca).toBeVisible()
  await busca.fill('FLT-100')                          // busca por código
  await expect(page.getByText('Filtro de óleo').first()).toBeVisible()
  await busca.fill('correia')                          // busca por nome
  await expect(page.getByText(/Correia do motor/i).first()).toBeVisible()
})

test('exportação de relatório baixa a planilha', async ({ auth: page }) => {
  await page.goto('/reports')
  // Escopo no card certo: o primeiro "Excel" da página pertence ao Histórico de Rotas, que exige
  // frota selecionada — clicar nele dá erro de validação, não download.
  const card = page.locator('.glow-card').filter({ hasText: 'Confiabilidade & Custo (planilha)' })
  await expect(card).toBeVisible()
  const download = page.waitForEvent('download', { timeout: 30_000 })
  await card.getByRole('button', { name: /excel/i }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/\.xlsx$/)
})
