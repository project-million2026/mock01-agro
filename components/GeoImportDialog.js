'use client'

import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { api } from '@/lib/apiClient'

// Importa talhões/fazendas de origens de mercado (drone/Shapefile, Google Earth/KML, GeoJSON).
// Detecta os polígonos do arquivo, deixa revisar nome/área e cria os registros em lote.

// Anel GeoJSON [lng,lat] → [[lat,lng]] (contrato da API).
function ringToLatLng(feature) {
  const g = feature.geometry
  const ring = g.type === 'Polygon' ? g.coordinates[0]
    : (g.type === 'MultiPolygon' ? g.coordinates[0][0] : null)
  if (!ring || ring.length < 3) return null
  return ring.map(c => [c[1], c[0]])
}
function areaHa(poly) {
  let area = 0
  const R = 6378137, toRad = d => (d * Math.PI) / 180
  for (let i = 0; i < poly.length; i++) {
    const [la1, ln1] = poly[i]
    const [la2, ln2] = poly[(i + 1) % poly.length]
    area += toRad(ln2 - ln1) * (2 + Math.sin(toRad(la1)) + Math.sin(toRad(la2)))
  }
  return Math.abs(area) * R * R / 2 / 10000
}

export default function GeoImportDialog({ open, onOpenChange, kind, farms = [], onImported }) {
  const [items, setItems] = useState([])       // {name, polygon, area}
  const [defaultFarm, setDefaultFarm] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const close = (o) => { if (!o) { setItems([]); setDefaultFarm('') } onOpenChange(o) }

  const onFile = async (file) => {
    if (!file) return
    try {
      const { parseGeoFile } = await import('@/lib/geoUtils')
      const feats = await parseGeoFile(file)
      const parsed = feats.map((f, i) => {
        const poly = ringToLatLng(f)
        if (!poly) return null
        return {
          name: f.properties?.name || f.properties?.Name || `Área ${i + 1}`,
          polygon: poly, area: parseFloat(areaHa(poly).toFixed(2)),
        }
      }).filter(Boolean)
      if (parsed.length === 0) throw new Error('Nenhum polígono encontrado no arquivo.')
      setItems(parsed)
      toast.success(`${parsed.length} área(s) detectada(s) — confira e importe`)
    } catch (e) { toast.error(e.message || 'Erro ao ler o arquivo') }
    finally { if (fileRef.current) fileRef.current.value = '' }
  }

  const importAll = async () => {
    if (kind === 'field' && !defaultFarm) return toast.error('Selecione a fazenda de destino')
    setBusy(true)
    let ok = 0
    try {
      for (const it of items) {
        if (kind === 'field') {
          await api('/fields', { method: 'POST', body: JSON.stringify({ name: it.name, farm_id: defaultFarm, area: it.area, polygon: it.polygon }) })
        } else {
          await api('/farms', { method: 'POST', body: JSON.stringify({ name: it.name, total_area: it.area, polygon: it.polygon }) })
        }
        ok++
      }
      toast.success(`${ok} ${kind === 'field' ? 'talhão(ões)' : 'fazenda(s)'} importada(s)`)
      onImported?.(); close(false)
    } catch (e) { toast.error(`${e.message} — ${ok} importada(s) antes da falha`) }
    finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Importar {kind === 'field' ? 'Talhões' : 'Fazendas'} — Drone / Google Earth / GIS</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-dashed p-3 flex items-center gap-3">
            <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="flex-1 text-sm">
              <p className="font-medium">Selecione o arquivo georreferenciado</p>
              <p className="text-muted-foreground text-xs">Shapefile <code>.zip</code> (drone/ArcGIS/Agrocad), Google Earth <code>.kml</code> ou GeoJSON. O Shapefile é reprojetado pelo <code>.prj</code>.</p>
            </div>
            <input ref={fileRef} type="file" accept=".zip,.kml,.geojson,.json" className="max-w-[140px] text-xs" onChange={e => onFile(e.target.files?.[0])} />
          </div>

          {kind === 'field' && items.length > 0 && (
            <div className="space-y-1">
              <Label>Fazenda de destino</Label>
              <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={defaultFarm} onChange={e => setDefaultFarm(e.target.value)}>
                <option value="">Selecione…</option>
                {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

          {items.length > 0 && <p className="text-xs text-muted-foreground">{items.length} área(s) — ajuste os nomes se quiser:</p>}
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2 rounded border p-2">
              <Input value={it.name} onChange={e => setItems(arr => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="flex-1 h-8" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">{it.area} ha</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setItems(arr => arr.filter((_, j) => j !== i))}><X className="w-4 h-4 text-red-500" /></Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>Cancelar</Button>
          <Button onClick={importAll} disabled={busy || items.length === 0}>{busy ? 'Importando…' : `Importar ${items.length || ''}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
