import { defineConfig, devices } from '@playwright/test'

/**
 * E2E de ponta a ponta: navegador real → Next (dev/standalone) → API FastAPI → Postgres com a
 * massa de teste do `seed.py`. Diferente do vitest (unidade) e do pytest (integração de API),
 * aqui o que se verifica é o sistema INTEIRO montado — é o único nível que pega regressão de
 * navegação, de fiação de props entre rota e página, e de contrato entre front e back.
 *
 * Pré-requisitos (o teste falha com mensagem clara se faltar):
 *   1. stack de API+banco no ar (docker compose demo) com a massa carregada (`python seed.py`);
 *   2. frontend em http://localhost:3001 — o webServer abaixo sobe sozinho se não estiver.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,        // a massa é compartilhada; testes que escrevem não podem colidir
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3001',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx next dev --port 3001',
    url: 'http://localhost:3001/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
