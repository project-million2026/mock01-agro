// Jest com o preset do Expo (transforma RN/expo, mocks nativos). `errorMessage` e outros utilitários
// puros são o alvo principal dos testes de unidade — paridade com o vitest do web.
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|expo-router|@react-native-async-storage))',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
}
