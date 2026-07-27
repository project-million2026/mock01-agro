// Feedback tátil das ações — eleva a percepção de qualidade (toque confirma que "pegou").
// Usa expo-haptics (roda no Expo Go, ao contrário do react-native-haptic-feedback nativo).
// Tudo em try/catch: haptics é enriquecimento, nunca pode derrubar a interação.
import * as Haptics from 'expo-haptics'

export const tapLight = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) } catch { /* noop */ }
}

export const tapMedium = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) } catch { /* noop */ }
}

// Sucesso de uma ação de autoridade (ex.: aprovar O.S., tratar alerta).
export const notifySuccess = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } catch { /* noop */ }
}

// Erro/bloqueio (ex.: 403, falha de validação).
export const notifyError = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error) } catch { /* noop */ }
}
