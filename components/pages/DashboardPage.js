'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  Tractor, Users, MapPinned, Map as MapIcon, Building2, Wifi, WifiOff,
  Activity, Clock, AlertTriangle, Radio
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/apiClient'
import { KpiCard } from '@/components/KpiCard'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

export default function DashboardPage({ onSelectFleet, setPage }) {
  const [stats, setStats] = useState(null)
  const [positions, setPositions] = useState([])
  const [farms, setFarms] = useState([])
  const [fields, setFields] = useState([])
  const [buildings, setBuildings] = useState([])
  const [timeline, setTimeline] = useState([])
  const [recent, setRecent] = useState([])
  
  const refresh = useCallback(async () => {
    try {
      const [s, p, t, r] = await Promise.all([
        api('/dashboard/stats'),
        api('/dashboard/positions'),
        api('/dashboard/events-timeline'),
        api('/dashboard/recent-events'),
      ])
      setStats(s); 
      setPositions(p.positions || []); 
      setFarms(p.farms || []); 
      setFields(p.fields || []); 
      setBuildings(p.buildings || []); 
      setTimeline(t.buckets); 
      setRecent(r.events)
    } catch (e) { console.error(e) }
  }, [])
  
  useEffect(() => { refresh(); const i = setInterval(refresh, 10000); return () => clearInterval(i) }, [refresh])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Monitoramento em tempo real · atualiza a cada 3s</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          LIVE
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <KpiCard icon={Tractor} label="Máquinas" value={stats?.machines ?? '-'} onClick={() => setPage?.('machines')} />
        <KpiCard icon={Users} label="Operadores" value={stats?.operators ?? '-'} onClick={() => setPage?.('operators')} />
        <KpiCard icon={MapPinned} label="Fazendas" value={stats?.farms ?? '-'} onClick={() => setPage?.('farms')} />
        <KpiCard icon={MapIcon} label="Talhões" value={stats?.fields ?? '-'} onClick={() => setPage?.('fields')} />
        <KpiCard icon={Building2} label="Prédios" value={stats?.buildings ?? '-'} onClick={() => setPage?.('buildings')} />
        <KpiCard icon={Wifi} label="Online" value={stats?.online ?? '-'} color="text-green-400" />
        <KpiCard icon={WifiOff} label="Offline" value={(stats?.machines || 0) - (stats?.online || 0)} color="text-red-400" />
        <KpiCard icon={Activity} label="Eventos 24h" value={stats?.events24h ?? '-'} color="text-blue-400" />
        <KpiCard icon={Clock} label="Fila pendente" value={stats?.queue?.pending ?? 0} color="text-amber-400" onClick={() => setPage?.('telemetry')} />
        <KpiCard icon={AlertTriangle} label="Dead Letter" value={stats?.queue?.dead ?? 0} color="text-red-500" onClick={() => setPage?.('telemetry')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 glow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapIcon className="w-5 h-5 text-primary" /> Mapa de Máquinas</CardTitle>
            <CardDescription>Localização ao vivo · {positions.length} máquinas com posição</CardDescription>
          </CardHeader>
          <CardContent>
            <MapView positions={positions} farms={farms} fields={fields} buildings={buildings} height={460} />
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Eventos · 24h</CardTitle>
            <CardDescription>Volume agrupado por hora</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[460px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 76% 45%)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(142 76% 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'hsl(215 20% 70%)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(215 20% 70%)' }} />
                  <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(217 33% 17%)', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="count" stroke="hsl(142 76% 45%)" fillOpacity={1} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Radio className="w-5 h-5 text-primary" /> Últimos Eventos</CardTitle>
          <CardDescription>Eventos processados mais recentes</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto custom-scrollbar">
          <Table className="w-full min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Frota</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Operador RFID</TableHead>
                <TableHead className="text-right">Velocidade</TableHead>
                <TableHead className="text-right">RPM</TableHead>
                <TableHead className="text-right">Combustível</TableHead>
                <TableHead>Posição</TableHead>
                <TableHead>Recebido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((e, i) => (
                <TableRow key={i} className={onSelectFleet ? 'cursor-pointer hover:bg-primary/5' : ''} onClick={() => onSelectFleet?.(e.fleetNumber)}>
                  <TableCell className="font-mono font-semibold text-primary">{e.fleetNumber}</TableCell>
                  <TableCell className="font-mono text-xs">{e.deviceId}</TableCell>
                  <TableCell className="font-mono text-xs">{e.operatorRFID || '—'}</TableCell>
                  <TableCell className="text-right">{e.speed?.toFixed?.(1)} km/h</TableCell>
                  <TableCell className="text-right">{e.engineRpm}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={e.fuelLevel < 20 ? 'destructive' : 'secondary'}>{Number(e.fuelLevel || 0).toFixed(1)}%</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.latitude?.toFixed?.(4)}, {e.longitude?.toFixed?.(4)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(e.receivedAt).toLocaleTimeString('pt-BR')}</TableCell>
                </TableRow>
              ))}
              {recent.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum evento ainda. Acesse o Simulador para gerar telemetria.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
