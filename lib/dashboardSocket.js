// Cliente WebSocket compartilhado do dashboard em tempo real (SPRINT-07).
// Um único socket para toda a app; componentes assinam via subscribeDashboard(fn) e filtram por
// msg.type ('position' | 'alert' | 'ready'). Autentica enviando o token na 1ª mensagem, reconecta
// com backoff exponencial e é best-effort — se cair, o polling lento das telas cobre (fallback).

let socket = null
let reconnectTimer = null
let backoff = 1000
const listeners = new Set()

function wsUrl() {
  // Em produção (atrás do nginx) o WS é same-origin /ws/dashboard. Em dev, defina
  // NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000 (o rewrite do Next não encaminha WebSocket).
  const base = process.env.NEXT_PUBLIC_WS_URL
  if (base) return `${base.replace(/\/$/, '')}/ws/dashboard`
  if (typeof window === 'undefined') return null
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/ws/dashboard`
}

function scheduleReconnect() {
  if (reconnectTimer || listeners.size === 0) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, backoff)
  backoff = Math.min(backoff * 2, 30000)
}

function connect() {
  if (socket || typeof window === 'undefined') return
  const url = wsUrl()
  const token = localStorage.getItem('token')
  if (!url || !token) return
  try {
    socket = new WebSocket(url)
  } catch {
    scheduleReconnect()
    return
  }
  socket.onopen = () => {
    backoff = 1000
    socket.send(JSON.stringify({ token }))
  }
  socket.onmessage = (e) => {
    let msg
    try { msg = JSON.parse(e.data) } catch { return }
    listeners.forEach((fn) => { try { fn(msg) } catch { /* isola um listener do outro */ } })
  }
  socket.onclose = () => {
    socket = null
    scheduleReconnect()
  }
  socket.onerror = () => {
    try { socket && socket.close() } catch { /* noop */ }
  }
}

export function subscribeDashboard(fn) {
  listeners.add(fn)
  if (!socket) connect()
  return () => {
    listeners.delete(fn)
    if (listeners.size === 0 && socket) {
      try { socket.close() } catch { /* noop */ }
      socket = null
    }
  }
}
