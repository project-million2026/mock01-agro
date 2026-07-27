import { View, Text, Pressable, StyleSheet } from 'react-native'
import Constants from 'expo-constants'
import { useSession } from '../../src/auth/SessionProvider'
import { theme, space, radius, font, MIN_TARGET } from '../../src/theme'
import Screen from '../../src/ui/Screen'
import SectionLabel from '../../src/ui/SectionLabel'
import { tapLight } from '../../src/ui/haptics'

// Aba Ajustes: identidade da conta, plano/módulos e o logout (que saiu da Home). Cresce nas
// próximas fases (status do push na F6). Sem ação de risco além de sair.
export default function SettingsScreen() {
  const { user, features, plan, logout } = useSession()
  const version = Constants.expoConfig?.version || '—'

  return (
    <Screen>
      <Text style={styles.title}>Ajustes</Text>

      <SectionLabel>Conta</SectionLabel>
      <View style={styles.card}>
        <Row label="Nome" value={user?.name} />
        <Row label="E-mail" value={user?.email} />
        <Row label="Perfil" value={user?.role} last />
      </View>

      <SectionLabel>Plano</SectionLabel>
      <View style={styles.card}>
        <Row label="Plano" value={plan} />
        <Row label="Módulos" value={(features || []).length ? features.join(', ') : '—'} last />
      </View>

      <Pressable
        onPress={() => { tapLight(); logout() }}
        style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
        accessibilityRole="button" accessibilityLabel="Sair da conta"
      >
        <Text style={styles.logoutText}>Sair da conta</Text>
      </Pressable>

      <Text style={styles.version}>Versão {version}</Text>
    </Screen>
  )
}

function Row({ label, value, last }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value || '—'}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  title: { color: theme.text, fontSize: font.title, fontWeight: '800', letterSpacing: -0.3, paddingVertical: space.sm },
  card: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
    borderRadius: radius.lg, paddingHorizontal: space.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, paddingVertical: space.md - 2 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  rowLabel: { color: theme.muted, fontSize: font.body },
  rowValue: { color: theme.text, fontSize: font.body, fontWeight: '600', flexShrink: 1, textAlign: 'right', textTransform: 'capitalize' },
  logout: {
    minHeight: MIN_TARGET, justifyContent: 'center', alignItems: 'center', marginTop: space.lg,
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.35)', borderRadius: radius.md,
    backgroundColor: 'rgba(244,63,94,0.08)',
  },
  pressed: { opacity: 0.7 },
  logoutText: { color: theme.danger, fontSize: font.body, fontWeight: '700' },
  version: { color: theme.muted, fontSize: font.small, textAlign: 'center', paddingVertical: space.lg },
})
