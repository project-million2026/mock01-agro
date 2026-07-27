'use client'

import { useState, useCallback, useEffect } from 'react'
import { Bell, ShieldCheck, CheckCircle2, Gauge, Fuel, Activity, Wrench, User as UserIcon, Clock, AlertTriangle, Route } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { api } from '@/lib/apiClient'
import { subscribeDashboard } from '@/lib/dashboardSocket'
import { KpiCard } from '@/components/KpiCard'

// Metadados por tipo de alerta (rótulo + ícone + cor).
const TYPES = {
  overspeed: { label: 'Excesso de Velocidade', icon: Gauge, color: 'text-rose-400' },
  rpm_redzone: { label: 'RPM na Faixa Vermelha', icon: Activity, color: 'text-amber-400' },
  low_fuel: { label: 'Combustível Baixo', icon: Fuel, color: 'text-amber-400' },
  maintenance_question: { label: 'Manutenção?', icon: Wrench, color: 'text-blue-400' },
  // Oficina Inteligente (Fatia D): preventiva amarelo/vermelho.
  maint_preventive_due: { label: 'Manutenção Preventiva Próxima', icon: Clock, color: 'text-amber-400' },
  maint_preventive_overdue: { label: 'Manutenção Vencida — parar', icon: AlertTriangle, color: 'text-rose-400' },
  // Oficina Inteligente (Fatia E): máquina em talhão fora do plano de rota.
  route_deviation: { label: 'Desvio de Rota', icon: Route, color: 'text-orange-400' },
}
const typeMeta = (t) => TYPES[t] || { label: t, icon: Bell, color: 'text-muted-foreground' }

const STATUS_FILTERS = [
  { id: 'open', label: 'Abertos' },
  { id: 'acknowledged', label: 'Reconhecidos' },
  { id: 'closed', label: 'Fechados' },
  { id: '', label: 'Todos' },
]

export default function AlertsPage({ currentUserRole }) {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('open')
  const [summary, setSummary] = useState({ open: 0, byType: {} })
  const canManage = currentUserRole === 'admin' || currentUserRole === 'manager'

  const load = useCallback(async () => {
    try {
      const qs = filter ? `?status=${filter}&limit=200` : '?limit=200'
      const [a, s] = await Promise.all([api(`/alerts${qs}`), api('/alerts/summary')])
      setItems(a.items || [])
      setSummary(s || { open: 0, byType: {} })
    } catch (e) { toast.error(e.message) }
  }, [filter])

  useEffect(() => { queueMicrotask(load) }, [load])

  // Tempo real (SPRINT-07): novo alerta no WebSocket recarrega a lista/summary ao vivo.
  useEffect(() => subscribeDashboard((msg) => { if (msg.type === 'alert') load() }), [load])

  const act = async (id, action) => {
    try {
      await api(`/alerts/${id}/${action}`, { method: 'PUT', body: JSON.stringify({}) })
      toast.success(action === 'ack' ? 'Alerta reconhecido' : 'Alerta fechado')
      load()
    } catch (e) { toast.error(e.message) }
  }

  const statusBadge = (s) => s === 'open'
    ? <Badge variant="destructive">Aberto</Badge>
    : s === 'acknowledged'
      ? <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Reconhecido</Badge>
      : <Badge variant="secondary">Fechado</Badge>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Bell className="w-7 h-7 text-primary" /> Alertas</h1>
        <p className="text-muted-foreground text-sm">Eventos operacionais detectados no processamento da telemetria</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Bell} label="Abertos" value={summary.open} color="text-rose-400" />
        <KpiCard icon={Gauge} label="Velocidade" value={summary.byType?.overspeed ?? 0} color="text-rose-400" />
        <KpiCard icon={Fuel} label="Combustível" value={summary.byType?.low_fuel ?? 0} color="text-amber-400" />
        <KpiCard icon={Wrench} label="Manutenção" value={summary.byType?.maintenance_question ?? 0} color="text-blue-400" />
      </div>

      <Card className="glow-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Lista de Alertas</CardTitle>
            <CardDescription>Abertos aparecem primeiro</CardDescription>
          </div>
          <div className="flex gap-1">
            {STATUS_FILTERS.map(f => (
              <Button key={f.id} size="sm" variant={filter === f.id ? 'default' : 'outline'} onClick={() => setFilter(f.id)}>
                {f.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto custom-scrollbar">
          <Table className="w-full min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Frota</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(a => {
                const m = typeMeta(a.type)
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono font-semibold text-primary">{a.fleetNumber}</TableCell>
                    <TableCell className="text-sm">
                      {a.operatorName || a.operatorRfid
                        ? <span className="flex items-center gap-1.5"><UserIcon className="w-3.5 h-3.5 text-muted-foreground" /> {a.operatorName || a.operatorRfid}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`flex items-center gap-1.5 ${m.color}`}><m.icon className="w-4 h-4" /> {m.label}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[320px]">{a.message}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.createdAt ? new Date(a.createdAt).toLocaleString('pt-BR') : '—'}</TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                    <TableCell className="text-right">
                      {canManage && a.status !== 'closed' && (
                        <div className="flex items-center justify-end gap-1">
                          {a.status === 'open' && (
                            <Button size="sm" variant="ghost" onClick={() => act(a.id, 'ack')} title="Reconhecer">
                              <ShieldCheck className="w-4 h-4 text-amber-500" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => act(a.id, 'close')} title="Fechar">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum alerta {filter === 'open' ? 'aberto' : ''}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
