'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Building2, Plus, Trash2, MapPin, Pencil, Download, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { confirmToast } from '@/lib/confirmToast'
import { api } from '@/lib/apiClient'
import MapListPreview from '@/components/MapListPreview'

const FieldMapEditor = dynamic(() => import('@/components/FieldMapEditor'), { ssr: false })

const BUILDING_TYPES = [
  { label: 'Oficina', value: 'Oficina' },
  { label: 'Silo', value: 'Silo' },
  { label: 'Galpão de Máquinas', value: 'Galpão' },
  { label: 'Balança', value: 'Balança' },
  { label: 'Sede/Escritório', value: 'Sede' },
  { label: 'Depósito', value: 'Depósito' },
  { label: 'Outros', value: 'Outros' },
]

// Converte dois cantos (lat1,lon1 e lat2,lon2) em polígono retangular
function cornersToPolygon(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return []
  return [
    [parseFloat(lat1), parseFloat(lon1)],
    [parseFloat(lat1), parseFloat(lon2)],
    [parseFloat(lat2), parseFloat(lon2)],
    [parseFloat(lat2), parseFloat(lon1)],
  ]
}

// Calcula área em m² de um polígono [[lat,lng],...]  usando fórmula da área geodésica aproximada
function polygonAreaM2(polygon) {
  if (!polygon || polygon.length < 3) return 0
  const R = 6371000 // raio da Terra em metros
  let area = 0
  const n = polygon.length
  for (let i = 0; i < n; i++) {
    const [lat1, lon1] = polygon[i]
    const [lat2, lon2] = polygon[(i + 1) % n]
    const phi1 = lat1 * Math.PI / 180
    const phi2 = lat2 * Math.PI / 180
    const dphi = phi2 - phi1
    const dlambda = (lon2 - lon1) * Math.PI / 180
    area += (2 + Math.sin(phi1) + Math.sin(phi2)) * dlambda * dphi
  }
  return Math.abs(area * R * R / 2)
}

function fmt(v) {
  if (v == null) return '—'
  if (v >= 10000) return `${(v / 10000).toFixed(2)} ha`
  return `${v.toFixed(1)} m²`
}

export default function BuildingsPage({ features }) {
  const [buildings, setBuildings] = useState([])
  const [farms, setFarms] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [focusedItem, setFocusedItem] = useState(null)
  // Modo de definição: 'polygon' (desenho) | 'corners' (cantos lat/lon) | 'point' (ponto simples)
  const [inputMode, setInputMode] = useState('polygon')

  const load = useCallback(async () => {
    try {
      const [bd, fm] = await Promise.all([api('/buildings'), api('/farms')])
      setBuildings(bd.items); setFarms(fm.items)
    } catch (e) { toast.error(e.message) }
  }, [])

  useEffect(() => { queueMicrotask(load) }, [load])

  const startNew = () => {
    setForm({ name: '', farm_id: '', type: '', is_workshop: 'false', polygon: [], area_sqm: 0 })
    setInputMode('polygon')
    setOpen(true)
  }
  const startEdit = (item) => {
    setForm({
      id: item.id, name: item.name, farm_id: item.farm_id?.toString() || '',
      type: item.type, is_workshop: item.is_workshop ? 'true' : 'false',
      polygon: item.polygon || [], area_sqm: item.area_sqm || 0,
      latitude: item.latitude, longitude: item.longitude,
    })
    setInputMode(item.polygon?.length >= 3 ? 'polygon' : 'point')
    setOpen(true)
  }

  const save = async () => {
    if (!form.name || !form.farm_id || !form.type) return toast.error('Preencha nome, fazenda e tipo')
    let polygon = form.polygon || []
    let area_sqm = form.area_sqm || 0
    let latitude = form.latitude ? parseFloat(form.latitude) : null
    let longitude = form.longitude ? parseFloat(form.longitude) : null

    if (inputMode === 'corners') {
      polygon = cornersToPolygon(form.lat1, form.lon1, form.lat2, form.lon2)
      if (polygon.length < 3) return toast.error('Informe os dois cantos do barracão')
      area_sqm = polygonAreaM2(polygon)
      // Centroide para lat/lon
      const lats = polygon.map(p => p[0]); const lons = polygon.map(p => p[1])
      latitude = lats.reduce((a, b) => a + b, 0) / lats.length
      longitude = lons.reduce((a, b) => a + b, 0) / lons.length
    } else if (inputMode === 'polygon' && polygon.length >= 3) {
      area_sqm = polygonAreaM2(polygon)
      const lats = polygon.map(p => p[0]); const lons = polygon.map(p => p[1])
      latitude = lats.reduce((a, b) => a + b, 0) / lats.length
      longitude = lons.reduce((a, b) => a + b, 0) / lons.length
    }

    if (inputMode !== 'polygon' && inputMode !== 'corners') {
      if (!latitude || !longitude) return toast.error('Informe latitude e longitude')
      polygon = []
    }

    setLoading(true)
    try {
      const payload = {
        name: form.name, farm_id: parseInt(form.farm_id), type: form.type,
        is_workshop: form.is_workshop === 'true',
        latitude, longitude, polygon: polygon.length >= 3 ? polygon : null,
        area_sqm: area_sqm || null,
      }
      if (form.id) {
        await api(`/buildings/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast.success('Prédio atualizado')
      } else {
        await api('/buildings', { method: 'POST', body: JSON.stringify(payload) })
        toast.success('Prédio criado')
      }
      setOpen(false); load()
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }

  const remove = (id) => {
    confirmToast('Excluir prédio?', async () => {
      try { await api(`/buildings/${id}`, { method: 'DELETE' }); toast.success('Excluído'); load() }
      catch (e) { toast.error(e.message) }
    })
  }

  // Atualiza área ao mudar polígono no FieldMapEditor
  const onPolygonChange = ({ polygon, areaHa }) => {
    const area_sqm = Math.round((areaHa || 0) * 10000)
    setForm(prev => ({ ...prev, polygon, area_sqm }))
  }

  // Atualiza área ao mudar cantos manualmente
  useEffect(() => {
    if (inputMode === 'corners' && form.lat1 && form.lon1 && form.lat2 && form.lon2) {
      const poly = cornersToPolygon(form.lat1, form.lon1, form.lat2, form.lon2)
      setForm(prev => ({ ...prev, area_sqm: Math.round(polygonAreaM2(poly)) }))
    }
  }, [form.lat1, form.lon1, form.lat2, form.lon2, inputMode])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary" /> Prédios e Estruturas
          </h1>
          <p className="text-muted-foreground text-sm">Silos, galpões, balanças e sedes com área em m²</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm({}) }}>
          <DialogTrigger asChild>
            <Button onClick={startNew}><Plus className="w-4 h-4 mr-1" /> Novo Prédio</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl overflow-y-auto max-h-[95vh]">
            <DialogHeader><DialogTitle>{form.id ? 'Editar Prédio' : 'Novo Prédio'}</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-5">
              {/* Informações básicas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome do Prédio</Label>
                  <Input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Silo Principal" />
                </div>
                <div className="space-y-1.5">
                  <Label>Fazenda Pertencente</Label>
                  <Select value={form.farm_id || 'none'} onValueChange={v => setForm({ ...form, farm_id: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      {farms.map(f => <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={form.type || 'none'} onValueChange={v => setForm({ ...form, type: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {BUILDING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>É Oficina? (detecção automática de manutenção)</Label>
                  <Select value={form.is_workshop || 'false'} onValueChange={v => setForm({ ...form, is_workshop: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">Não</SelectItem>
                      <SelectItem value="true">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seletor de modo de entrada */}
              <div>
                <Label className="mb-2 block">Como definir a área?</Label>
                <div className="flex gap-2">
                  {[
                    { key: 'polygon', label: '🗺️ Desenhar no mapa' },
                    { key: 'corners', label: '📐 Cantos do barracão (lat/lon)' },
                    { key: 'point', label: '📍 Ponto simples' },
                  ].map(m => (
                    <button key={m.key} onClick={() => setInputMode(m.key)}
                      className={`flex-1 text-xs rounded-md border px-3 py-2 transition-colors ${inputMode === m.key ? 'border-primary bg-primary/15 text-primary font-medium' : 'border-border bg-card hover:bg-accent'}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modo desenho */}
              {inputMode === 'polygon' && (
                <div className="border border-border rounded-xl overflow-hidden bg-muted/40">
                  {open && <FieldMapEditor
                    initialPolygon={form.polygon}
                    existingFields={buildings.filter(b => b.id !== form.id && b.polygon?.length >= 3)}
                    onChange={onPolygonChange}
                    height={350}
                  />}
                </div>
              )}

              {/* Modo cantos */}
              {inputMode === 'corners' && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Informe as coordenadas dos dois cantos opostos do barracão para criar um retângulo automático.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Canto 1 – Latitude</Label>
                      <Input type="number" step="0.00001" value={form.lat1 || ''} onChange={e => setForm({ ...form, lat1: e.target.value })} placeholder="-10.1500" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Canto 1 – Longitude</Label>
                      <Input type="number" step="0.00001" value={form.lon1 || ''} onChange={e => setForm({ ...form, lon1: e.target.value })} placeholder="-48.1500" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Canto 2 – Latitude</Label>
                      <Input type="number" step="0.00001" value={form.lat2 || ''} onChange={e => setForm({ ...form, lat2: e.target.value })} placeholder="-10.1510" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Canto 2 – Longitude</Label>
                      <Input type="number" step="0.00001" value={form.lon2 || ''} onChange={e => setForm({ ...form, lon2: e.target.value })} placeholder="-48.1490" />
                    </div>
                  </div>
                </div>
              )}

              {/* Modo ponto simples */}
              {inputMode === 'point' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Latitude</Label>
                    <Input type="number" step="0.00001" value={form.latitude || ''} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="-10.1500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Longitude</Label>
                    <Input type="number" step="0.00001" value={form.longitude || ''} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="-48.1500" />
                  </div>
                </div>
              )}

              {/* Área calculada */}
              {(inputMode === 'polygon' || inputMode === 'corners') && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-4">
                  <Building2 className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Área Calculada</p>
                    <p className="text-2xl font-bold text-primary">
                      {form.area_sqm ? `${form.area_sqm.toLocaleString('pt-BR')} m²` : '0 m²'}
                    </p>
                    {form.area_sqm > 0 && (
                      <p className="text-xs text-muted-foreground">{(form.area_sqm / 10000).toFixed(4)} ha</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Prédio'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <MapListPreview title="Mapa de Prédios e Estruturas" focusedItem={focusedItem} />

      <Card className="glow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Fazenda</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Área</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <span className="cursor-pointer text-primary hover:underline" onClick={() => {
                      setFocusedItem({ ...item, _ts: Date.now() })
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}>{item.name}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.farm?.name || '—'}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell className="font-mono text-primary text-sm">
                    {item.area_sqm ? fmt(item.area_sqm) : item.latitude ? '📍 Ponto' : '—'}
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setFocusedItem({ ...item, _ts: Date.now() })
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }} title="Focar no Mapa">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(item)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(item.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {buildings.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum prédio cadastrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
