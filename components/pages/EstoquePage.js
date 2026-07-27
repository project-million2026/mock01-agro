'use client'

import { useState, useCallback, useEffect } from 'react'
import { Package, AlertTriangle, Wallet, Boxes, Plus, ArrowLeftRight, History, Search, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { api } from '@/lib/apiClient'
import { KpiCard } from '@/components/KpiCard'
import SearchSelect from '@/components/SearchSelect'

const EMPTY = { name: '', sku: '', brand: '', unit: 'un', unit_cost: '', quantity: '', min_quantity: '', supplier_id: '', lote: '' }
const EMPTY_MOVE = { direction: 'in', quantity: '', lote: '', supplier_id: '', unit_cost: '', note: '' }

export default function EstoquePage({ currentUserRole }) {
  const [view, setView] = useState('parts')     // 'parts' | 'movements'
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState({ count: 0, totalValue: 0, lowStock: 0 })
  const [suppliers, setSuppliers] = useState([])
  const [movements, setMovements] = useState([])
  const [onlyLow, setOnlyLow] = useState(false)
  const [q, setQ] = useState('')                  // busca do catálogo (nome/SKU/marca/fornecedor)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [moving, setMoving] = useState(null)      // peça sendo movimentada
  const [moveForm, setMoveForm] = useState(EMPTY_MOVE)
  const [history, setHistory] = useState(null)    // { part, rows }
  const [loading, setLoading] = useState(false)
  const canManage = currentUserRole === 'admin' || currentUserRole === 'manager'

  const load = useCallback(async () => {
    try {
      const [p, s, sup] = await Promise.all([api('/parts'), api('/parts/summary'), api('/suppliers')])
      setItems(p.items || [])
      setSummary(s || { count: 0, totalValue: 0, lowStock: 0 })
      setSuppliers(sup.items || [])
    } catch (e) { toast.error(e.message) }
  }, [])

  useEffect(() => { queueMicrotask(load) }, [load])

  const loadMovements = useCallback(async () => {
    try { const r = await api('/parts/movements?limit=500'); setMovements(r.items || []) }
    catch (e) { toast.error(e.message) }
  }, [])

  useEffect(() => { if (view === 'movements') queueMicrotask(loadMovements) }, [view, loadMovements])

  const openCreate = () => { setForm(EMPTY); setEditing({}) }
  const openEdit = (p) => {
    setForm({ name: p.name, sku: p.sku || '', brand: p.brand || '', unit: p.unit, unit_cost: p.unitCost, quantity: p.quantity, min_quantity: p.minQuantity, supplier_id: p.supplierId ? String(p.supplierId) : '', lote: p.lote || '' })
    setEditing(p)
  }

  const save = async () => {
    if (!form.supplier_id) return toast.error('Selecione o fornecedor (obrigatório)')
    setLoading(true)
    try {
      const body = {
        name: form.name, sku: form.sku || null, brand: form.brand || null, unit: form.unit || 'un',
        supplier_id: Number(form.supplier_id), lote: form.lote || null,
        unit_cost: parseFloat(form.unit_cost) || 0, quantity: parseFloat(form.quantity) || 0,
        min_quantity: parseFloat(form.min_quantity) || 0,
      }
      if (editing.id) await api(`/parts/${editing.id}`, { method: 'PUT', body: JSON.stringify(body) })
      else await api('/parts', { method: 'POST', body: JSON.stringify(body) })
      toast.success('Peça salva'); setEditing(null); load()
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }

  const openMove = (p, direction) => { setMoving(p); setMoveForm({ ...EMPTY_MOVE, direction }) }
  const doMove = async () => {
    setLoading(true)
    try {
      const body = {
        direction: moveForm.direction, quantity: parseFloat(moveForm.quantity) || 0,
        lote: moveForm.lote || null,
        supplier_id: moveForm.supplier_id ? parseInt(moveForm.supplier_id, 10) : null,
        unit_cost: moveForm.unit_cost !== '' ? parseFloat(moveForm.unit_cost) : null,
        note: moveForm.note || null,
      }
      await api(`/parts/${moving.id}/movements`, { method: 'POST', body: JSON.stringify(body) })
      toast.success(moveForm.direction === 'in' ? 'Entrada registrada' : 'Saída registrada')
      setMoving(null); load(); if (view === 'movements') loadMovements()
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }

  const openHistory = async (p) => {
    try { const r = await api(`/parts/${p.id}/movements`); setHistory({ part: p, rows: r.items || [] }) }
    catch (e) { toast.error(e.message) }
  }

  const remove = async (p) => {
    try { await api(`/parts/${p.id}`, { method: 'DELETE' }); toast.success('Peça excluída'); load() }
    catch (e) { toast.error(e.message) }
  }

  // Busca ampla do catálogo (ele só cresce): casa por nome, SKU, marca ou fornecedor — cada termo
  // digitado precisa aparecer em algum desses campos, então "bosch filtro" e "FLT-100" funcionam.
  const rows = (() => {
    const base = onlyLow ? items.filter(i => i.lowStock) : items
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return base
    return base.filter(p => {
      const hay = `${p.name || ''} ${p.sku || ''} ${p.brand || ''} ${p.supplierName || ''} ${p.lote || ''}`.toLowerCase()
      return terms.every(t => hay.includes(t))
    })
  })()
  const moveIsOut = moveForm.direction === 'out'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Package className="w-7 h-7 text-primary" /> Estoque de Peças</h1>
          <p className="text-muted-foreground text-sm">Catálogo, movimentação (entrada/saída) e histórico — consumido nas O.S.</p>
        </div>
        {canManage && view === 'parts' && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Nova Peça</Button>}
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={view === 'parts' ? 'default' : 'outline'} onClick={() => setView('parts')}>Estoque</Button>
        <Button size="sm" variant={view === 'movements' ? 'default' : 'outline'} onClick={() => setView('movements')}><ArrowLeftRight className="w-4 h-4 mr-2" /> Movimentações</Button>
      </div>

      {view === 'parts' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard icon={Boxes} label="Itens no Catálogo" value={summary.count} />
            <KpiCard icon={Wallet} label="Valor em Estoque" value={`R$ ${Number(summary.totalValue).toFixed(2)}`} color="text-primary" />
            <KpiCard icon={AlertTriangle} label="Estoque Baixo" value={summary.lowStock} color={summary.lowStock > 0 ? 'text-rose-400' : 'text-muted-foreground'} />
          </div>

          <Card className="glow-card overflow-hidden">
            <CardHeader className="flex-row items-center justify-between">
              <div><CardTitle>Peças</CardTitle><CardDescription>Itens abaixo do mínimo aparecem destacados</CardDescription></div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={q} onChange={e => setQ(e.target.value)} className="pl-9 pr-8 w-full sm:w-72"
                         placeholder="Buscar por nome, SKU, marca ou fornecedor" />
                  {q && (
                    <button type="button" onClick={() => setQ('')} aria-label="Limpar busca"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Button size="sm" variant={onlyLow ? 'default' : 'outline'} onClick={() => setOnlyLow(v => !v)}><AlertTriangle className="w-4 h-4 mr-2" /> Só estoque baixo</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto custom-scrollbar">
              <Table className="w-full min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Peça</TableHead><TableHead>Marca</TableHead><TableHead>SKU</TableHead>
                    <TableHead className="text-right">Saldo</TableHead><TableHead className="text-right">Mínimo</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead><TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(p => (
                    <TableRow key={p.id} className={p.lowStock ? 'bg-rose-500/5' : ''}>
                      <TableCell className="font-medium">{p.name} {p.lowStock && <Badge variant="destructive" className="ml-2"><AlertTriangle className="w-3 h-3 mr-1" /> Baixo</Badge>}</TableCell>
                      <TableCell className="text-muted-foreground">{p.brand || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.sku || '—'}</TableCell>
                      <TableCell className="text-right font-mono">{p.quantity} {p.unit}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{p.minQuantity}</TableCell>
                      <TableCell className="text-right font-mono">R$ {Number(p.unitCost).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-primary">R$ {Number(p.totalValue).toFixed(2)}</TableCell>
                      <TableCell className="text-right space-x-1 whitespace-nowrap">
                        <Button size="sm" variant="ghost" onClick={() => openHistory(p)}><History className="w-3.5 h-3.5" /></Button>
                        {canManage && <Button size="sm" variant="outline" onClick={() => openMove(p, 'in')}>Entrada</Button>}
                        {canManage && <Button size="sm" variant="outline" onClick={() => openMove(p, 'out')}>Saída</Button>}
                        {canManage && <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Editar</Button>}
                        {canManage && <Button size="sm" variant="ghost" className="text-rose-400" onClick={() => remove(p)}>Excluir</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {q.trim()
                        ? <>Nenhuma peça encontrada para “{q.trim()}”{onlyLow && ' entre as de estoque baixo'}. <button type="button" className="underline" onClick={() => setQ('')}>Limpar busca</button></>
                        : (onlyLow ? 'Nenhuma peça com estoque baixo' : 'Nenhuma peça cadastrada')}
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {view === 'movements' && (
        <Card className="glow-card overflow-hidden">
          <CardHeader><CardTitle>Movimentações de Estoque</CardTitle><CardDescription>Entradas, saídas e baixas por O.S. (mais recentes primeiro)</CardDescription></CardHeader>
          <CardContent className="p-0 overflow-x-auto custom-scrollbar">
            <MovementsTable rows={movements} />
          </CardContent>
        </Card>
      )}

      {/* Criar / editar peça */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing?.id ? 'Editar Peça' : 'Nova Peça'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Filtro de óleo" /></div>
            <div className="space-y-1.5">
              <Label>Fornecedor <span className="text-red-500">*</span></Label>
              <SearchSelect
                options={suppliers.map(s => ({ value: s.id, label: s.name, hint: s.document || '' }))}
                value={form.supplier_id}
                onChange={(v) => setForm({ ...form, supplier_id: String(v) })}
                placeholder="Buscar fornecedor por nome ou nº…"
              />
              {suppliers.length === 0 && <p className="text-xs text-amber-600">Cadastre um fornecedor antes (Oficina → Fornecedores).</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Marca</Label><Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Ex: Bosch" /></div>
              <div className="space-y-1.5"><Label>SKU</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Lote</Label><Input value={form.lote} onChange={e => setForm({ ...form, lote: e.target.value })} placeholder="Opcional" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Unid.</Label><Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="un" /></div>
              <div className="space-y-1.5"><Label>Custo</Label><Input type="number" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} placeholder="0.00" /></div>
              <div className="space-y-1.5"><Label>Saldo</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Estoque mínimo</Label>
              <Input type="number" value={form.min_quantity} onChange={e => setForm({ ...form, min_quantity: e.target.value })} placeholder="0" />
              <p className="text-xs text-muted-foreground"><b>0</b> = não controlar estoque desta peça (sem alerta de estoque baixo).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} disabled={loading || !form.name}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movimentar (entrada/saída) */}
      <Dialog open={!!moving} onOpenChange={(o) => !o && setMoving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{moveIsOut ? 'Saída' : 'Entrada'} — {moving?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Saldo atual: {moving?.quantity} {moving?.unit}</p>
            <div className="space-y-1.5"><Label>Quantidade</Label><Input type="number" value={moveForm.quantity} onChange={e => setMoveForm({ ...moveForm, quantity: e.target.value })} placeholder="0" /></div>
            {!moveIsOut && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Lote</Label><Input value={moveForm.lote} onChange={e => setMoveForm({ ...moveForm, lote: e.target.value })} placeholder="Opcional" /></div>
                  <div className="space-y-1.5"><Label>Custo Unit.</Label><Input type="number" value={moveForm.unit_cost} onChange={e => setMoveForm({ ...moveForm, unit_cost: e.target.value })} placeholder="atual" /></div>
                </div>
                <div className="space-y-1.5">
                  <Label>Fornecedor</Label>
                  <select value={moveForm.supplier_id} onChange={e => setMoveForm({ ...moveForm, supplier_id: e.target.value })}
                    className="w-full bg-secondary/50 border border-border/50 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary">
                    <option value="">—</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="space-y-1.5"><Label>Observação</Label><Input value={moveForm.note} onChange={e => setMoveForm({ ...moveForm, note: e.target.value })} placeholder="Opcional" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoving(null)}>Cancelar</Button>
            <Button onClick={doMove} disabled={loading || !(parseFloat(moveForm.quantity) > 0)}>{loading ? 'Salvando...' : (moveIsOut ? 'Registrar Saída' : 'Registrar Entrada')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Histórico por peça */}
      <Dialog open={!!history} onOpenChange={(o) => !o && setHistory(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Histórico — {history?.part?.name}</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-auto"><MovementsTable rows={history?.rows || []} compact /></div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MovementsTable({ rows, compact }) {
  return (
    <Table className={compact ? 'w-full' : 'w-full min-w-[900px]'}>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>{!compact && <TableHead>Peça</TableHead>}<TableHead>Tipo</TableHead>
          <TableHead className="text-right">Qtde</TableHead><TableHead className="text-right">Valor</TableHead>
          <TableHead>Lote</TableHead><TableHead>Fornecedor</TableHead><TableHead>Usuário</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(m => {
          const isIn = m.quantity > 0
          return (
            <TableRow key={m.id}>
              <TableCell className="text-xs whitespace-nowrap">{m.at ? new Date(m.at).toLocaleString('pt-BR') : '—'}</TableCell>
              {!compact && <TableCell className="font-medium">{m.partName}</TableCell>}
              <TableCell><Badge variant={isIn ? 'secondary' : 'outline'} className={isIn ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'text-amber-500 border-amber-500/20'}>{m.type}</Badge></TableCell>
              <TableCell className={`text-right font-mono ${isIn ? 'text-emerald-500' : 'text-amber-500'}`}>{isIn ? '+' : ''}{m.quantity}</TableCell>
              <TableCell className="text-right font-mono">R$ {Number(m.value).toFixed(2)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{m.lote || '—'}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{m.supplier || (m.maintenanceId ? `O.S. #${m.maintenanceId}` : '—')}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{m.user || '—'}</TableCell>
            </TableRow>
          )
        })}
        {rows.length === 0 && <TableRow><TableCell colSpan={compact ? 7 : 8} className="text-center text-muted-foreground py-8">Sem movimentações</TableCell></TableRow>}
      </TableBody>
    </Table>
  )
}
