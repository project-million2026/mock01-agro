'use client'
import { useEffect, useRef } from 'react'

// Ícone (emoji) do prédio pelo tipo — "prédios devem ter ícones" (Oficina Inteligente, Fatia K).
function buildingEmoji(type) {
  const t = (type || '').toLowerCase()
  if (t.includes('ofic')) return '🔧'
  if (t.includes('galp') || t.includes('armaz')) return '🏭'
  if (t.includes('silo')) return '🌾'
  if (t.includes('escrit')) return '🏢'
  if (t.includes('posto') || t.includes('combust') || t.includes('abast')) return '⛽'
  if (t.includes('resid') || t.includes('casa') || t.includes('sede')) return '🏠'
  return '📍'
}

export default function MapView({ positions = [], farms = [], fields = [], buildings = [], focusedItem = null, height = 420 }) {
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
    
    try {
      // Clear existing markers
      markersRef.current.forEach(m => {
        try { mapRef.current.removeLayer(m) } catch(e){}
      })
      markersRef.current = []
      const bounds = []
      
      // Draw polygons
    const drawPolygons = (items, color, isBuilding = false) => {
      if (!Array.isArray(items)) return
      items.forEach(item => {
        if (item.polygon && Array.isArray(item.polygon) && item.polygon.length >= 3) {
          const latlngs = item.polygon
          const polygon = L.polygon(latlngs, { color, weight: 2, fillOpacity: 0.15 }).addTo(mapRef.current)
          
          let title = item.name || item.code || 'Área'
          let emoji = ''
          if (isBuilding) {
            emoji = buildingEmoji(item.type) + ' '
          }
          
          polygon.bindPopup(`
            <div style="font-family:system-ui;font-size:12px;color:#111">
              <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${emoji}${title}</div>
              <div><b>Área:</b> ${item.total_area || item.area || item.area_sqm || '0'} ${item.area_sqm ? 'm²' : 'ha'}</div>
            </div>
          `)
          markersRef.current.push(polygon)
          latlngs.forEach(ll => bounds.push(ll))
        }
      })
    }

    drawPolygons(farms, '#3b82f6') // Blue for farms
    drawPolygons(fields, '#22c55e') // Green for fields
    drawPolygons(buildings, '#a855f7', true) // Purple for buildings (quando têm polígono)

    // Prédios como marcadores padrão com ícone por tipo (quando NÃO têm polígono, apenas lat/lon).
    ;(buildings || []).forEach(b => {
      if (b.polygon && Array.isArray(b.polygon) && b.polygon.length >= 3) return // Já desenhado como polígono
      const lat = b.latitude, lng = b.longitude
      if (typeof lat !== 'number' || typeof lng !== 'number') return
      const emoji = buildingEmoji(b.type)
      
      const icon = L.divIcon({
        className: 'building-marker',
        html: `<div style="font-size: 24px; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.4));">${emoji}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
      
      const bm = L.marker([lat, lng], { icon }).addTo(mapRef.current)
      bm.bindPopup(`<div style="font-family:system-ui;font-size:12px;color:#111"><div style="font-weight:700;font-size:14px">${emoji} ${b.name || 'Prédio'}</div><div>${b.type || ''}</div></div>`)
      bm.bindTooltip(`${emoji} ${b.name || 'Prédio'}`)
      markersRef.current.push(bm)
      bounds.push([lat, lng])
    })

    positions.forEach(p => {
      try {
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
        const ignition = p?.lastStatus?.ignition ?? p?.ignition
        // Ignição OFF = Desligada (não só "parada"). Ligada mas ociosa = Parada; senão o status da operação.
        const opStatus = ignition === false ? '⛔ Desligada'
          : p.operationStatus === 'trabalhando' ? '🛠️ Trabalhando'
          : p.operationStatus === 'deslocamento' ? '🚚 Deslocamento'
          : p.operationStatus === 'suspensa' ? '⏸️ Parada'
          : ignition === true ? '⏸️ Parada' : '—'
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
      } catch(e) { console.error("Error drawing position marker:", e) }
    })
    if (bounds.length > 0 && !hasFitBoundsRef.current && !focusedItem) {
      try { 
        // maxZoom mais alto: aproxima mais (uma máquina sozinha ou agrupadas ficam bem visíveis).
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
        hasFitBoundsRef.current = true
      } catch {}
    }
    
    } catch(globalErr) {
      console.error("CRITICAL MAP RENDER ERROR:", globalErr)
    }
  }, [positions, farms, fields, buildings])

  useEffect(() => {
    const L = typeof window !== 'undefined' ? window.L : null
    if (!L || !mapRef.current || !focusedItem) return

    setTimeout(() => {
      try {
        if (focusedItem.polygon && Array.isArray(focusedItem.polygon) && focusedItem.polygon.length >= 3) {
          const poly = L.polygon(focusedItem.polygon)
          mapRef.current.fitBounds(poly.getBounds(), { padding: [40, 40], maxZoom: 16, animate: true, duration: 1.5 })
        } else if (typeof focusedItem.latitude === 'number' && typeof focusedItem.longitude === 'number') {
          mapRef.current.flyTo([focusedItem.latitude, focusedItem.longitude], 18, { duration: 1.5 })
        } else {
          console.warn("Item não possui polígono nem lat/lon cadastrados para focar.")
        }
      } catch (e) {
        console.error("Erro ao focar no item do mapa:", e)
      }
    }, 200)
  }, [focusedItem])

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
