import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AuthGate from '../../src/auth/AuthGate'
import { theme } from '../../src/theme'

// Grupo autenticado: tudo passa pelo AuthGate. A barra de abas cresce a cada fase (Início/Ajustes
// agora; Mapa/Alertas/O.S. chegam nas F3/F4/F5) — só entram abas com tela real por trás.
export default function AppLayout() {
  return (
    <AuthGate>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.muted,
          tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
          sceneStyle: { backgroundColor: theme.bg },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Início',
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Ajustes',
            tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
          }}
        />
      </Tabs>
    </AuthGate>
  )
}
