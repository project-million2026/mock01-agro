import { ScrollView, RefreshControl, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme, space } from '../theme'

// Casca de tela padrão: fundo, área segura e scroll com pull-to-refresh. Centraliza o padding
// da grade 8pt para nenhuma tela reinventar layout. `edges` permite que telas com tab bar não
// dupliquem a inset de baixo.
export default function Screen({ children, onRefresh, refreshing = false, edges = ['top'] }) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh
            ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} colors={[theme.primary]} />
            : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  content: { padding: space.md, paddingBottom: space.xxl, gap: space.md },
})
