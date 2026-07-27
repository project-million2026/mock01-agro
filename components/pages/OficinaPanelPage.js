'use client'

import { useState, useCallback, useEffect } from 'react'
import { Wrench, Clock, ClipboardList, AlertTriangle, Warehouse } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { api } from '@/lib/apiClient'
import { KpiCard } from '@/components/KpiCard'

const fmtH = (h) => `${(h || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`
const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Painel da Oficina (reunião 2026-07-19): máquinas na oficina agora + tempo parado por máquina.
export default function OficinaPanelPage({ onNavigate }) {
  const [data, setData] = useState({ inWorkshop: [], byMachine: [], totals: {} })
  const [days, setDays] = useState(30)

  const load = useCallback(async () => {
    try { setData(await api(`/maintenance/oficina-panel?days=${days}`)) }
    catch (e) { toast.error(e.message) }
  }, [days])

  useEffect(() => { queueMicrotask(load) }, [load])

  const t = data.totals || {}
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={Warehouse} label="Máquinas na oficina agora" value={t.machinesInWorkshop ?? 0} color="text-amber-500" onClick={() => onNavigate?.('manutencao')} />
        <KpiCard icon={ClipboardList} label="O.S. abertas" value={t.openServiceOrders ?? 0} color="text-blue-500" onClick={() => onNavigate?.('os')} />
        <KpiCard icon={AlertTriangle} label="Alertas preventivos abertos" value={t.openPreventiveAlerts ?? 0} color="text-rose-500" onClick={() => onNavigate?.('alerts')} />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="w-5 h-5 text-primary" /> Na oficina agora</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Máquina</TableHead><TableHead>Oficina</TableHead><TableHead>Desde</TableHead><TableHead className="text-right">Tempo parada</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(data.inWorkshop || []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma máquina na oficina no momento.</TableCell></TableRow>}
              {(data.inWorkshop || []).map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{m.fleetNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{m.buildingName || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(m.startedAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right font-semibold text-amber-600 flex items-center justify-end gap-1"><Clock className="w-3.5 h-3.5" />{fmtH(m.elapsedHours)}</TableCell>
                  <TableCell>{m.confirmed ? <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Confirmada</Badge> : <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30">A confirmar</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Tempo parado por máquina</CardTitle>
          <div className="flex gap-1">
            {[7, 30, 90].map(d => (
              <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'} onClick={() => setDays(d)}>{d}d</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Máquina</TableHead><TableHead className="text-right">Nº paradas</TableHead><TableHead className="text-right">Prev. / Corr.</TableHead><TableHead className="text-right">Tempo total</TableHead><TableHead className="text-right">Custo estimado</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(data.byMachine || []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sem paradas de oficina no período.</TableCell></TableRow>}
              {(data.byMachine || []).map((m) => (
                <TableRow key={m.fleetNumber}>
                  <TableCell className="font-mono text-xs">{m.fleetNumber}</TableCell>
                  <TableCell className="text-right">{m.count}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{m.preventive} / {m.corrective}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtH(m.hours)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{brl(m.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
