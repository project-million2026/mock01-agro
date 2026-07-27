import { useState, useEffect } from 'react'
import { Text, TextInput, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSession } from '../src/auth/SessionProvider'
import { theme } from '../src/theme'

export default function LoginScreen() {
  const router = useRouter()
  const { status, login } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Já autenticado (sessão restaurada) → segue para o app.
  useEffect(() => { if (status === 'authed') router.replace('/') }, [status, router])

  const submit = async () => {
    setError(''); setBusy(true)
    try {
      await login(email.trim(), password)
      router.replace('/')
    } catch (e) {
      setError(e.message)   // já legível: conexão × credencial × técnico (errorMessage)
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <Text style={styles.brand}>Agro Telemetria</Text>
        <Text style={styles.subtitle}>Entre para acompanhar sua frota</Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input} value={email} onChangeText={setEmail}
          autoCapitalize="none" keyboardType="email-address" autoComplete="email"
          placeholder="voce@empresa.com" placeholderTextColor={theme.muted}
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input} value={password} onChangeText={setPassword}
          secureTextEntry autoCapitalize="none" placeholder="••••••••" placeholderTextColor={theme.muted}
          onSubmitEditing={submit}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.button, busy && styles.buttonBusy]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#04120a" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  brand: { color: theme.primary, fontSize: 30, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: theme.muted, fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 32 },
  label: { color: theme.text, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, color: theme.text, fontSize: 16,
  },
  error: { color: theme.danger, fontSize: 14, marginTop: 16 },
  button: {
    backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 14, marginTop: 28,
    alignItems: 'center',
  },
  buttonBusy: { opacity: 0.7 },
  buttonText: { color: '#04120a', fontSize: 16, fontWeight: '700' },
})
