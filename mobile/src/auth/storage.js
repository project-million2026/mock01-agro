import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'

// O TOKEN vai no SecureStore (cifrado pela plataforma); o objeto `user` (nome/e-mail/role, não é
// segredo) vai no AsyncStorage. Assim como no web, o logout remove só a credencial — preferências
// de UI não são sessão.
const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export const getToken = () => SecureStore.getItemAsync(TOKEN_KEY)
export const setToken = (t) => SecureStore.setItemAsync(TOKEN_KEY, t)

export const getUser = async () => {
  const raw = await AsyncStorage.getItem(USER_KEY)
  try { return raw ? JSON.parse(raw) : null } catch { return null }
}
export const setUser = (u) => AsyncStorage.setItem(USER_KEY, JSON.stringify(u))

export const saveSession = async (token, user) => {
  await setToken(token)
  if (user) await setUser(user)
}

export const clearCredentials = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await AsyncStorage.removeItem(USER_KEY)
}
