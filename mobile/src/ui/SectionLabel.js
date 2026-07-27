import { View, Text, Pressable, StyleSheet } from 'react-native'
import { theme, space, font, MIN_TARGET } from '../theme'
import { tapLight } from './haptics'

// Rótulo de seção da Home ("Precisa de atenção", "Frota agora"...) com uma ação opcional à
// direita ("Ver mapa →"). A ação é um alvo de toque acessível (role/label/haptic).
export default function SectionLabel({ children, action, onAction }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label} accessibilityRole="header">{children}</Text>
      {action ? (
        <Pressable
          onPress={() => { tapLight(); onAction?.() }}
          hitSlop={space.sm}
          accessibilityRole="button"
          accessibilityLabel={action}
          style={styles.action}
        >
          <Text style={styles.actionText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm },
  label: {
    color: theme.muted, fontSize: font.section, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  action: { minHeight: MIN_TARGET, justifyContent: 'center', paddingLeft: space.md },
  actionText: { color: theme.primary, fontSize: font.small, fontWeight: '600' },
})
