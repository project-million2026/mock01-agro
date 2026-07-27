'use client'

import { useState, useCallback, useEffect } from 'react'
import { Route, Plus, Trash2, Pencil, CheckCircle2, XCircle, Upload } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { confirmToast } from '@/lib/confirmToast'
import { api } from '@/lib/apiClient'
import GeoImportDialog from '@/components/GeoImportDialog'

// Plano de rota (Fatia E): máquina × talhões permitidos. Base do alerta de desvio de rota.
const EMPTY = { id: null, fleetNumber: '', fieldIds: [], validFrom: '', validUntil: '', active: true, notes: '' }

export default function WorkPlansPage({ currentUserRole }) {
  const [plans, setPlans] = useState([])
  const [fleets, setFleets] = useState([])
  const [fields, setFields] = useState([])
  const [farms, setFarms] = useState([])
  const [importOpen, setImportOpen] = useState(false)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const canManage = currentUserRole === 'admin' || currentUserRole === 'manager'

  const load = useCallback(async () => {
    try { setPlans(await api('/work-plans')) } catch (e) { toast.error(e.message) }
  }, [])
  const loadFields = useCallback(() => { api('/fields').then(r => setFields(r.items || [])).catch(() => {}) }, [])

  useEffect(() => { queueMicrotask(load) }, [load])
  useEffect(() => {
    api('/fleets').then(r => setFleets(r.items || r || [])).catch(() => {})
    api('/farms').then(r => setFarms(r.items || [])).catch(() => {})
    loadFields()
  }, [loadFields])

  const fieldName = (id) => fields.find(f => f.id === id)?.name || `#${id}`
  const toggleField = (id) => setForm(f => ({
    ...f, fieldIds: f.fieldIds.includes(id) ? f.fieldIds.filter(x => x !== id) : [...f.fieldIds, id],
  }))

  const openNew = () => setForm({ ...EMPTY })
  const openEdit = (p) => setForm({
    id: p.id, fleetNumber: p.fleetNumber, fieldIds: p.fieldIds || [],
    validFrom: p.validFrom ? p.validFrom.slice(0, 16) : '', validUntil: p.validUntil ? p.validUntil.slice(0, 16) : '',
    active: p.active, notes: p.notes || '',
  })

  const save = async () => {
    if (!form.fleetNumber) return toast.error('Selecione a máquina')
    if (form.fieldIds.length === 0) return toast.error('Selecione ao menos um talhão permitido')
    setBusy(true)
    try {
      const body = {
        fieldIds: form.fieldIds, active: form.active, notes: form.notes || null,
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
      }
      if (form.id) {
        await api(`/work-plans/${form.id}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Plano atualizado')
      } else {
        await api('/work-plans', { method: 'POST', body: JSON.stringify({ ...body, fleetNumber: form.fleetNumber }) })
        toast.success('Plano criado')
      }
      setForm(null); load()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const remove = (id) => {
    confirmToast('Excluir plano de rota?', async () => {
      try { await api(`/work-plans/${id}`, { method: 'DELETE' }); toast.success('Excluído'); load() }
      catch (e) { toast.error(e.message) }
    })
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Route className="w-6 h-6 text-primary" /> Plano de Rota</h1>
          <p className="text-muted-foreground text-sm">Talhões permitidos por máquina. Entrar em talhão fora do plano gera alerta de desvio de rota.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-1" /> Importar talhões</Button>}
          {canManage && <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo Plano</Button>}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Máquina</TableHead><TableHead>Talhões permitidos</TableHead>
                <TableHead>Vigência</TableHead><TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum plano de rota.</TableCell></TableRow>}
              {plans.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.fleetNumber}</TableCell>
                  <TableCell className="text-sm">{(p.fieldIds || []).map(fieldName).join(', ') || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.validFrom ? new Date(p.validFrom).toLocaleDateString('pt-BR') : '—'}
                    {p.validUntil ? ` → ${new Date(p.validUntil).toLocaleDateString('pt-BR')}` : ' → sem fim'}
                  </TableCell>
                  <TableCell>{p.active ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {canManage && <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>}
                    {canManage && <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!form} onOpenChange={v => !v && setForm(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? 'Editar Plano de Rota' : 'Novo Plano de Rota'}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div>
                <Label>Máquina</Label>
                <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={form.fleetNumber} disabled={!!form.id}
                        onChange={e => setForm({ ...form, fleetNumber: e.target.value })}>
                  <option value="">Selecione…</option>
                  {fleets.map(f => <option key={f.id || f.fleet_number} value={f.fleet_number}>{f.fleet_number}</option>)}
                </select>
              </div>
              <div>
                <Label>Talhões permitidos</Label>
                <div className="mt-1 max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                  {fields.length === 0 && <p className="text-xs text-muted-foreground">Nenhum talhão cadastrado.</p>}
                  {fields.map(f => (
                    <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={form.fieldIds.includes(f.id)} onChange={() => toggleField(f.id)} />
                      {f.name} {f.farm?.name && <span className="text-xs text-muted-foreground">· {f.farm.name}</span>}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Válido de</Label><Input type="datetime-local" value={form.validFrom} onChange={e => setForm({ ...form, validFrom: e.target.value })} /></div>
                <div><Label>Válido até (opcional)</Label><Input type="datetime-local" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} /></div>
              </div>
              <div><Label>Observações</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
                {form.active ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />} Plano ativo
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GeoImportDialog open={importOpen} onOpenChange={setImportOpen} kind="field" farms={farms} onImported={loadFields} />
    </div>
  )
}
