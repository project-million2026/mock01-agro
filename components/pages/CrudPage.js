'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, Pencil, Trash2, ShieldAlert, ShieldCheck, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { api } from '@/lib/apiClient'
import dynamic from 'next/dynamic'
import MapListPreview from '@/components/MapListPreview'

// Componente de mapa lazy-loaded para formulários
const FormMapPicker = dynamic(() => import('@/components/FormMapPicker'), { ssr: false, loading: () => <p className="text-xs text-muted-foreground p-4 bg-black/20 rounded">Carregando mapa...</p> })
const FieldMapEditor = dynamic(() => import('@/components/FieldMapEditor'), { ssr: false, loading: () => <p className="text-xs text-muted-foreground p-4 bg-black/20 rounded">Carregando mapa...</p> })

export default function CrudPage({ title, description, endpoint, fields, icon: Icon, extraAction, currentUserRole }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(false)
  
  const load = useCallback(async () => {
    try { const r = await api(`/${endpoint}`); setItems(r.items) } catch (e) { toast.error(e.message) }
  }, [endpoint])
  
  useEffect(() => { load() }, [load])
  
  const startNew = () => { setEditing(null); setForm({}); setOpen(true) }
  const startEdit = (item) => { setEditing(item); setForm(item); setOpen(true) }
  
  const save = async () => {
    setLoading(true)
    try {
      const payload = { ...form }
      fields.forEach(f => {
        if (f.type === 'number' && payload[f.name] !== undefined && payload[f.name] !== '') {
          payload[f.name] = parseFloat(payload[f.name])
        }
        if (payload[f.name] === 'none') {
          payload[f.name] = null
        }
      })
      if (editing) { await api(`/${endpoint}/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) }); toast.success('Atualizado') }
      else { await api(`/${endpoint}`, { method: 'POST', body: JSON.stringify(payload) }); toast.success('Criado') }
      setOpen(false); load()
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }
  
  const remove = async (item) => {
    if (!confirm('Excluir este registro?')) return
    try { await api(`/${endpoint}/${item.id}`, { method: 'DELETE' }); toast.success('Excluído'); load() }
    catch (e) { toast.error(e.message) }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Icon className="w-7 h-7 text-primary" /> {title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startNew}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className={`overflow-y-auto max-h-[95vh] ${fields.some(f => f.type === 'polygon' || f.name === 'latitude') ? 'max-w-3xl' : 'max-w-lg'}`}>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar' : 'Novo'} {title.slice(0, -1)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {fields.map(f => (
                <div key={f.name} className="space-y-1.5">
                  <Label>{f.label}</Label>
                  {f.type === 'select' ? (
                    <Select value={form[f.name] === null ? 'none' : (form[f.name]?.toString() || 'none')} onValueChange={v => setForm({ ...form, [f.name]: v === 'none' ? null : v })}>
                      <SelectTrigger><SelectValue placeholder={`Selecione ${f.label}`} /></SelectTrigger>
                      <SelectContent>
                        {f.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : f.type === 'polygon' ? (
                    <div className="mt-2 border border-border rounded-xl bg-black/20">
                      {open && <FieldMapEditor initialPolygon={form[f.name]} existingFields={items.filter(i => i.id !== form.id)} onChange={({ polygon, areaHa }) => {
                        setForm(prev => {
                          const newForm = { ...prev, [f.name]: polygon }
                          if (fields.find(field => field.name === 'total_area' || field.name === 'area')) {
                            newForm[fields.find(field => field.name === 'total_area') ? 'total_area' : 'area'] = areaHa
                          }
                          return newForm
                        })
                      }} height={300} />}
                    </div>
                  ) : (
                    <Input type={f.type || 'text'} value={form[f.name] ?? ''} onChange={e => setForm({ ...form, [f.name]: e.target.value })} placeholder={f.placeholder} />
                  )}
                </div>
              ))}
              {fields.some(f => f.name === 'latitude') && !fields.some(f => f.type === 'polygon') && (
                <div className="col-span-full pt-2">
                   <Label className="mb-2 block">Apontar no Mapa (Clique para definir)</Label>
                   <FormMapPicker 
                     lat={form.latitude} 
                     lng={form.longitude} 
                     onChange={(lat, lng) => setForm({...form, latitude: lat, longitude: lng})} 
                   />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(endpoint === 'farms' || endpoint === 'buildings') && (
        <MapListPreview title={endpoint === 'farms' ? 'Mapa de Fazendas' : 'Mapa de Prédios e Estruturas'} />
      )}

      {endpoint === 'users' && (currentUserRole === 'admin' || currentUserRole === 'manager') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="glow-card bg-rose-500/10 border-rose-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-rose-500" />
              <div>
                <p className="font-bold text-rose-500">Administrador</p>
                <p className="text-xs text-muted-foreground">Acesso total ao sistema, configurações e exclusão de dados.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glow-card bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
              <div>
                <p className="font-bold text-blue-500">Gestor</p>
                <p className="text-xs text-muted-foreground">Acesso parcial. Pode gerenciar frotas e visualizar relatórios.</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glow-card bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <UserIcon className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="font-bold text-emerald-500">Operador</p>
                <p className="text-xs text-muted-foreground">Acesso restrito. Apenas visualização de dashboards e mapas.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="glow-card overflow-hidden">
        <CardContent className="p-0 overflow-x-auto custom-scrollbar">
          <Table className="w-full min-w-[600px]">
            <TableHeader>
              <TableRow>
                {fields.slice(0, 5).map(f => <TableHead key={f.name}>{f.label}</TableHead>)}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  {fields.slice(0, 5).map(f => (
                    <TableCell key={f.name} className={f.mono ? 'font-mono text-xs' : ''}>
                      {f.name === 'role' && (currentUserRole === 'admin' || currentUserRole === 'manager') ? (
                        <div className="flex items-center gap-2">
                          {item[f.name] === 'admin' && <ShieldAlert className="w-4 h-4 text-rose-500" title="Acesso Total" />}
                          {item[f.name] === 'manager' && <ShieldCheck className="w-4 h-4 text-blue-500" title="Acesso Parcial" />}
                          {item[f.name] === 'operator' && <UserIcon className="w-4 h-4 text-emerald-500" title="Acesso Restrito" />}
                          <span className="capitalize">{item[f.name] === 'admin' ? 'Administrador' : item[f.name] === 'manager' ? 'Gestor' : 'Operador'}</span>
                        </div>
                      ) : f.name === 'role' ? (
                        <span className="capitalize">{item[f.name] === 'admin' ? 'Administrador' : item[f.name] === 'manager' ? 'Gestor' : 'Operador'}</span>
                      ) : (
                        String(item[f.name] ?? '—')
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    {extraAction && (
                      <Button size="sm" variant="ghost" onClick={() => extraAction.handler(item)} title={extraAction.label}>
                        <extraAction.icon className="w-4 h-4 text-primary" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => startEdit(item)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(item)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={fields.slice(0, 5).length + 1} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
