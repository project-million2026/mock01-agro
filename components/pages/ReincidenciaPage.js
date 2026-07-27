'use client'

import { useState, useCallback, useEffect } from 'react'
import { RotateCcw, AlertOctagon, Coins, Link2, Info, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { api } from '@/lib/apiClient'
import { KpiCard } from '@/components/KpiCard'

const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dia = (s) => (s ? new Date(s).toLocaleDateString('pt-BR') : '—')

// Reincidência & retrabalho: "quais defeitos voltaram?" — o dinheiro que a 1ª intervenção não resolveu.
export default function ReincidenciaPage() {
  const [data, setData] = useState({ recurrences: [], linked: [], totals: {} })
  const [days, setDays] = useState(180)
  const [open, setOpen] = useState(null)

  const load = useCallback(async () => {
    try { setData(await api(`/kpis/rework?days=${days}`)) }
    catch (e) { toast.error(e.message) }
  }, [days])

  useEffect(() => { queueMicrotask(load) }, [load])

  const t = data.totals || {}
  const rec = data.recurrences || []
  const linked = data.linked || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard icon={RotateCcw} label="Causas que voltaram" value={t.recurringCauses ?? 0} color="text-rose-500" />
        <KpiCard icon={AlertOctagon} label="O.S. de repetição" value={t.repeatOrders ?? 0} color="text-amber-500" />
        <KpiCard icon={Coins} label="Custo da reincidência" value={brl(t.cost)} color="text-rose-500" />
        <KpiCard icon={Link2} label="Retrabalhos marcados" value={t.linkedPairs ?? 0} color="text-blue-500" />
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5 text-primary" /> Defeitos que voltaram</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Detecção <b className="mx-1">automática</b>: mesma máquina + mesma causa-raiz em mais de uma O.S. Sem causa registrada, não entra — não se afirma reincidência sem evidência.
            </p>
          </div>
          <div className="flex gap-1">
            {[90, 180, 365].map(d => (
              <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'} onClick={() => setDays(d)}>{d}d</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto custom-scrollbar">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Máquina</TableHead>
                <TableHead>Causa-raiz</TableHead>
                <TableHead className="text-right">Ocorrências</TableHead>
                <TableHead className="text-right">Intervalo</TableHead>
                <TableHead className="text-right">Custo acumulado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rec.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum defeito reincidente no período — ou as O.S. não têm causa-raiz preenchida.
                </TableCell></TableRow>
              )}
              {rec.map((g, i) => {
                const isOpen = open === i
                return [
                  <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => setOpen(isOpen ? null : i)}>
                    <TableCell className="font-mono text-xs flex items-center gap-1">
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      {g.fleetNumber}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate" title={g.cause}>{g.cause}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={g.occurrences >= 3 ? 'bg-rose-500/15 text-rose-600 border-rose-500/30' : 'bg-amber-500/15 text-amber-600 border-amber-500/30'}>
                        {g.occurrences}×
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {g.daysBetweenFirstAndLast == null ? '—' : `${g.daysBetweenFirstAndLast} dias`}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{brl(g.cost)}</TableCell>
                  </TableRow>,
                  isOpen && (
                    <TableRow key={`${i}-os`} className="bg-muted/30">
                      <TableCell colSpan={5} className="p-0">
                        <div className="px-10 py-3 space-y-1">
                          {g.orders.map((o, k) => (
                            <div key={o.id} className="text-xs flex items-center gap-2">
                              <span className="text-muted-foreground w-20">{dia(o.openedAt)}</span>
                              <span className="font-mono text-[10px] text-muted-foreground">#{o.id}</span>
                              <span>{o.title}</span>
                              {k === 0 && <Badge variant="outline" className="text-[10px]">1ª — não resolveu</Badge>}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ),
                ]
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {linked.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Link2 className="w-4 h-4 text-primary" /> Retrabalhos marcados à mão</CardTitle>
            <p className="text-xs text-muted-foreground">O.S. ligadas manualmente como retrabalho — pega o caso em que a causa foi anotada com outras palavras.</p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto custom-scrollbar">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Máquina</TableHead><TableHead>O.S. original</TableHead>
                  <TableHead>Retrabalho</TableHead><TableHead className="text-right">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linked.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{l.fleetNumber}</TableCell>
                    <TableCell className="text-muted-foreground">#{l.orderId} · {l.orderTitle}</TableCell>
                    <TableCell>#{l.relatedOrderId} · {l.relatedOrderTitle}</TableCell>
                    <TableCell className="text-right font-semibold">{brl(l.cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
