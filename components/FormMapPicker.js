'use client'
import { useEffect, useRef } from 'react'

export default function FormMapPicker({ lat, lng, onChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const tryInit = () => {
      if (cancelled) return
      const L = typeof window !== 'undefined' ? window.L : null
      if (!L || !containerRef.current) { setTimeout(tryInit, 200); return }
      if (mapRef.current) return

      const initialLat = lat || -10.1843
      const initialLng = lng || -48.3336

      const map = L.map(containerRef.current, { wheelPxPerZoomLevel: 150, wheelDebounceTime: 150, zoomDelta: 1, zoomSnap: 1 }).setView([initialLat, initialLng], lat ? 15 : 4)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map)
      
      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map)
      markerRef.current = marker

      marker.on('dragend', (e) => {
        const p = e.target.getLatLng()
        onChange?.(parseFloat(p.lat.toFixed(5)), parseFloat(p.lng.toFixed(5)))
      })

      map.on('click', (e) => {
        marker.setLatLng(e.latlng)
        onChange?.(parseFloat(e.latlng.lat.toFixed(5)), parseFloat(e.latlng.lng.toFixed(5)))
      })

      mapRef.current = map
    }
    tryInit()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (mapRef.current && markerRef.current && lat && lng) {
      markerRef.current.setLatLng([lat, lng])
      mapRef.current.setView([lat, lng])
    }
  }, [lat, lng])

  return <div ref={containerRef} style={{ height: 250, width: '100%', borderRadius: 8, overflow: 'hidden' }} className="border border-border" />
}
