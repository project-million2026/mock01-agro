'use client'

import { useState, useCallback, useEffect } from 'react'
import { ClipboardList, Plus, Upload, Trash2, CheckCircle2, XCircle, Lock, FileDown, Wallet, Clock, CircleDollarSign, Link2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { api, apiUpload, apiDownload } from '@/lib/apiClient'
import { KpiCard } from '@/components/KpiCard'
import SearchSelect from '@/components/SearchSelect'

const STATUS = {
  orcamento: { label: 'Orçamento', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
    desc: 'Rascunho editável — monte os itens e veja o custo estimado. Nada é consumido ainda.',
    next: { action: 'approve', label: 'Aprovar orçamento' } },
  aprovada: { label: 'Aprovada', cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    desc: 'Orçamento aprovado e imutável. Ainda NÃO mexe no estoque. Feche quando o serviço terminar.',
    next: { action: 'close', label: 'Concluir e fechar' } },
  fechada: { label: 'Fechada', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
    desc: 'Serviço concluído: estoque das peças baixado e custo realizado consolidado. Estado final.',
    next: null },
  cancelada: { label: 'Cancelada', cls: 'bg-muted text-muted-foreground border-border',
    desc: 'O.S. cancelada.', next: null },
}
const KINDS = [{ value: 'part', label: 'Peça' }, { value: 'labor', label: 'Mão de obra' }, { value: 'service', label: 'Serviço' }]
const EMPTY_ITEM = { kind: 'service', description: '', partId: '', quantity: '1', unitCost: '' }
const EMPTY = { title: '', fleetNumber: '', number: '', notes: '', pdfFilename: '', items: [] }
const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function OrdensServicoPage({ currentUserRole }) {
  const [orders, setOrders] = useState([])
  const [kpis, setKpis] = useState({ totals: { pipeline: 0, committed: 0, realized: 0 }, counts: {} })
  const [statusFilter, setStatusFilter] = useState('')
  const [fleets, setFleets] = useState([])
  const [parts, setParts] = useState([])
  const [form, setForm] = useState(null)      // objeto = diálogo aberto
  const [extract, setExtract] = useState(null) // resultado da extração do PDF
  const [detail, setDetail] = useState(null)   // O.S. detalhada
  const [busy, setBusy] = useState(false)
  const canManage = currentUserRole === 'admin' || currentUserRole === 'manager'

  const load = useCallback(async () => {
    try {
      const [os, k] = await Promise.all([
        api(`/service-orders${statusFilter ? `?status=${statusFilter}` : ''}`),
        api('/service-orders/kpis'),
      ])
      setOrders(Array.isArray(os) ? os : [])
      setKpis(k || { totals: {}, counts: {} })
    } catch (e) { toast.error(e.message) }
  }, [statusFilter])

  useEffect(() => { queueMicrotask(load) }, [load])
  useEffect(() => {
    api('/fleets').then(r => setFleets(r.items || r || [])).catch(() => {})
    api('/parts').then(r => setParts(r.items || [])).catch(() => {})
  }, [])

  const openCreate = () => { setForm({ ...EMPTY, items: [] }); setExtract(null) }
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }))
  const rmItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))
  const setItem = (i, patch) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }))
  const onPickPart = (i, partId) => {
    const p = parts.find(x => String(x.id) === String(partId))
    if (!p) return setItem(i, { partId })
    // Traz os dados da peça já cadastrada: descrição (nome + marca) e custo unitário atual.
    const desc = [p.name, p.brand].filter(Boolean).join(' - ')
    setItem(i, { partId, description: desc, unitCost: String(p.unitCost ?? p.unit_cost ?? '') })
  }

  const estimated = (form?.items || []).reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0), 0)

  const uploadPdf = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await apiUpload('/service-orders/extract-pdf', fd)
      setExtract(res)
      const d = res.draft || {}
      setForm(f => ({
        ...f,
        title: d.title || f.title,
        number: d.number || f.number,
        extractedSupplier: d.supplier || '',
        pdfFilename: res.pdfFilename || '',
        items: (d.items || []).map(it => ({ kind: it.kind || 'service', description: it.description || '', partId: '', quantity: String(it.quantity ?? 1), unitCost: String(it.unitCost ?? '') })),
      }))
      toast[res.recognized ? 'success' : 'warning'](res.recognized ? 'PDF lido — confira os campos' : 'Layout não reconhecido — preencha manualmente')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const save = async () => {
    if (!form.title.trim()) return toast.error('Informe um título')
    setBusy(true)
    try {
      const body = {
        title: form.title, number: form.number || null, notes: form.notes || null,
        fleetNumber: form.fleetNumber || null, pdfFilename: form.pdfFilename || null,
        items: form.items.map(it => ({ kind: it.kind, description: it.description, partId: it.partId ? Number(it.partId) : null, quantity: Number(it.quantity) || 0, unitCost: Number(it.unitCost) || 0 })),
      }
      if (!body.fleetNumber) return toast.error('Selecione a máquina (ou implemente O.S. genérica por fazenda)')
      await api('/service-orders', { method: 'POST', body: JSON.stringify(body) })
      toast.success('O.S. criada'); setForm(null); load()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const act = async (o, action) => {
    setBusy(true)
    try {
      await api(`/service-orders/${o.id}/${action}`, { method: 'POST' })
      toast.success({ approve: 'Aprovada', close: 'Fechada (custo consolidado)', cancel: 'Cancelada' }[action])
      load(); if (detail?.id === o.id) openDetail(o.id)
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const openDetail = async (id) => {
    try { const d = await api(`/service-orders/${id}`); setDetail(d); setDiag({ failureClass: d.failureClass || '', rootCause: d.rootCause || '' }) }
    catch (e) { toast.error(e.message) }
  }

  const [diag, setDiag] = useState({ failureClass: '', rootCause: '' })
  const saveDiag = async () => {
    try {
      const res = await api(`/service-orders/${detail.id}/diagnosis`, { method: 'PUT', body: JSON.stringify({ failureClass: diag.failureClass || null, rootCause: diag.rootCause || null }) })
      setDetail(d => ({ ...d, failureClass: res.failureClass, rootCause: res.rootCause }))
      toast.success('Diagnóstico salvo')
    } catch (e) { toast.error(e.message) }
  }

  const [linkTo, setLinkTo] = useState('')
  const [linkRel, setLinkRel] = useState('')
  const doLink = async () => {
    if (!linkTo) return
    try {
      const res = await api(`/service-orders/${detail.id}/links`, { method: 'POST', body: JSON.stringify({ relatedOrderId: Number(linkTo), relation: linkRel || null }) })
      setDetail(d => ({ ...d, related: res.related })); setLinkTo(''); setLinkRel('')
      toast.success('O.S. associada')
    } catch (e) { toast.error(e.message) }
  }
  const doUnlink = async (relId) => {
    try {
      const res = await api(`/service-orders/${detail.id}/links/${relId}`, { method: 'DELETE' })
      setDetail(d => ({ ...d, related: res.related })); toast.success('Associação removida')
    } catch (e) { toast.error(e.message) }
  }
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('pt-BR') : '—'

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardList className="w-6 h-6 text-primary" /> Ordens de Serviço</h1>
          <p className="text-muted-foreground text-sm">Fluxo: <b>Orçamento</b> → <b>Aprovar</b> → <b>Fechar</b> (baixa estoque + custo realizado). As que aguardam aprovação ficam no filtro <b>Aguardando aprovação</b>.</p>
        </div>
        {canManage && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Nova O.S.</Button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={Clock} label="Pipeline (orçamentos)" value={brl(kpis.totals?.pipeline)} color="text-amber-500" />
        <KpiCard icon={Wallet} label="Comprometido (aprovadas)" value={brl(kpis.totals?.committed)} color="text-blue-500" />
        <KpiCard icon={CircleDollarSign} label="Realizado (fechadas)" value={brl(kpis.totals?.realized)} color="text-emerald-500" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['', 'Todas', null], ['orcamento', 'Aguardando aprovação', kpis.counts?.orcamento], ['aprovada', 'Aprovadas (a fechar)', kpis.counts?.aprovada], ['fechada', 'Fechadas', kpis.counts?.fechada], ['cancelada', 'Canceladas', kpis.counts?.cancelada]].map(([v, l, n]) => {
          const pending = v === 'orcamento' && n > 0 && statusFilter !== v
          return (
            <Button key={v || 'all'} size="sm" variant={statusFilter === v ? 'default' : 'outline'}
              className={pending ? 'border-amber-500/60 text-amber-600' : ''} onClick={() => setStatusFilter(v)}>
              {l}{n != null ? ` (${n})` : ''}
            </Button>
          )
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead><TableHead>Título</TableHead><TableHead>Máquina</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-right">Estimado</TableHead>
                <TableHead className="text-right">Realizado</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma ordem de serviço.</TableCell></TableRow>}
              {orders.map(o => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => openDetail(o.id)}>
                  <TableCell className="font-mono text-xs">{o.number || `#${o.id}`}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{o.title}</TableCell>
                  <TableCell className="font-mono text-xs">{o.fleetNumber || '—'}</TableCell>
                  <TableCell><Badge variant="outline" className={STATUS[o.status]?.cls}>{STATUS[o.status]?.label || o.status}</Badge></TableCell>
                  <TableCell className="text-right">{brl(o.estimatedCost)}</TableCell>
                  <TableCell className="text-right">{o.actualCost != null ? brl(o.actualCost) : '—'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    {o.pdfFilename && <Button size="icon" variant="ghost" title="Baixar PDF" onClick={() => apiDownload(`/service-orders/${o.id}/pdf`, `os-${o.id}.pdf`).catch(err => toast.error(err.message))}><FileDown className="w-4 h-4" /></Button>}
                    {canManage && o.status === 'orcamento' && <Button size="icon" variant="ghost" title="Aprovar" onClick={() => act(o, 'approve')} disabled={busy}><CheckCircle2 className="w-4 h-4 text-blue-600" /></Button>}
                    {canManage && o.status === 'aprovada' && <Button size="icon" variant="ghost" title="Fechar" onClick={() => act(o, 'close')} disabled={busy}><Lock className="w-4 h-4 text-emerald-600" /></Button>}
                    {canManage && (o.status === 'orcamento' || o.status === 'aprovada') && <Button size="icon" variant="ghost" title="Cancelar" onClick={() => act(o, 'cancel')} disabled={busy}><XCircle className="w-4 h-4 text-red-500" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Diálogo: nova O.S. */}
      <Dialog open={!!form} onOpenChange={v => !v && setForm(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Ordem de Serviço</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed p-3 flex items-center gap-3">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">Importar de PDF (orçamento da oficina)</p>
                  <p className="text-muted-foreground text-xs">Extração automática dos campos — confira antes de salvar.</p>
                </div>
                <Input type="file" accept="application/pdf" className="max-w-[180px]" disabled={busy} onChange={e => uploadPdf(e.target.files?.[0])} />
              </div>
              {extract && !extract.recognized && (
                <p className="text-xs text-amber-600 bg-amber-500/10 rounded p-2">Layout não reconhecido com confiança — preencha/ajuste os campos manualmente.</p>
              )}
              {form.extractedSupplier && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">Fornecedor/oficina detectado no PDF: <span className="font-medium text-foreground">{form.extractedSupplier}</span> — selecione o cadastro correspondente, se houver.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Revisão dos 500h" /></div>
                <div><Label>Nº da O.S. (opcional)</Label><Input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} placeholder="Ex: 136-2026" /></div>
                <div>
                  <Label>Máquina</Label>
                  <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={form.fleetNumber} onChange={e => setForm({ ...form, fleetNumber: e.target.value })}>
                    <option value="">Selecione…</option>
                    {fleets.map(f => <option key={f.id || f.fleet_number} value={f.fleet_number}>{f.fleet_number}</option>)}
                  </select>
                </div>
                <div><Label>Observações</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Itens</Label><Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" /> Item</Button></div>
                {form.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={it.kind} onChange={e => setItem(i, { kind: e.target.value })}>
                        {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
                      </select>
                    </div>
                    {it.kind === 'part' ? (
                      <div className="col-span-4">
                        <SearchSelect
                          options={parts.map(p => ({ value: p.id, label: p.name, hint: [p.sku, p.brand].filter(Boolean).join(' · ') }))}
                          value={it.partId}
                          onChange={(v) => onPickPart(i, v)}
                          placeholder="Buscar peça (nome/nº)…"
                        />
                      </div>
                    ) : (
                      <div className="col-span-4"><Input placeholder="Descrição" value={it.description} onChange={e => setItem(i, { description: e.target.value })} /></div>
                    )}
                    <div className="col-span-2"><Input type="number" step="0.01" placeholder="Qtd" value={it.quantity} onChange={e => setItem(i, { quantity: e.target.value })} /></div>
                    <div className="col-span-2"><Input type="number" step="0.01" placeholder="R$/un" value={it.unitCost} onChange={e => setItem(i, { unitCost: e.target.value })} /></div>
                    <div className="col-span-1"><Button size="icon" variant="ghost" onClick={() => rmItem(i)}><Trash2 className="w-4 h-4 text-red-500" /></Button></div>
                  </div>
                ))}
                <p className="text-right text-sm text-muted-foreground">Estimado: <span className="font-semibold text-foreground">{brl(estimated)}</span></p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>Salvar orçamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: detalhe */}
      <Dialog open={!!detail} onOpenChange={v => !v && setDetail(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.number ? `O.S. ${detail.number}` : `O.S. #${detail?.id}`}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={STATUS[detail.status]?.cls}>{STATUS[detail.status]?.label}</Badge>
                {detail.maintenanceType && <Badge variant="outline" className="capitalize">{detail.maintenanceType}</Badge>}
                <span className="text-muted-foreground font-mono text-xs">{detail.fleetNumber || 'Sem máquina'}</span>
                {detail.pdfFilename && <Button size="sm" variant="outline" className="ml-auto h-7" onClick={() => apiDownload(`/service-orders/${detail.id}/pdf`, `os-${detail.id}.pdf`).catch(err => toast.error(err.message))}><FileDown className="w-3.5 h-3.5 mr-1" /> PDF</Button>}
              </div>
              <p className="font-medium">{detail.title}</p>

              {/* Estado atual + próximo passo (deixa explícito o ciclo orçamento→aprovada→fechada) */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">{STATUS[detail.status]?.desc}</p>
                {canManage && (STATUS[detail.status]?.next || detail.status === 'orcamento' || detail.status === 'aprovada') && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {STATUS[detail.status]?.next && (
                      <Button size="sm" disabled={busy}
                        onClick={() => act(detail, STATUS[detail.status].next.action)}>
                        {STATUS[detail.status].next.label} →
                      </Button>
                    )}
                    {(detail.status === 'orcamento' || detail.status === 'aprovada') && (
                      <Button size="sm" variant="ghost" className="text-red-500" disabled={busy}
                        onClick={() => act(detail, 'cancel')}>Cancelar O.S.</Button>
                    )}
                  </div>
                )}
              </div>

              {/* Datas do ciclo de vida */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded bg-muted/40 p-2"><p className="text-muted-foreground">Aberta</p><p className="font-medium">{fmtDate(detail.openedAt)}</p></div>
                <div className="rounded bg-muted/40 p-2"><p className="text-muted-foreground">Aprovada</p><p className="font-medium">{fmtDate(detail.approvedAt)}</p></div>
                <div className="rounded bg-muted/40 p-2"><p className="text-muted-foreground">Fechada</p><p className="font-medium">{fmtDate(detail.closedAt)}</p></div>
              </div>
              {detail.notes && <p className="text-muted-foreground"><span className="font-medium text-foreground">Obs.:</span> {detail.notes}</p>}

              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">R$/un</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(detail.items || []).map(it => (
                    <TableRow key={it.id}><TableCell>{it.description}</TableCell><TableCell className="text-right">{it.quantity}</TableCell><TableCell className="text-right">{brl(it.unitCost)}</TableCell><TableCell className="text-right">{brl(it.lineTotal)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between border-t pt-2">
                <span>Estimado: <b>{brl(detail.estimatedCost)}</b></span>
                {detail.actualCost != null && <span>Realizado: <b>{brl(detail.actualCost)}</b></span>}
              </div>

              {/* Diagnóstico / causa-raiz ("5 porquês") — base do histórico de quebras */}
              <div className="border-t pt-3 space-y-2">
                <p className="font-medium">Diagnóstico / causa-raiz</p>
                {canManage ? (
                  <div className="space-y-2">
                    <select className="w-full h-9 rounded-md border bg-background px-2 text-sm" value={diag.failureClass} onChange={e => setDiag({ ...diag, failureClass: e.target.value })}>
                      <option value="">Classe da falha…</option>
                      <option value="operacional">Operacional (uso/regulagem)</option>
                      <option value="maquina">Máquina (defeito/componente)</option>
                      <option value="desgaste">Desgaste natural</option>
                      <option value="outro">Outro</option>
                    </select>
                    <textarea className="w-full min-h-[70px] rounded-md border bg-background px-2 py-1 text-sm" placeholder="Por que/como quebrou? (5 porquês)" value={diag.rootCause} onChange={e => setDiag({ ...diag, rootCause: e.target.value })} />
                    <div className="flex justify-end"><Button size="sm" onClick={saveDiag}>Salvar diagnóstico</Button></div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {detail.failureClass && <p><span className="font-medium text-foreground capitalize">{detail.failureClass}</span></p>}
                    <p>{detail.rootCause || 'Sem diagnóstico registrado.'}</p>
                  </div>
                )}
              </div>

              {/* O.S. relacionadas (retrabalho, mesma causa raiz…) */}
              <div className="border-t pt-3 space-y-2">
                <p className="font-medium flex items-center gap-1.5"><Link2 className="w-4 h-4 text-primary" /> Serviços relacionados</p>
                {(detail.related || []).length === 0 && <p className="text-xs text-muted-foreground">Nenhuma O.S. associada.</p>}
                {(detail.related || []).map(r => (
                  <div key={r.id} className="flex items-center gap-2 rounded border p-2">
                    <button className="text-left flex-1 hover:underline" onClick={() => openDetail(r.id)}>
                      <span className="font-mono text-xs">{r.number || `#${r.id}`}</span> · {r.title}
                      {r.relation && <span className="text-xs text-muted-foreground"> — {r.relation}</span>}
                    </button>
                    <Badge variant="outline" className={STATUS[r.status]?.cls}>{STATUS[r.status]?.label || r.status}</Badge>
                    {canManage && <Button size="icon" variant="ghost" className="h-7 w-7" title="Remover associação" onClick={() => doUnlink(r.id)}><XCircle className="w-4 h-4 text-red-500" /></Button>}
                  </div>
                ))}
                {canManage && (
                  <div className="flex items-end gap-2 pt-1">
                    <select className="h-9 rounded-md border bg-background px-2 text-sm flex-1" value={linkTo} onChange={e => setLinkTo(e.target.value)}>
                      <option value="">Associar outra O.S.…</option>
                      {orders.filter(o => o.id !== detail.id && !(detail.related || []).some(r => r.id === o.id)).map(o => (
                        <option key={o.id} value={o.id}>{o.number || `#${o.id}`} · {o.title}</option>
                      ))}
                    </select>
                    <Input className="max-w-[140px]" placeholder="Relação (opcional)" value={linkRel} onChange={e => setLinkRel(e.target.value)} />
                    <Button size="sm" onClick={doLink} disabled={!linkTo}><Link2 className="w-4 h-4 mr-1" /> Associar</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
