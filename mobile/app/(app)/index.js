import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { useSession } from '../../src/auth/SessionProvider'
import { useDashboard } from '../../src/hooks/useDashboard'
import { theme, space, radius, font, MIN_TARGET } from '../../src/theme'
import Screen from '../../src/ui/Screen'
import SectionLabel from '../../src/ui/SectionLabel'
import KpiCard from '../../src/ui/KpiCard'
import AlertCard from '../../src/ui/AlertCard'
import { StaleBanner, EmptyCard } from '../../src/ui/Banner'
import { tapLight } from '../../src/ui/haptics'

// Home do gestor (F2): abre respondendo "o que preciso fazer agora?" — alertas que pedem ação
// e a frota em números. Dados reais de /dashboard/stats + /dashboard/alerts, com snapshot
// offline. Mapa e O.S. entram como seções próprias nas fases F3/F5 (sem seção-fantasma aqui).
export default function HomeScreen() {
  const { user } = useSession()
  const { stats, alerts, loading, refreshing, stale, error, updatedAt, refresh } = useDashboard()

  const firstName = (user?.name || '').trim().split(/\s+/)[0] || '—'
  const initial = (user?.name || '?').trim().charAt(0).toUpperCase()
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })

  // Carga inicial sem nenhum dado (nem snapshot) → spinner. Erro sem dado → mensagem + tentar.
  if (loading && !stats) {
    return (
      <Screen>
        <View style={styles.center}><ActivityIndicator color={theme.primary} /></View>
      </Screen>
    )
  }
  if (error && !stats) {
    return (
      <Screen onRefresh={refresh} refreshing={refreshing}>
        <Header name={firstName} initial={initial} today={today} />
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => { tapLight(); refresh() }} style={styles.retry} accessibilityRole="button" accessibilityLabel="Tentar novamente">
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      </Screen>
    )
  }

  const online = stats?.online ?? 0
  const machines = stats?.machines ?? 0
  const offline = stats?.offline ?? 0
  const topAlert = alerts[0]
  const moreAlerts = Math.max(0, alerts.length - 1)

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Header name={firstName} initial={initial} today={today} />
      {stale ? <StaleBanner updatedAt={updatedAt} /> : null}

      <SectionLabel>Precisa de atenção</SectionLabel>
      {topAlert ? (
        <>
          <AlertCard alert={topAlert} />
          {moreAlerts > 0 ? (
            <Text style={styles.moreAlerts}>
              + {moreAlerts} {moreAlerts === 1 ? 'outro alerta aberto' : 'outros alertas abertos'}
            </Text>
          ) : null}
        </>
      ) : (
        <EmptyCard>Nenhum alerta aberto ✓</EmptyCard>
      )}

      <SectionLabel>Frota agora</SectionLabel>
      <View style={styles.kpis}>
        <KpiCard label="Online" value={online} total={machines} tone="ok" />
        <KpiCard label="Paradas" value={offline} tone={offline > 0 ? 'warn' : 'neutral'} />
        <KpiCard label="Alertas" value={alerts.length} tone={alerts.length > 0 ? 'danger' : 'neutral'} />
      </View>

    </Screen>
  )
}

function Header({ name, initial, today }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.hello}>Olá, {name}</Text>
        <Text style={styles.sub}>{today}</Text>
      </View>
      <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { paddingVertical: space.xxl, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.sm },
  headerText: { flex: 1 },
  hello: { color: theme.text, fontSize: font.title, fontWeight: '800', letterSpacing: -0.3 },
  sub: { color: theme.muted, fontSize: font.small, marginTop: 3, textTransform: 'capitalize' },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center', marginLeft: space.md,
  },
  avatarText: { color: theme.primaryInk, fontSize: 15, fontWeight: '800' },

  moreAlerts: { color: theme.muted, fontSize: font.small, textAlign: 'center', paddingVertical: space.sm },

  kpis: { flexDirection: 'row', gap: space.sm + 1 },

  errorBox: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: radius.md,
    padding: space.md, gap: space.md, alignItems: 'center',
  },
  errorText: { color: theme.muted, fontSize: font.body, textAlign: 'center', lineHeight: 20 },
  retry: {
    minHeight: MIN_TARGET, justifyContent: 'center', paddingHorizontal: space.lg,
    borderRadius: radius.sm, backgroundColor: theme.primary,
  },
  retryText: { color: theme.primaryInk, fontSize: font.body, fontWeight: '700' },

})
