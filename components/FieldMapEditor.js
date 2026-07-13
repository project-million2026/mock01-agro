'use client'
import { useEffect, useRef } from 'react'

// Allows drawing/editing a single polygon. onChange receives polygon as [[lat,lng],...] and computed area (ha).
export default function FieldMapEditor({ initialPolygon = [], existingFields = [], onChange, height = 460 }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const drawnRef = useRef(null)
  const existingLayerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const tryInit = () => {
      if (cancelled) return
      const L = typeof window !== 'undefined' ? window.L : null
      if (!L || !L.Control?.Draw || !containerRef.current) { setTimeout(tryInit, 200); return }
      if (mapRef.current) return

      const map = L.map(containerRef.current, { wheelPxPerZoomLevel: 150, wheelDebounceTime: 150, zoomDelta: 1, zoomSnap: 1 }).setView([-10.1843, -48.3336], 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map)

      const drawnItems = new L.FeatureGroup()
      map.addLayer(drawnItems)
      drawnRef.current = drawnItems

      const existingLayer = new L.FeatureGroup()
      map.addLayer(existingLayer)
      existingLayerRef.current = existingLayer

      const drawControl = new L.Control.Draw({
        position: 'topright',
        draw: {
          polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: '#22c55e', weight: 3 } },
          polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false,
        },
        edit: { featureGroup: drawnItems, remove: true },
      })
      map.addControl(drawControl)

      const computeAndEmit = (layer) => {
        const latlngs = layer.getLatLngs()[0]
        const polygon = latlngs.map(p => [p.lat, p.lng])
        // Shoelace area
        let area = 0
        const R = 6378137, toRad = d => (d * Math.PI) / 180
        for (let i = 0; i < polygon.length; i++) {
          const [la1, ln1] = polygon[i]
          const [la2, ln2] = polygon[(i + 1) % polygon.length]
          area += toRad(ln2 - ln1) * (2 + Math.sin(toRad(la1)) + Math.sin(toRad(la2)))
        }
        const ha = (Math.abs(area) * R * R) / 2 / 10000
        onChange?.({ polygon, areaHa: parseFloat(ha.toFixed(2)) })
      }

      map.on(L.Draw.Event.CREATED, (e) => {
        drawnItems.clearLayers()
        drawnItems.addLayer(e.layer)
        computeAndEmit(e.layer)
      })
      map.on(L.Draw.Event.EDITED, (e) => {
        e.layers.eachLayer(l => computeAndEmit(l))
      })
      map.on(L.Draw.Event.DELETED, () => onChange?.({ polygon: [], areaHa: 0 }))

      mapRef.current = map

      // Draw initial polygon if any
      if (initialPolygon?.length >= 3) {
        const poly = L.polygon(initialPolygon, { color: '#22c55e', weight: 3 })
        drawnItems.addLayer(poly)
        try { map.fitBounds(poly.getBounds(), { padding: [20, 20] }) } catch {}
      }
    }
    tryInit()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update existing fields layer
  useEffect(() => {
    const L = typeof window !== 'undefined' ? window.L : null
    if (!L || !existingLayerRef.current) return
    existingLayerRef.current.clearLayers()
    existingFields.forEach(f => {
      if (Array.isArray(f.polygon) && f.polygon.length >= 3) {
        const poly = L.polygon(f.polygon, { color: '#3b82f6', weight: 2, fillOpacity: 0.15, dashArray: '5,5' })
        poly.bindTooltip(`${f.name} (${f.area || 0} ha)`, { permanent: false })
        existingLayerRef.current.addLayer(poly)
      }
    })
  }, [existingFields])

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1 flex-1 min-w-[110px]">
          <label className="text-xs font-semibold text-muted-foreground">Lat Início</label>
          <input id="latStart" type="number" step="any" placeholder="-10.18" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" />
        </div>
        <div className="space-y-1 flex-1 min-w-[110px]">
          <label className="text-xs font-semibold text-muted-foreground">Lng Início</label>
          <input id="lngStart" type="number" step="any" placeholder="-48.33" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" />
        </div>
        <div className="space-y-1 flex-1 min-w-[110px]">
          <label className="text-xs font-semibold text-muted-foreground">Lat Fim</label>
          <input id="latEnd" type="number" step="any" placeholder="-10.19" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" />
        </div>
        <div className="space-y-1 flex-1 min-w-[110px]">
          <label className="text-xs font-semibold text-muted-foreground">Lng Fim</label>
          <input id="lngEnd" type="number" step="any" placeholder="-48.34" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" />
        </div>
        <button 
          onClick={() => {
            const lat1 = parseFloat(document.getElementById('latStart').value);
            const lng1 = parseFloat(document.getElementById('lngStart').value);
            const lat2 = parseFloat(document.getElementById('latEnd').value);
            const lng2 = parseFloat(document.getElementById('lngEnd').value);
            if(isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) return alert('Preencha todas as coordenadas');
            
            const poly = [
              [lat1, lng1],
              [lat1, lng2],
              [lat2, lng2],
              [lat2, lng1]
            ];
            
            const L = window.L;
            if (drawnRef.current && L) {
               drawnRef.current.clearLayers();
               const layer = L.polygon(poly, { color: '#22c55e', weight: 3 });
               drawnRef.current.addLayer(layer);
               try { mapRef.current.fitBounds(layer.getBounds(), { padding: [20, 20] }) } catch {}
               
               // trigger computeAndEmit
               const latlngs = layer.getLatLngs()[0];
               let area = 0;
               const R = 6378137, toRad = d => (d * Math.PI) / 180;
               for (let i = 0; i < poly.length; i++) {
                 const [la1, ln1] = poly[i];
                 const [la2, ln2] = poly[(i + 1) % poly.length];
                 area += toRad(ln2 - ln1) * (2 + Math.sin(toRad(la1)) + Math.sin(toRad(la2)));
               }
               const ha = (Math.abs(area) * R * R) / 2 / 10000;
               onChange?.({ polygon: poly, areaHa: parseFloat(ha.toFixed(2)) });
            }
          }}
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 flex-none w-full sm:w-auto mt-2 sm:mt-0"
        >
          Gerar Área
        </button>
      </div>
      <div ref={containerRef} style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden' }} className="border border-border relative isolate z-0" />
    </div>
  )
}
