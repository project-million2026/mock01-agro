'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Gauge, Route, Package, Coins, ChevronRight, Info, Search, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { api } from '@/lib/apiClient'
import { KpiCard } from '@/components/KpiCard'

const num = (v, d = 1) => (v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: d })
const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const km = (v) => `${num(v, 1)} km`

// Célula de métrica que NUNCA mostra número enganoso: sem km no período não há divisão possível,
// então explicita o motivo em vez de exibir 0 (regra de UX: todo vazio é justificado).
const Metric = ({ value, suffix, title }) =>
  value == null
    ? <span className="text-xs text-muted-foreground" title={title}>sem km no período</span>
    : <span className="font-semibold">{num(value, 2)}{suffix}</span>

// Relatório AUTOMÁTICO de peças por km rodado (#66): o km vem do rollup que o worker acumula do
// GPS e a peça vem da baixa de estoque no fechamento da O.S. — nenhuma quilometragem é digitada.
// Métricas recalculadas no cliente quando há filtro de peça (o km da máquina não muda — só o
// consumo considerado). Mesma regra do backend: sem km, métrica é null em vez de número enganoso.
const metrics = (km, qty, cost) => ({
  kmPerPart: km > 0 && qty > 0 ? Math.round((km / qty) * 10) / 10 : null,
  partsPer1000Km: km > 0 ? Math.round((qty / km) * 1000 * 100) / 100 : null,
  costPerKm: km > 0 ? Math.round((cost / km) * 100) / 100 : null,
})

// Consolida os KPIs do topo a partir das máquinas visíveis (respeita o filtro aplicado).
const totalsOf = (list) => {
  const distanceKm = list.reduce((s, m) => s + (m.distanceKm || 0), 0)
  const partsQty = list.reduce((s, m) => s + (m.partsQty || 0), 0)
  const partsCost = list.reduce((s, m) => s + (m.partsCost || 0), 0)
  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    partsQty: Math.round(partsQty * 100) / 100,
    partsCost: Math.round(partsCost * 100) / 100,
    ...metrics(distanceKm, partsQty, partsCost),
  }
}

export default function PecasPorKmPage() {
  const [data, setData] = useState({ machines: [], totals: {} })
  const [days, setDays] = useState(90)
  const [open, setOpen] = useState(null)
  const [q, setQ] = useState('')          // busca de peça: nome, código, ou os dois
  const [fleet, setFleet] = useState('')  // filtro por máquina

  const load = useCallback(async () => {
    try { setData(await api(`/kpis/parts-per-km?days=${days}`)) }
    catch (e) { toast.error(e.message) }
  }, [days])

  useEffect(() => { queueMicrotask(load) }, [load])

  const fleets = useMemo(
    () => (data.machines || []).map(m => m.fleetNumber).sort(),
    [data.machines])

  // Filtro: cada termo digitado precisa casar em "nome + código" (permite "correia 220").
  const { machines, t } = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const src = (data.machines || []).filter(m => !fleet || m.fleetNumber === fleet)
    if (!terms.length) {
      return { machines: src, t: fleet ? totalsOf(src) : (data.totals || {}) }
    }
    const out = []
    for (const m of src) {
      const parts = (m.parts || []).filter(p => {
        const hay = `${p.name || ''} ${p.sku || ''}`.toLowerCase()
        return terms.every(term => hay.includes(term))
      })
      if (!parts.length) continue
      const qty = parts.reduce((s, p) => s + p.qty, 0)
      const cost = parts.reduce((s, p) => s + p.cost, 0)
      out.push({ ...m, parts, partsQty: Math.round(qty * 100) / 100,
                 partsCost: Math.round(cost * 100) / 100, ...metrics(m.distanceKm, qty, cost) })
    }
    out.sort((a, b) => (a.partsPer1000Km == null ? 1 : 0) - (b.partsPer1000Km == null ? 1 : 0)
                       || (b.partsPer1000Km || 0) - (a.partsPer1000Km || 0))
    return { machines: out, t: totalsOf(out) }
  }, [data, q, fleet])

  const filtering = !!(q.trim() || fleet)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard icon={Route} label="Km rodados no período" value={km(t.distanceKm)} color="text-blue-500" />
        <KpiCard icon={Package} label="Peças consumidas" value={num(t.partsQty, 2)} color="text-amber-500" />
        <KpiCard icon={Gauge} label="Peças / 1.000 km" value={t.partsPer1000Km == null ? '—' : num(t.partsPer1000Km, 2)} color="text-emerald-500" />
        <KpiCard icon={Coins} label="Custo de peça por km" value={t.costPerKm == null ? '—' : brl(t.costPerKm)} color="text-rose-500" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><Gauge className="w-5 h-5 text-primary" /> Peças por km rodado</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Automático: km do GPS (rollup diário) × baixa de peça no fechamento da O.S. — nada é digitado.
            </p>
          </div>
          <div className="flex gap-1">
            {[30, 90, 180].map(d => (
              <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'} onClick={() => setDays(d)}>{d}d</Button>
            ))}
          </div>
        </CardHeader>

        <div className="px-6 pb-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 pr-9"
                   placeholder="Buscar peça por nome ou código (ex.: correia, COR-220)" />
            {q && (
              <button type="button" onClick={() => setQ('')} aria-label="Limpar busca"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant={fleet === '' ? 'default' : 'outline'} onClick={() => setFleet('')}>Todas</Button>
            {fleets.map(f => (
              <Button key={f} size="sm" variant={fleet === f ? 'default' : 'outline'}
                      className="font-mono text-xs" onClick={() => setFleet(f)}>{f}</Button>
            ))}
          </div>
        </div>
        {filtering && (
          <p className="px-6 pb-3 text-xs text-muted-foreground">
            Mostrando {machines.length} de {(data.machines || []).length} máquinas
            {q.trim() && <> · métricas recalculadas só para as peças que casam com “{q.trim()}”</>}
          </p>
        )}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Máquina</TableHead>
                <TableHead className="text-right">Km rodados</TableHead>
                <TableHead className="text-right">Peças</TableHead>
                <TableHead className="text-right">Km por peça</TableHead>
                <TableHead className="text-right">Peças / 1.000 km</TableHead>
                <TableHead className="text-right">R$ / km</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {filtering
                    ? <>Nenhuma peça encontrada para esse filtro. <button type="button" className="underline" onClick={() => { setQ(''); setFleet('') }}>Limpar filtros</button></>
                    : <>Sem consumo de peça atribuído a máquinas no período. As baixas entram aqui quando a O.S. é fechada.</>}
                </TableCell></TableRow>
              )}
              {machines.map((m) => {
                // Buscando por peça, já abre o detalhe — o que interessa é justamente a peça casada.
                const isOpen = open === m.fleetNumber || !!q.trim()
                return [
                  <TableRow key={m.fleetNumber} className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setOpen(isOpen ? null : m.fleetNumber)}>
                    <TableCell className="font-mono text-xs flex items-center gap-1">
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      {m.fleetNumber}
                      <Badge variant="outline" className="ml-1 text-[10px]">{m.parts?.length || 0} peças</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{km(m.distanceKm)}</TableCell>
                    <TableCell className="text-right">{num(m.partsQty, 2)}</TableCell>
                    <TableCell className="text-right"><Metric value={m.kmPerPart} suffix=" km" title="Km rodados por peça consumida" /></TableCell>
                    <TableCell className="text-right"><Metric value={m.partsPer1000Km} title="Peças consumidas a cada 1.000 km" /></TableCell>
                    <TableCell className="text-right">{m.costPerKm == null ? <Metric value={null} /> : brl(m.costPerKm)}</TableCell>
                  </TableRow>,
                  isOpen && (
                    <TableRow key={`${m.fleetNumber}-parts`} className="bg-muted/30">
                      <TableCell colSpan={6} className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="pl-10">Peça</TableHead>
                              <TableHead className="text-right">Qtd</TableHead>
                              <TableHead className="text-right">Custo</TableHead>
                              <TableHead className="text-right">Km por peça</TableHead>
                              <TableHead className="text-right">Peças / 1.000 km</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(m.parts || []).map((p) => (
                              <TableRow key={p.partId}>
                                <TableCell className="pl-10">
                                  {p.name}
                                  {p.sku && <span className="ml-2 font-mono text-[10px] text-muted-foreground">{p.sku}</span>}
                                </TableCell>
                                <TableCell className="text-right">{num(p.qty, 2)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{brl(p.cost)}</TableCell>
                                <TableCell className="text-right"><Metric value={p.kmPerPart} suffix=" km" /></TableCell>
                                <TableCell className="text-right"><Metric value={p.partsPer1000Km} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  ),
                ]
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
