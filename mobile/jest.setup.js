// Mocks de módulos nativos que não existem no ambiente de teste (Node). SecureStore/AsyncStorage
// são exercitados por testes de unidade da camada de sessão (F1).
jest.mock('expo-secure-store', () => {
  const store = {}
  return {
    getItemAsync: jest.fn(async (k) => (k in store ? store[k] : null)),
    setItemAsync: jest.fn(async (k, v) => { store[k] = v }),
    deleteItemAsync: jest.fn(async (k) => { delete store[k] }),
  }
})

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'))
