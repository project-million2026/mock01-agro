import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from './SessionProvider'
import { theme } from '../theme'

// Guarda das telas autenticadas — port do AuthGate do web. `loading` mostra spinner (sem flash de
// tela protegida); `anon` redireciona ao login; `authed` libera. Autoridade continua no backend.
export default function AuthGate({ children }) {
  const router = useRouter()
  const { status } = useSession()

  useEffect(() => {
    if (status === 'anon') router.replace('/login')
  }, [status, router])

  if (status !== 'authed') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    )
  }
  return children
}
