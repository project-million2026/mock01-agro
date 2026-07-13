'use client'
import { useEffect, useRef } from 'react'

export default function MapView({ positions = [], farms = [], fields = [], buildings = [], height = 420 }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const hasFitBoundsRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const tryInit = () => {
      if (cancelled) return
      const L = typeof window !== 'undefined' ? window.L : null
      if (!L || !containerRef.current) { setTimeout(tryInit, 200); return }
      if (mapRef.current) return
      const map = L.map(containerRef.current, { zoomControl: true, wheelPxPerZoomLevel: 150, wheelDebounceTime: 150, zoomDelta: 1, zoomSnap: 1 }).setView([-10.1843, -48.3336], 6)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)
      mapRef.current = map
    }
    tryInit()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const L = typeof window !== 'undefined' ? window.L : null
    if (!L || !mapRef.current) return
    // Clear existing markers
    markersRef.current.forEach(m => mapRef.current.removeLayer(m))
    markersRef.current = []
    const bounds = []
    
    // Draw polygons
    const drawPolygons = (items, color) => {
      if (!Array.isArray(items)) return
      items.forEach(item => {
        if (item.polygon && Array.isArray(item.polygon) && item.polygon.length >= 3) {
          const latlngs = item.polygon
          const polygon = L.polygon(latlngs, { color, weight: 2, fillOpacity: 0.15 }).addTo(mapRef.current)
          polygon.bindPopup(`
            <div style="font-family:system-ui;font-size:12px;color:#111">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${item.name || item.code || 'Área'}</div>
              <div><b>Área:</b> ${item.area} ha</div>
            </div>
          `)
          markersRef.current.push(polygon)
          latlngs.forEach(ll => bounds.push(ll))
        }
      })
    }

    drawPolygons(farms, '#3b82f6') // Blue for farms
    drawPolygons(fields, '#22c55e') // Green for fields
    drawPolygons(buildings, '#a855f7') // Purple for buildings

    positions.forEach(p => {
      const lat = p?.lastStatus?.latitude ?? p?.latitude
      const lng = p?.lastStatus?.longitude ?? p?.longitude
      if (typeof lat !== 'number' || typeof lng !== 'number') return
      const color = p.online ? '#22c55e' : '#ef4444'
      const icon = L.divIcon({
        className: 'machine-marker',
        html: `<div style="position:relative;width:24px;height:24px;">
          <div style="position:absolute;inset:0;border-radius:9999px;background:${color};opacity:0.35;animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position:absolute;inset:6px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 0 8px ${color};"></div>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      const rawSpeed = p?.lastStatus?.speed ?? p?.speed ?? 0
      const rawFuel = p?.lastStatus?.fuelLevel ?? p?.fuelLevel ?? null
      const speed = typeof rawSpeed === 'number' ? rawSpeed.toFixed(1) : rawSpeed
      const fuel = typeof rawFuel === 'number' ? rawFuel.toFixed(1) : '-'
      const rpm = p?.lastStatus?.engineRpm ?? p?.engineRpm ?? '-'
      const operator = p?.lastStatus?.operatorRFID ?? p?.operatorRFID ?? '—'
      const ts = p?.lastStatus?.timestamp ?? p?.timestamp
      const updated = ts ? new Date(ts).toLocaleString('pt-BR') : '—'
      const opStatus = p.operationStatus === 'trabalhando' ? '🛠️ Trabalhando' : p.operationStatus === 'suspensa' ? '⏸️ Suspensa' : p.operationStatus === 'deslocamento' ? '🚚 Deslocamento' : '—'
      const marker = L.marker([lat, lng], { icon }).addTo(mapRef.current)
      marker.bindPopup(`
        <div style="font-family:system-ui;font-size:12px;min-width:180px;color:#111">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;">🚜 ${p.fleetNumber}</div>
          <div><b>Status:</b> <span style="color:${color}">${p.online ? 'ONLINE' : 'OFFLINE'}</span></div>
          <div><b>Operação:</b> ${opStatus}</div>
          <div><b>Velocidade:</b> ${speed} km/h</div>
          <div><b>RPM:</b> ${rpm}</div>
          <div><b>Combustível:</b> ${fuel}%</div>
          <div><b>Operador:</b> ${operator}</div>
          <div><b>Última atualização:</b> ${updated}</div>
        </div>
      `)
      markersRef.current.push(marker)
      bounds.push([lat, lng])
    })
    if (bounds.length > 0 && !hasFitBoundsRef.current) {
      try { 
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 })
        hasFitBoundsRef.current = true
      } catch {}
    }
  }, [positions, farms, fields, buildings])

  return (
    <>
      <style jsx global>{`
        @keyframes ping { 75%,100% { transform: scale(2); opacity: 0; } }
        .leaflet-container { background: #0b1220; border-radius: 12px; z-index: 0 !important; }
        .leaflet-popup-content-wrapper { border-radius: 8px; }
      `}</style>
      <div ref={containerRef} style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }} className="border border-border" />
    </>
  )
}
