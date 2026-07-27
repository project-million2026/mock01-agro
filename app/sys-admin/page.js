'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShieldAlert, Building2, Plus, LogOut, Power, Loader2, Users, Trash2, KeyRound, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Toaster, toast } from 'sonner'
import { sysApi, sysLogin, sysLogout, sysToken } from '@/lib/sysApiClient'

const PLANS = ['standard', 'pro', 'enterprise']
const EMPTY_ORG = { name: '', slug: '', plan: 'standard', admin_name: '', admin_email: '', admin_password: '' }

function HardeningWarn() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
      <p><b>Antes de expor em produção:</b> este painel tem poder cross-org (BYPASSRLS). Habilite <b>IP-allowlist</b> (no nginx e/ou app) e <b>MFA/TOTP</b> — ver DEPLOY.md. Enquanto isso, restrinja o acesso a <code>/api/sys-admin</code> por VPN/IP.</p>
    </div>
  )
}

export default function SysAdminPanel() {
  const [authed, setAuthed] = useState(false)
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState('orgs')
  const [creds, setCreds] = useState({ email: '', password: '' })
  const [orgs, setOrgs] = useState([])
  const [admins, setAdmins] = useState([])
  const [form, setForm] = useState(null)       // criar org
  const [detail, setDetail] = useState(null)    // detalhe da org (org + userList)
  const [adminForm, setAdminForm] = useState(null)  // criar admin do sistema
  const [busy, setBusy] = useState(false)

  useEffect(() => { queueMicrotask(() => { setAuthed(!!sysToken()); setReady(true) }) }, [])

  const load = useCallback(async () => {
    try { setOrgs((await sysApi('/orgs')).items || []) }
    catch (e) { toast.error(e.message); if (/painel|sistema/.test(String(e.message))) { sysLogout(); setAuthed(false) } }
  }, [])
  const loadAdmins = useCallback(async () => {
    try { setAdmins((await sysApi('/admins')).items || []) } catch (e) { toast.error(e.message) }
  }, [])
  useEffect(() => { if (authed) queueMicrotask(load) }, [authed, load])
  useEffect(() => { if (authed && tab === 'admins') queueMicrotask(loadAdmins) }, [authed, tab, loadAdmins])

  const doLogin = async (e) => {
    e.preventDefault(); setBusy(true)
    try { await sysLogin(creds.email, creds.password); setAuthed(true); toast.success('Autenticado') }
    catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  const logout = () => { sysLogout(); setAuthed(false); setOrgs([]); setAdmins([]) }

  const createOrg = async () => {
    if (!form.name || !form.admin_email || !form.admin_password) return toast.error('Preencha org + admin inicial')
    setBusy(true)
    try { await sysApi('/orgs', { method: 'POST', body: JSON.stringify(form) }); toast.success('Organização criada'); setForm(null); load() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const setPlan = async (o, plan) => {
    try { await sysApi(`/orgs/${o.id}`, { method: 'PATCH', body: JSON.stringify({ plan }) }); load() } catch (e) { toast.error(e.message) }
  }
  const toggleActive = async (o) => {
    if (o.active && !confirm(`Suspender a organização ${o.name}? Os usuários dela ficam bloqueados.`)) return
    try { await sysApi(`/orgs/${o.id}`, { method: 'PATCH', body: JSON.stringify({ active: !o.active }) }); toast.success(o.active ? 'Suspensa' : 'Reativada'); load(); if (detail?.id === o.id) openDetail(o.id) }
    catch (e) { toast.error(e.message) }
  }
  const deleteOrg = async (o) => {
    if (!confirm(`EXCLUIR a organização "${o.name}" e TODOS os seus dados? Esta ação é irreversível.`)) return
    if (!confirm('Confirme novamente: apagar em cascata (frotas, usuários, telemetria, O.S. etc.)?')) return
    try { await sysApi(`/orgs/${o.id}?force=true`, { method: 'DELETE' }); toast.success('Organização excluída'); setDetail(null); load() }
    catch (e) { toast.error(e.message) }
  }

  const openDetail = async (id) => { try { setDetail(await sysApi(`/orgs/${id}/detail`)) } catch (e) { toast.error(e.message) } }
  const resetPass = async (u) => {
    const pw = prompt(`Nova senha para ${u.email}:`)
    if (!pw) return
    try { await sysApi(`/orgs/${detail.id}/users/${u.id}/reset-password`, { method: 'POST', body: JSON.stringify({ password: pw }) }); toast.success('Senha redefinida') }
    catch (e) { toast.error(e.message) }
  }
  const addOrgAdmin = async () => {
    const name = prompt('Nome do novo admin:'); if (!name) return
    const email = prompt('E-mail:'); if (!email) return
    const password = prompt('Senha:'); if (!password) return
    try { await sysApi(`/orgs/${detail.id}/admins`, { method: 'POST', body: JSON.stringify({ name, email, password }) }); toast.success('Admin adicionado'); openDetail(detail.id) }
    catch (e) { toast.error(e.message) }
  }

  const createAdmin = async () => {
    if (!adminForm.name || !adminForm.email || !adminForm.password) return toast.error('Preencha todos os campos')
    setBusy(true)
    try { await sysApi('/admins', { method: 'POST', body: JSON.stringify(adminForm) }); toast.success('Admin criado'); setAdminForm(null); loadAdmins() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const deleteAdmin = async (a) => {
    if (!confirm(`Remover o admin de sistema ${a.email}?`)) return
    try { await sysApi(`/admins/${a.id}`, { method: 'DELETE' }); toast.success('Removido'); loadAdmins() } catch (e) { toast.error(e.message) }
  }

  if (!ready) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-6 h-6 animate-spin" /></div>

  if (!authed) {
    return (
      <div className="min-h-screen grid place-items-center bg-muted/30 p-4">
        <Toaster richColors position="top-right" />
        <Card className="w-full max-w-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Painel do Sistema</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-4"><HardeningWarn /></div>
            <form onSubmit={doLogin} className="space-y-3">
              <div><Label>E-mail</Label><Input type="email" value={creds.email} onChange={e => setCreds({ ...creds, email: e.target.value })} /></div>
              <div><Label>Senha</Label><Input type="password" value={creds.password} onChange={e => setCreds({ ...creds, password: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <Toaster richColors position="top-right" />
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6 text-primary" /> Painel do Sistema</h1>
          <Button variant="outline" onClick={logout}><LogOut className="w-4 h-4 mr-1" /> Sair</Button>
        </div>
        <HardeningWarn />

        <div className="flex gap-2">
          <Button size="sm" variant={tab === 'orgs' ? 'default' : 'outline'} onClick={() => setTab('orgs')}><Building2 className="w-4 h-4 mr-1" /> Organizações</Button>
          <Button size="sm" variant={tab === 'admins' ? 'default' : 'outline'} onClick={() => setTab('admins')}><ShieldAlert className="w-4 h-4 mr-1" /> Admins do sistema</Button>
        </div>

        {tab === 'orgs' && (
          <>
            <div className="flex justify-end"><Button onClick={() => setForm({ ...EMPTY_ORG })}><Plus className="w-4 h-4 mr-1" /> Nova organização</Button></div>
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Organização</TableHead><TableHead>Subdomínio</TableHead><TableHead>Plano</TableHead><TableHead className="text-right">Usuários</TableHead><TableHead className="text-right">Frotas</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {orgs.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma organização.</TableCell></TableRow>}
                  {orgs.map(o => (
                    <TableRow key={o.id} className={o.active ? '' : 'opacity-60'}>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{o.slug || '—'}</TableCell>
                      <TableCell><select className="h-8 rounded-md border bg-background px-2 text-sm" value={o.plan} onChange={e => setPlan(o, e.target.value)}>{PLANS.map(p => <option key={p} value={p}>{p}</option>)}</select></TableCell>
                      <TableCell className="text-right">{o.users}</TableCell>
                      <TableCell className="text-right">{o.fleets}</TableCell>
                      <TableCell>{o.active ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Ativa</Badge> : <Badge variant="outline" className="bg-red-500/15 text-red-600 border-red-500/30">Suspensa</Badge>}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" title="Detalhe" onClick={() => openDetail(o.id)}><Eye className="w-4 h-4" /></Button>
                        <Button size="sm" variant={o.active ? 'outline' : 'default'} onClick={() => toggleActive(o)}><Power className="w-3.5 h-3.5 mr-1" /> {o.active ? 'Suspender' : 'Reativar'}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </>
        )}

        {tab === 'admins' && (
          <>
            <div className="flex justify-end"><Button onClick={() => setAdminForm({ name: '', email: '', password: '' })}><Plus className="w-4 h-4 mr-1" /> Novo admin</Button></div>
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {admins.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum admin.</TableCell></TableRow>}
                  {admins.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-muted-foreground">{a.email}</TableCell>
                      <TableCell className="text-right"><Button size="icon" variant="ghost" title="Remover" onClick={() => deleteAdmin(a)}><Trash2 className="w-4 h-4 text-red-500" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </>
        )}
      </div>

      {/* Criar org */}
      <Dialog open={!!form} onOpenChange={v => !v && setForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova organização</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div><Label>Nome da organização</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Subdomínio <span className="text-muted-foreground text-xs">(opcional — gerado do nome)</span></Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="ex: acme" /></div>
              <div><Label>Plano</Label><select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>{PLANS.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
              <div className="border-t pt-3 space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Admin inicial da organização</p>
                <div><Label>Nome</Label><Input value={form.admin_name} onChange={e => setForm({ ...form, admin_name: e.target.value })} /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.admin_email} onChange={e => setForm({ ...form, admin_email: e.target.value })} /></div>
                <div><Label>Senha</Label><Input type="password" value={form.admin_password} onChange={e => setForm({ ...form, admin_password: e.target.value })} /></div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button onClick={createOrg} disabled={busy}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhe da org */}
      <Dialog open={!!detail} onOpenChange={v => !v && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground flex gap-3 flex-wrap">
                <span>Subdomínio: <b>{detail.slug || '—'}</b></span><span>Plano: <b>{detail.plan}</b></span>
                <span>{detail.active ? 'Ativa' : 'Suspensa'}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="font-medium flex items-center gap-1"><Users className="w-4 h-4" /> Usuários</p>
                <Button size="sm" variant="outline" onClick={addOrgAdmin}><Plus className="w-3 h-3 mr-1" /> Admin</Button>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Papel</TableHead><TableHead className="text-right">Senha</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(detail.userList || []).map(u => (
                    <TableRow key={u.id}>
                      <TableCell>{u.name}</TableCell><TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>{u.role}</TableCell>
                      <TableCell className="text-right"><Button size="icon" variant="ghost" title="Resetar senha" onClick={() => resetPass(u)}><KeyRound className="w-4 h-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t pt-3 flex justify-end">
                <Button variant="destructive" size="sm" onClick={() => deleteOrg(detail)}><Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir organização</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Criar admin do sistema */}
      <Dialog open={!!adminForm} onOpenChange={v => !v && setAdminForm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo admin do sistema</DialogTitle></DialogHeader>
          {adminForm && (
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={adminForm.name} onChange={e => setAdminForm({ ...adminForm, name: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} /></div>
              <div><Label>Senha</Label><Input type="password" value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setAdminForm(null)}>Cancelar</Button><Button onClick={createAdmin} disabled={busy}>Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
