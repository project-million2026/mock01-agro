import { View, Text, Pressable, StyleSheet } from 'react-native'
import { theme, space, radius, MIN_TARGET } from '../theme'
import { tapLight } from './haptics'

// "há 6 min", "há 2 h", "ontem" — tempo relativo curto em pt-BR a partir de um ISO.
export function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (s < 60) return 'agora'
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}

// Alerta em destaque na Home (o que "precisa de atenção"). Cor de severidade, título humano
// (message do backend), máquina e tempo relativo. Vira pressável só quando há `onPress` (a
// navegação para a tela de alertas chega na F4) — sem toque que não leva a lugar nenhum.
export default function AlertCard({ alert, onPress }) {
  const title = alert.message || alert.type || 'Alerta'
  const machine = alert.fleet_number != null ? `Máquina ${alert.fleet_number}` : null
  const when = timeAgo(alert.created_at)
  const untreated = (alert.status || 'open') === 'open'
  const meta = [when, untreated ? 'não tratado' : null].filter(Boolean).join(' · ')
  const a11yLabel = `Alerta: ${title}. ${machine || ''}. ${meta}`

  const inner = (
    <>
      <View style={styles.dot} />
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {machine ? <Text style={styles.sub}>{machine}</Text> : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
    </>
  )

  if (!onPress) {
    return <View style={styles.card} accessibilityLabel={a11yLabel}>{inner}</View>
  }
  return (
    <Pressable
      onPress={() => { tapLight(); onPress(alert) }}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {inner}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', gap: space.md - 4, alignItems: 'flex-start',
    minHeight: MIN_TARGET, padding: space.md - 2,
    borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(244,63,94,0.35)',
    backgroundColor: 'rgba(244,63,94,0.08)',
  },
  pressed: { opacity: 0.7 },
  dot: {
    width: 10, height: 10, borderRadius: 5, marginTop: 5, backgroundColor: theme.danger,
  },
  body: { flex: 1 },
  title: { color: theme.text, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  sub: { color: theme.muted, fontSize: 12, marginTop: 3 },
  meta: { color: '#fda4b4', fontSize: 11, fontWeight: '700', marginTop: 6 },
})
