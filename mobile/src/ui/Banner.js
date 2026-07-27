import { View, Text, StyleSheet } from 'react-native'
import { theme, space, radius } from '../theme'

// Faixa "dados de HH:MM" quando a tela mostra o último snapshot salvo (offline-lite) por não ter
// conseguido atualizar. Honesta sobre a idade do dado em vez de fingir que está fresco.
export function StaleBanner({ updatedAt }) {
  const hhmm = updatedAt
    ? new Date(updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null
  return (
    <View style={styles.stale} accessibilityLabel={`Sem conexão. Mostrando dados${hhmm ? ` de ${hhmm}` : ''}.`}>
      <Text style={styles.staleText}>
        Sem conexão · mostrando dados{hhmm ? ` de ${hhmm}` : ' salvos'}
      </Text>
    </View>
  )
}

// Estado vazio honesto (ex.: "Nenhum alerta aberto") — nunca um "em construção".
export function EmptyCard({ children }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  stale: {
    backgroundColor: 'rgba(245,158,11,0.12)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: radius.md, paddingVertical: space.sm, paddingHorizontal: space.md,
  },
  staleText: { color: theme.warning, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  empty: {
    borderWidth: 1, borderColor: theme.border, borderStyle: 'dashed', borderRadius: radius.md,
    paddingVertical: space.md, paddingHorizontal: space.md,
  },
  emptyText: { color: theme.muted, fontSize: 13, textAlign: 'center' },
})
