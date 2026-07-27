import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getStats, getOpenAlerts } from '../api/endpoints'

// Offline-lite (leitura): a Home abre com o último snapshot salvo e revalida por trás. Se a rede
// falhar, mantém o snapshot com a faixa "dados de HH:MM" em vez de tela vazia. SEM fila de
// mutações — ações de autoridade (tratar/aprovar) continuam exigindo rede.
const SNAP_KEY = 'dashboard:snapshot'

export function useDashboard() {
  const [data, setData] = useState(null)       // { stats, alerts }
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true) // carga inicial (antes de qualquer dado)
  const [refreshing, setRefreshing] = useState(false)
  const [stale, setStale] = useState(false)    // mostrando snapshot por falha de rede
  const [error, setError] = useState(null)     // erro sem nenhum dado para mostrar

  const load = useCallback(async ({ initial = false } = {}) => {
    if (initial) setLoading(true); else setRefreshing(true)
    try {
      const [stats, alertsRes] = await Promise.all([getStats(), getOpenAlerts()])
      const fresh = { stats, alerts: alertsRes.alerts || [] }
      const now = Date.now()
      setData(fresh); setUpdatedAt(now); setStale(false); setError(null)
      AsyncStorage.setItem(SNAP_KEY, JSON.stringify({ data: fresh, at: now })).catch(() => {})
    } catch (e) {
      // Falhou: se já há algo em tela (snapshot ou carga anterior), marca stale; senão, erro.
      setData((prev) => {
        if (prev) { setStale(true); setError(null) }
        else setError(e.message)
        return prev
      })
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [])

  // Arranque: hidrata do snapshot salvo (instantâneo) e dispara a revalidação.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem(SNAP_KEY)
        if (alive && raw) {
          const { data: snap, at } = JSON.parse(raw)
          setData(snap); setUpdatedAt(at); setLoading(false)
        }
      } catch { /* snapshot corrompido: ignora */ }
      if (alive) load({ initial: true })
    })()
    return () => { alive = false }
  }, [load])

  const refresh = useCallback(() => load({ initial: false }), [load])

  return {
    stats: data?.stats || null,
    alerts: data?.alerts || [],
    loading, refreshing, stale, error, updatedAt, refresh,
  }
}
