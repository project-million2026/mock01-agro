import { toast } from 'sonner'

// Confirmação NÃO-bloqueante via toast (lateral direita), substituindo window.confirm.
// Uso: confirmToast('Excluir?', async () => { ...ação... })
export function confirmToast(message, onConfirm, { confirmLabel = 'Confirmar', description } = {}) {
  toast.warning(message, {
    description,
    duration: 12000,
    action: { label: confirmLabel, onClick: () => onConfirm() },
    cancel: { label: 'Cancelar', onClick: () => {} },
  })
}
