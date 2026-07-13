'use client'
import { useEffect, useRef } from 'react'

// Renders a machine route as polyline with start/end markers
export default function RouteMap({ points = [], fields = [], livePosition = null, height = 460 }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layersRef = useRef([])
  const hasFitBoundsRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const tryInit = () => {
      if (cancelled) return
      const L = typeof window !== 'undefined' ? window.L : null
      if (!L || !containerRef.current) { setTimeout(tryInit, 200); return }
      if (mapRef.current) return
      const map = L.map(containerRef.current, { wheelPxPerZoomLevel: 150, wheelDebounceTime: 150, zoomDelta: 1, zoomSnap: 1 }).setView([-10.1843, -48.3336], 8)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map)
      mapRef.current = map
    }
    tryInit()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const L = typeof window !== 'undefined' ? window.L : null
    if (!L || !mapRef.current) return
    // Clear old layers
    layersRef.current.forEach(l => mapRef.current.removeLayer(l))
    layersRef.current = []

    // Draw fields as background polygons
    fields.forEach(f => {
      if (Array.isArray(f.polygon) && f.polygon.length >= 3) {
        const poly = L.polygon(f.polygon, { color: '#3b82f6', weight: 2, fillOpacity: 0.1, dashArray: '5,5' })
        poly.bindTooltip(`${f.name}`)
        poly.addTo(mapRef.current)
        layersRef.current.push(poly)
      }
    })

    // if (points.length === 0) return
    const validPoints = points.filter(p => p.latitude != null && p.longitude != null)
    const coords = validPoints.map(p => [p.latitude, p.longitude])
    const line = L.polyline(coords, { color: '#22c55e', weight: 3, opacity: 0.85 }).addTo(mapRef.current)
    layersRef.current.push(line)

    // Start marker
    if (coords.length > 0) {
      const start = coords[0]
      const startMarker = L.marker(start, {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 8px #3b82f6"></div>`,
          iconSize: [18, 18], iconAnchor: [9, 9],
        }),
      }).bindPopup(`<b>Início</b><br/>${new Date(validPoints[0].timestamp).toLocaleString('pt-BR')}`).addTo(mapRef.current)
      layersRef.current.push(startMarker)
    }

    // End marker (current pos)
    const end = coords.length > 0 ? coords[coords.length - 1] : livePosition ? [livePosition.latitude, livePosition.longitude] : null
    const last = coords.length > 0 ? validPoints[validPoints.length - 1] : livePosition
    
    if (end && last) {
      const p = livePosition || last || {}
      const isOnline = p.online !== false // Default true if unknown
      const color = isOnline ? '#22c55e' : '#ef4444'
      const rawSpeed = p?.lastStatus?.speed ?? p?.speed ?? last?.speed ?? 0
      const rawFuel = p?.lastStatus?.fuelLevel ?? p?.fuelLevel ?? null
      const speed = typeof rawSpeed === 'number' ? rawSpeed.toFixed(1) : rawSpeed
      const fuel = typeof rawFuel === 'number' ? rawFuel.toFixed(1) : '-'
      const rpm = p?.lastStatus?.engineRpm ?? p?.engineRpm ?? '-'
      const operator = p?.lastStatus?.operatorRFID ?? p?.operatorRFID ?? '—'
      const ts = p?.lastStatus?.timestamp ?? p?.timestamp ?? last?.timestamp
      const updated = ts ? new Date(ts).toLocaleString('pt-BR') : '—'
      const opStatus = p.operationStatus === 'trabalhando' ? '🛠️ Trabalhando' : p.operationStatus === 'suspensa' ? '⏸️ Suspensa' : p.operationStatus === 'deslocamento' ? '🚚 Deslocamento' : '—'

      const endMarker = L.marker(end, {
        icon: L.divIcon({
          className: '',
          html: `<div style="position:relative;width:24px;height:24px">
            <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.35;animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite"></div>
            <div style="position:absolute;inset:6px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 8px ${color}"></div>
          </div>`,
          iconSize: [24, 24], iconAnchor: [12, 12],
        }),
      }).addTo(mapRef.current)
      
      endMarker.bindPopup(`
        <div style="font-family:system-ui;font-size:12px;min-width:180px;color:#111">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;">🚜 ${p.fleetNumber || 'Frota'}</div>
          <div><b>Status:</b> <span style="color:${color}">${isOnline ? 'ONLINE' : 'OFFLINE'}</span></div>
          <div><b>Operação:</b> ${opStatus}</div>
          <div><b>Velocidade:</b> ${speed} km/h</div>
          <div><b>RPM:</b> ${rpm}</div>
          <div><b>Combustível:</b> ${fuel}%</div>
          <div><b>Operador:</b> ${operator}</div>
          <div><b>Última atualização:</b> ${updated}</div>
        </div>
      `)
      layersRef.current.push(endMarker)
    }

    if (!hasFitBoundsRef.current) {
      if (coords.length > 0) {
        try { 
          mapRef.current.fitBounds(coords, { padding: [30, 30], maxZoom: 14 }) 
          hasFitBoundsRef.current = true
        } catch {}
      } else if (end) {
        try {
          mapRef.current.setView(end, 14)
          hasFitBoundsRef.current = true
        } catch {}
      }
    }
  }, [points, fields, livePosition])

  return (
    <div ref={containerRef} style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }} className="border border-border" />
  )
}
