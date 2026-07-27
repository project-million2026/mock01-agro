'use client'

import { useState, useCallback, useEffect } from 'react'
import { Wrench, Clock, Wallet, ShieldCheck, ShieldAlert, Plus, X } from 'lucide-react'
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

export default function MaintenancePage() {
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState([])
  const [confirming, setConfirming] = useState(null)
  const [form, setForm] = useState({ parts_cost: '', labor_cost: '' })
  const [partsCatalog, setPartsCatalog] = useState([])
  const [partLines, setPartLines] = useState([]) // [{ part_id, quantity }]
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const [m, k, p] = await Promise.all([
        api('/maintenance'),
        api('/kpis/maintenance-costs?days=90'),
        api('/parts'),
      ])
      setItems(m.items || [])
      setSummary(k.fleets || [])
      setPartsCatalog(p.items || [])
    } catch (e) { toast.error(e.message) }
  }, [])

  useEffect(() => { queueMicrotask(load) }, [load])

  const startConfirm = (item) => {
    setConfirming(item)
    setForm({ parts_cost: item.partsCost ?? '', labor_cost: item.laborCost ?? '' })
    setPartLines([])
  }

  // Custo das peças selecionadas (calculado a partir do catálogo).
  const partsById = Object.fromEntries(partsCatalog.map(p => [String(p.id), p]))
  const computedPartsCost = partLines.reduce((s, l) => {
    const p = partsById[String(l.part_id)]
    return s + (p ? p.unitCost * (parseFloat(l.quantity) || 0) : 0)
  }, 0)
  const usingParts = partLines.length > 0

  const submitConfirm = async () => {
    setLoading(true)
    try {
      const body = { labor_cost: parseFloat(form.labor_cost) || 0 }
      if (usingParts) {
        body.parts = partLines
          .filter(l => l.part_id && parseFloat(l.quantity) > 0)
          .map(l => ({ part_id: parseInt(l.part_id, 10), quantity: parseFloat(l.quantity) }))
      } else {
        body.parts_cost = parseFloat(form.parts_cost) || 0
      }
      await api(`/maintenance/${confirming.id}/confirm`, { method: 'PUT', body: JSON.stringify(body) })
      toast.success('O.S. confirmada')
      setConfirming(null)
      load()
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }

  const totalCost = summary.reduce((s, f) => s + f.totalCost, 0)
  const openCount = items.filter(i => !i.endedAt).length
  const pendingCount = items.filter(i => !i.confirmed).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Wrench className="w-7 h-7 text-primary" /> Manutenção</h1>
        <p className="text-muted-foreground text-sm">Downtime de oficina detectado por geofencing — confirme a O.S. e registre os custos</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Wrench} label="Em Oficina" value={openCount} color="text-amber-400" />
        <KpiCard icon={ShieldAlert} label="Pendentes de Confirmação" value={pendingCount} color="text-rose-400" />
        <KpiCard icon={Wallet} label="Custo Total (90d)" value={`R$ ${totalCost.toFixed(2)}`} color="text-primary" />
        <KpiCard icon={Clock} label="Registros" value={items.length} />
      </div>

      <Card className="glow-card overflow-hidden">
        <CardHeader>
          <CardTitle>Downtimes de Manutenção</CardTitle>
          <CardDescription>Pendentes de confirmação aparecem primeiro</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto custom-scrollbar">
          <Table className="w-full min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Frota</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead className="text-right">Horas Paradas</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono font-semibold text-primary">{item.fleetNumber}</TableCell>
                  <TableCell className="text-xs">{new Date(item.startedAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-xs">{item.endedAt ? new Date(item.endedAt).toLocaleString('pt-BR') : <Badge variant="secondary">Em oficina</Badge>}</TableCell>
                  <TableCell className="text-right font-mono">{item.downtimeHours}</TableCell>
                  <TableCell className="text-right font-mono text-primary">R$ {item.totalCost.toFixed(2)}</TableCell>
                  <TableCell>
                    {item.confirmed
                      ? <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><ShieldCheck className="w-3 h-3 mr-1" /> Confirmado</Badge>
                      : <Badge variant="destructive">Pendente</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => startConfirm(item)}>
                      {item.confirmed ? 'Editar Custos' : 'Confirmar O.S.'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum registro de manutenção ainda</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!confirming} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar O.S. — {confirming?.fleetNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Peças usadas (dá baixa no estoque)</Label>
                <Button type="button" size="sm" variant="ghost" className="h-7 px-2"
                  onClick={() => setPartLines([...partLines, { part_id: '', quantity: '1' }])}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Peça
                </Button>
              </div>
              {partLines.map((l, i) => {
                const p = partsById[String(l.part_id)]
                return (
                  <div key={i} className="flex items-center gap-2">
                    <select value={l.part_id}
                      onChange={e => setPartLines(partLines.map((x, j) => j === i ? { ...x, part_id: e.target.value } : x))}
                      className="flex-1 bg-secondary/50 border border-border/50 text-sm rounded-md px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Selecione…</option>
                      {partsCatalog.map(pc => (
                        <option key={pc.id} value={pc.id}>{pc.name} ({pc.quantity} {pc.unit})</option>
                      ))}
                    </select>
                    <Input type="number" className="w-20" value={l.quantity}
                      onChange={e => setPartLines(partLines.map((x, j) => j === i ? { ...x, quantity: e.target.value } : x))} />
                    <span className="text-xs text-muted-foreground w-16 text-right">{p ? `R$ ${(p.unitCost * (parseFloat(l.quantity) || 0)).toFixed(2)}` : '—'}</span>
                    <button type="button" onClick={() => setPartLines(partLines.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-rose-400"><X className="w-4 h-4" /></button>
                  </div>
                )
              })}
            </div>
            <div className="space-y-1.5">
              <Label>Custo de Peças (R$)</Label>
              {usingParts ? (
                <div className="text-sm font-mono px-3 py-2 rounded-md bg-secondary/40 border border-border/40">R$ {computedPartsCost.toFixed(2)} <span className="text-xs text-muted-foreground">(calculado das peças)</span></div>
              ) : (
                <Input type="number" value={form.parts_cost} onChange={e => setForm({ ...form, parts_cost: e.target.value })} placeholder="0.00" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Custo de Mão de Obra (R$)</Label>
              <Input type="number" value={form.labor_cost} onChange={e => setForm({ ...form, labor_cost: e.target.value })} placeholder="0.00" />
            </div>
            {confirming && (
              <p className="text-xs text-muted-foreground">
                Custo de parada (horas x taxa/h da frota): {confirming.hourlyRate != null ? `R$ ${(confirming.downtimeHours * confirming.hourlyRate).toFixed(2)}` : 'taxa/h não cadastrada em Frotas'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)}>Cancelar</Button>
            <Button onClick={submitConfirm} disabled={loading}>{loading ? 'Salvando...' : 'Confirmar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
