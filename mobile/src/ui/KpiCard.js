import { View, Text, StyleSheet } from 'react-native'
import { theme, space, radius } from '../theme'

// Cartão de indicador da frota. `tone` pinta o número e a barra pela severidade semântica
// (ok=verde, warn=âmbar, neutral=texto). `total` habilita o "X/Y" e a barra de proporção.
// Todo o cartão é um nó de acessibilidade único ("Online, 8 de 10").
const TONES = {
  ok: theme.primary,
  warn: theme.warning,
  danger: theme.danger,
  neutral: theme.text,
}

export default function KpiCard({ label, value, total, tone = 'neutral' }) {
  const color = TONES[tone] || theme.text
  const pct = total ? Math.max(0, Math.min(1, value / total)) : null
  const a11y = total != null ? `${label}: ${value} de ${total}` : `${label}: ${value}`

  return (
    <View style={styles.card} accessibilityLabel={a11y}>
      <Text style={styles.value}>
        <Text style={{ color }}>{value}</Text>
        {total != null ? <Text style={styles.total}>/{total}</Text> : null}
      </Text>
      <Text style={styles.label}>{label}</Text>
      {pct != null ? (
        <View style={styles.bar}>
          <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
    borderRadius: radius.md, padding: space.md - 4,
  },
  value: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  total: { fontSize: 13, color: theme.muted, fontWeight: '700' },
  label: { color: theme.muted, fontSize: 11, fontWeight: '600', marginTop: space.sm - 2 },
  bar: { height: 3, borderRadius: 2, marginTop: space.sm + 1, backgroundColor: theme.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
})
