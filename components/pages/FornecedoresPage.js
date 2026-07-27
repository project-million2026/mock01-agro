'use client'

import { useState, useCallback, useEffect } from 'react'
import { Truck, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { api } from '@/lib/apiClient'

const EMPTY = { name: '', contact: '', document: '', description: '' }

export default function FornecedoresPage({ currentUserRole }) {
  const [items, setItems] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const canManage = currentUserRole === 'admin' || currentUserRole === 'manager'

  const load = useCallback(async () => {
    try { const r = await api('/suppliers'); setItems(r.items || []) }
    catch (e) { toast.error(e.message) }
  }, [])

  useEffect(() => { queueMicrotask(load) }, [load])

  const openCreate = () => { setForm(EMPTY); setEditing({}) }
  const openEdit = (s) => { setForm({ name: s.name, contact: s.contact || '', document: s.document || '', description: s.description || '' }); setEditing(s) }

  const save = async () => {
    setLoading(true)
    try {
      const body = { name: form.name, contact: form.contact || null, document: form.document || null, description: form.description || null }
      if (editing.id) await api(`/suppliers/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/suppliers', { method: 'POST', body: JSON.stringify(body) })
      toast.success('Fornecedor salvo'); setEditing(null); load()
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }

  const remove = async (s) => {
    try { await api(`/suppliers/${s.id}`, { method: 'DELETE' }); toast.success('Fornecedor excluído'); load() }
    catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Truck className="w-7 h-7 text-primary" /> Fornecedores</h1>
          <p className="text-muted-foreground text-sm">Cadastro usado nas entradas de estoque</p>
        </div>
        {canManage && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Novo Fornecedor</Button>}
      </div>

      <Card className="glow-card overflow-hidden">
        <CardHeader><CardTitle>Fornecedores</CardTitle><CardDescription>{items.length} cadastrados</CardDescription></CardHeader>
        <CardContent className="p-0 overflow-x-auto custom-scrollbar">
          <Table className="w-full min-w-[560px]">
            <TableHeader>
              <TableRow><TableHead>Nome</TableHead><TableHead>Descrição / Tipo</TableHead><TableHead>Contato</TableHead><TableHead>Documento</TableHead><TableHead className="text-right">Ações</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {items.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[260px] truncate" title={s.description || ''}>{s.description || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{s.contact || '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{s.document || '—'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {canManage && <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>Editar</Button>}
                    {canManage && <Button size="sm" variant="ghost" className="text-rose-400" onClick={() => remove(s)}>Excluir</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum fornecedor cadastrado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: AgroPeças Ltda" /></div>
            <div className="space-y-1.5"><Label>Contato</Label><Input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Telefone / e-mail" /></div>
            <div className="space-y-1.5"><Label>Documento (CNPJ/CPF)</Label><Input value={form.document} onChange={e => setForm({ ...form, document: e.target.value })} placeholder="Opcional" /></div>
            <div className="space-y-1.5"><Label>Descrição / Tipo</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex: peças terceirizado — correia, rolamento; concessionária John Deere" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} disabled={loading || !form.name}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
