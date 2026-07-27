import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    // Alias '@/' → raiz do projeto (mesmo do Next.js/jsconfig).
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['__tests__/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      reportsDirectory: 'coverage/vitest',
      // Cobertura escopada aos módulos de lógica testável (o resto é UI validada via E2E/browser).
      include: ['lib/apiClient.js', 'lib/geoUtils.js'],
      // Piso anti-regressão. geoUtils tem caminhos SHP (binário) sem fixture — o resto coberto.
      thresholds: { statements: 55, branches: 50, functions: 55, lines: 55 },
    },
  },
})
