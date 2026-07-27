'use client'

import { useState, useCallback, useEffect } from 'react'
import { UserCog, Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
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

const ROLE = {
  admin: { label: 'Administrador', cls: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
  manager: { label: 'Gerente', cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  operator: { label: 'Operador', cls: 'bg-muted text-muted-foreground border-border' },
}
const EMPTY = { name: '', email: '', password: '', role: 'operator', all_farms: false, farm_ids: [] }

export default function UsuariosPage({ currentUserRole }) {
  const [users, setUsers] = useState([])
  const [farms, setFarms] = useState([])
  const [form, setForm] = useState(null)  // objeto = diálogo aberto; { ...campos, id? }
  const [busy, setBusy] = useState(false)
  const isAdmin = currentUserRole === 'admin'
  const canManage = isAdmin || currentUserRole === 'manager'

  const load = useCallback(async () => {
    try { setUsers((await api('/users')).items || []) } catch (e) { toast.error(e.message) }
  }, [])
  useEffect(() => { queueMicrotask(load) }, [load])
  useEffect(() => { api('/farms').then(r => setFarms(r.items || r || [])).catch(() => {}) }, [])

  const farmName = (id) => farms.find(f => f.id === id)?.name || `#${id}`
  const scopeText = (u) => u.all_farms ? 'Todas as fazendas' : (u.farm_ids?.length ? u.farm_ids.map(farmName).join(', ') : '—')

  const openCreate = () => setForm({ ...EMPTY })
  const openEdit = (u) => setForm({ id: u.id, name: u.name, email: u.email, password: '', role: u.role, all_farms: !!u.all_farms, farm_ids: u.farm_ids || [] })
  const toggleFarm = (id) => setForm(f => ({ ...f, farm_ids: f.farm_ids.includes(id) ? f.farm_ids.filter(x => x !== id) : [...f.farm_ids, id] }))

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) return toast.error('Nome e e-mail são obrigatórios')
    if (!form.id && !form.password) return toast.error('Defina uma senha')
    setBusy(true)
    try {
      const body = {
        name: form.name, email: form.email, role: form.role,
        all_farms: form.all_farms, farm_ids: form.all_farms ? [] : form.farm_ids,
      }
      if (form.password) body.password = form.password
      if (form.id) await api(`/users/${form.id}`, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/users', { method: 'POST', body: JSON.stringify(body) })
      toast.success(form.id ? 'Usuário atualizado' : 'Usuário criado'); setForm(null); load()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const remove = (u) => {
    confirmToast(`Excluir o usuário ${u.name}?`, async () => {
      try { await api(`/users/${u.id}`, { method: 'DELETE' }); toast.success('Usuário excluído'); load() }
      catch (e) { toast.error(e.message) }
    })
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserCog className="w-6 h-6 text-primary" /> Usuários</h1>
          <p className="text-muted-foreground text-sm">Papéis e acesso por fazenda da sua organização.</p>
        </div>
        {canManage && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Novo usuário</Button>}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Papel</TableHead>
                <TableHead>Acesso (fazendas)</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum usuário.</TableCell></TableRow>}
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge variant="outline" className={ROLE[u.role]?.cls}>{ROLE[u.role]?.label || u.role}</Badge></TableCell>
                  <TableCell className="text-sm max-w-[260px] truncate">
                    {u.all_farms ? <span className="inline-flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3.5 h-3.5" /> Todas</span> : scopeText(u)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {canManage && <Button size="icon" variant="ghost" title="Editar" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>}
                    {canManage && <Button size="icon" variant="ghost" title="Excluir" onClick={() => remove(u)}><Trash2 className="w-4 h-4 text-red-500" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!form} onOpenChange={v => !v && setForm(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? 'Editar usuário' : 'Novo usuário'}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div>
                  <Label>Senha {form.id && <span className="text-muted-foreground text-xs">(deixe em branco p/ manter)</span>}</Label>
                  <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••" />
                </div>
                <div>
                  <Label>Papel</Label>
                  <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {isAdmin && <option value="admin">Administrador</option>}
                    <option value="manager">Gerente</option>
                    <option value="operator">Operador</option>
                  </select>
                </div>
              </div>

              {/* all_farms só o admin concede (org-wide) */}
              {isAdmin && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.all_farms} onChange={e => setForm({ ...form, all_farms: e.target.checked })} />
                  Vê todas as fazendas da organização (org-wide)
                </label>
              )}

              {!form.all_farms && (
                <div>
                  <Label>Fazendas com acesso</Label>
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
                    {farms.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma fazenda no seu escopo.</p>}
                    {farms.map(f => (
                      <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={form.farm_ids.includes(f.id)} onChange={() => toggleFarm(f.id)} />
                        {f.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
