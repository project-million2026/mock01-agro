import { api } from './client'

// Contratos do backend consumidos pelo app (paths reais verificados em api/dashboard.py,
// montado sob /api). Um único lugar para os endpoints, como no web.
export const getStats = () => api('/api/dashboard/stats')
export const getOpenAlerts = () => api('/api/dashboard/alerts')     // { alerts: [...] } (status='open')
