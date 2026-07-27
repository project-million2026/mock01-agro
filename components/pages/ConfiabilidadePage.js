'use client'

import { useState, useCallback, useEffect } from 'react'
import { ShieldCheck, Activity, Coins, Timer, Wrench, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { api } from '@/lib/apiClient'
import { KpiCard } from '@/components/KpiCard'

const num = (v, d = 1) => (v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: d })
const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = (v) => (v == null ? '—' : `${num(v, 1)}%`)

// Célula que não inventa número: denominador zero vira o MOTIVO, não 0.
const Undef = ({ reason }) => <span className="text-xs text-muted-foreground">{reason}</span>

// Corretiva alta = plano preventivo falhando. Faixas para leitura rápida.
const corrTone = (p) =>
  p == null ? '' : p >= 60 ? 'text-rose-500' : p >= 30 ? 'text-amber-500' : 'text-emerald-500'
const availTone = (p) =>
  p == null ? '' : p >= 95 ? 'text-emerald-500' : p >= 90 ? 'text-amber-500' : 'text-rose-500'

// Confiabilidade & custo — os cruzamentos de RAZÃO (não de volume) que decidem manter × vender.
export default function ConfiabilidadePage() {
  const [data, setData] = useState({ machines: [], totals: {} })
  const [days, setDays] = useState(90)

  const load = useCallback(async () => {
    try { setData(await api(`/kpis/reliability?days=${days}`)) }
    catch (e) { toast.error(e.message) }
  }, [days])

  useEffect(() => { queueMicrotask(load) }, [load])

  const t = data.totals || {}
  const machines = data.machines || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard icon={Wrench} label="Corretiva no total" value={pct(t.correctivePercent)}
                 color={corrTone(t.correctivePercent) || 'text-primary'} />
        <KpiCard icon={ShieldCheck} label="Disponibilidade média" value={pct(t.availabilityPercent)}
                 color={availTone(t.availabilityPercent) || 'text-primary'} />
        <KpiCard icon={Coins} label="Custo por hora trabalhada"
                 value={t.costPerHour == null ? '—' : brl(t.costPerHour)} color="text-amber-500" />
        <KpiCard icon={Activity} label="Horas paradas na oficina" value={`${num(t.stopHours)} h`}
                 color="text-rose-500" />
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Confiabilidade & custo por máquina</CardTitle>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Razões, não volumes: corretiva alta = preventiva falhando · custo por hora <b className="mx-1">trabalhada</b> decide manter × vender.
            </p>
          </div>
          <div className="flex gap-1">
            {[30, 90, 180].map(d => (
              <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'} onClick={() => setDays(d)}>{d}d</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto custom-scrollbar">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead>Máquina</TableHead>
                <TableHead className="text-right">Prev. / Corr.</TableHead>
                <TableHead className="text-right">% corretiva</TableHead>
                <TableHead className="text-right">Disponibilidade</TableHead>
                <TableHead className="text-right">MTBF</TableHead>
                <TableHead className="text-right">Horas trab.</TableHead>
                <TableHead className="text-right">Custo total</TableHead>
                <TableHead className="text-right">R$ / hora trab.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machines.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Sem turnos nem paradas de oficina no período.
                </TableCell></TableRow>
              )}
              {machines.map((m) => (
                <TableRow key={m.fleetNumber}>
                  <TableCell className="font-mono text-xs">{m.fleetNumber}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    <span className="text-emerald-600">{m.preventive}</span> / <span className="text-rose-500">{m.corrective}</span>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${corrTone(m.correctivePercent)}`}>
                    {m.correctivePercent == null ? <Undef reason="sem parada" /> : pct(m.correctivePercent)}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${availTone(m.availabilityPercent)}`}>
                    {pct(m.availabilityPercent)}
                  </TableCell>
                  <TableCell className="text-right">
                    {m.mtbfHours == null
                      ? <Undef reason={m.corrective === 0 ? 'sem falha' : 'sem horas'} />
                      : `${num(m.mtbfHours)} h`}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{num(m.hoursWorked)} h</TableCell>
                  <TableCell className="text-right text-muted-foreground">{brl(m.totalCost)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {m.costPerHour == null ? <Undef reason="não trabalhou" /> : brl(m.costPerHour)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground flex items-center gap-2">
        <Timer className="w-3.5 h-3.5" />
        <span>
          <b>MTBF</b> = horas trabalhadas ÷ corretivas · <b>Disponibilidade</b> = 100 − horas paradas ÷ horas do período ·
          <b> Custo total</b> = peças + mão de obra + horas paradas × taxa/h da máquina.
        </span>
      </p>
    </div>
  )
}
