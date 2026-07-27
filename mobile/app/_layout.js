import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SessionProvider } from '../src/auth/SessionProvider'
import { theme } from '../src/theme'

// Layout raiz: providers globais (sessão) + navegação em pilha. O grupo (app) é protegido pelo
// seu próprio AuthGate; /login fica fora dele.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(app)" />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  )
}
