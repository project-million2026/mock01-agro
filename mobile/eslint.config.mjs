// Flat config do ESLint para o app Expo. Usa o preset oficial do Expo (RN + hooks) — não o do
// Next, que vale só para o web. O `eslint .` da RAIZ ignora `mobile/**` (ele roda esta config aqui).
import expoConfig from 'eslint-config-expo/flat.js'

export default [
  ...expoConfig,
  { ignores: ['node_modules/**', '.expo/**', 'dist/**', 'android/**', 'ios/**'] },
  {
    // Arquivos de teste/setup do Jest — globais `jest`, `describe`, `it`, `expect`.
    files: ['**/*.test.js', 'jest.setup.js'],
    languageOptions: {
      globals: {
        jest: 'readonly', describe: 'readonly', it: 'readonly', test: 'readonly',
        expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly',
        beforeAll: 'readonly', afterAll: 'readonly',
      },
    },
  },
]
