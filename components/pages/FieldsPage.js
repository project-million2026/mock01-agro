'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Map as MapIcon, Plus, Trash2, MapPinned, Pencil } from 'lucide-react'
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
import { api } from '@/lib/apiClient'
import MapListPreview from '@/components/MapListPreview'

const FieldMapEditor = dynamic(() => import('@/components/FieldMapEditor'), { ssr: false })

export default function FieldsPage() {
  const [fields, setFields] = useState([])
  const [farms, setFarms] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', farmId: '', polygon: [], area: 0 })
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const [fd, fm] = await Promise.all([api('/fields'), api('/farms')])
      setFields(fd.items); setFarms(fm.items)
    } catch (e) { toast.error(e.message) }
  }, [])

  useEffect(() => { load() }, [load])

  const startNew = () => { setForm({ id: null, name: '', farmId: '', polygon: [], area: 0 }); setOpen(true) }
  const startEdit = (item) => { 
    setForm({ id: item.id, name: item.name, farmId: item.farm_id, polygon: item.polygon, area: item.area }); 
    setOpen(true) 
  }

  const save = async () => {
    if (!form.name || !form.farmId || !form.polygon || form.polygon.length < 3) return toast.error('Preencha os dados e desenhe a área')
    setLoading(true)
    try {
      const payload = { name: form.name, farm_id: form.farmId, area: form.area, polygon: form.polygon }
      if (form.id) {
        await api(`/fields/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast.success('Talhão atualizado')
      } else {
        await api('/fields', { method: 'POST', body: JSON.stringify(payload) })
        toast.success('Talhão criado')
      }
      setOpen(false); load()
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }

  const remove = async (id) => {
    if (!confirm('Excluir talhão?')) return
    try { await api(`/fields/${id}`, { method: 'DELETE' }); toast.success('Excluído'); load() }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><MapIcon className="w-7 h-7 text-primary" /> Talhões</h1>
          <p className="text-muted-foreground text-sm">Gerenciamento de áreas de plantio com georreferenciamento</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if(o && !form.id) setForm({ id: null, name: '', farmId: '', polygon: [], area: 0 }) }}>
          <DialogTrigger asChild><Button onClick={startNew}><Plus className="w-4 h-4 mr-1" /> Novo Talhão</Button></DialogTrigger>
          <DialogContent className="max-w-3xl overflow-y-auto max-h-[95vh]">
            <DialogHeader><DialogTitle>{form.id ? 'Editar Talhão' : 'Desenhar Novo Talhão'}</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nome do Talhão</Label>
                  <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: T-01 Norte" />
                </div>
                <div className="space-y-1.5">
                  <Label>Fazenda Pertencente</Label>
                  <Select value={form.farmId} onValueChange={v => setForm({ ...form, farmId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {farms.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-4 border-t border-border">
                  <Label className="text-muted-foreground">Área Calculada</Label>
                  <p className="text-3xl font-bold text-primary">{form.area || '0.00'} <span className="text-lg text-muted-foreground">ha</span></p>
                  <p className="text-xs text-muted-foreground mt-2">Dica: Use as ferramentas de desenho no mapa ao lado para contornar a área do talhão. A área em hectares será calculada automaticamente.</p>
                </div>
              </div>
              <div className="border border-border rounded-xl overflow-hidden bg-black/20">
                {open && <FieldMapEditor initialPolygon={form.polygon} existingFields={fields.filter(f => f.id !== form.id)} onChange={({ polygon, areaHa }) => setForm({ ...form, polygon, area: areaHa })} height={400} />}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Talhão'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <MapListPreview title="Mapa de Talhões" />

      <Card className="glow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Fazenda</TableHead>
                <TableHead>Área (ha)</TableHead>
                <TableHead>Coordenadas (Pontos)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold">{item.name}</TableCell>
                  <TableCell className="text-muted-foreground flex items-center gap-1"><MapPinned className="w-3 h-3" /> {item.farm?.name || '—'}</TableCell>
                  <TableCell className="font-mono text-primary">{item.area}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.polygon?.length || 0} vértices</TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(item)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(item.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {fields.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum talhão cadastrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
