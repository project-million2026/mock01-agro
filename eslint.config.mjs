import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    // e2e/ são testes Playwright (Node), não código React — a regra react-hooks confunde o
    // `await use(page)` dos fixtures com um Hook. Rodam pelo próprio `yarn test:e2e`.
    // mobile/ é um app Expo com config ESLint própria (eslint-config-expo) — não deve ser varrido
    // pelas regras do Next do web. Roda pelo seu próprio `yarn lint` no job mobile do CI.
    ignores: [".venv/**", "coverage/**", "python-backend/**", "tests/local-layer/**",
              "e2e/**", "playwright.config.js", "test-results/**", "playwright-report/**",
              "mobile/**"],
  },
];

export default config;
