'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Activity, Fuel, Timer, Radio, AlertTriangle, Map as MapIcon, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/apiClient'
import { subscribeDashboard } from '@/lib/dashboardSocket'
import { KpiCard } from '@/components/KpiCard'

const RouteMap = dynamic(() => import('@/components/RouteMap'), { ssr: false })
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

export default function TelemetryPage({ initialFleet }) {
  const [points, setPoints] = useState([])
  const [fields, setFields] = useState([])
  const [farms, setFarms] = useState([])
  const [buildings, setBuildings] = useState([])
  const [operators, setOperators] = useState([])
  const [allPositions, setAllPositions] = useState([])
  const [livePos, setLivePos] = useState(null)
  const [fleets, setFleets] = useState([])
  const [fleetNumber, setFleetNumber] = useState(initialFleet || 'ALL')
  // Filtros de histórico (SPRINT-05): quando algum está setado, a rota vem de /telemetry/route.
  const [operatorRfid, setOperatorRfid] = useState('')
  const [fieldId, setFieldId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const hasFilters = !!(operatorRfid || fieldId || start || end)

  const refresh = useCallback(async () => {
    try {
      if (fleetNumber !== 'ALL') {
        if (hasFilters) {
          const qs = new URLSearchParams({ fleet_number: fleetNumber })
          if (operatorRfid) qs.set('operator_rfid', operatorRfid)
          if (fieldId) qs.set('field_id', fieldId)
          if (start) qs.set('start', `${start}T00:00:00`)
          if (end) qs.set('end', `${end}T23:59:59`)
          const r = await api(`/telemetry/route?${qs.toString()}`)
          // /route ordena crescente e usa `time`; a UI espera `timestamp` e mais recente 1º.
          setPoints((r.points || []).map(p => ({ ...p, timestamp: p.time })).reverse())
        } else {
          const p = await api(`/telemetry/history?fleetNumber=${fleetNumber}`)
          setPoints(p.history || [])
        }
      } else {
        setPoints([])
      }

      const f = await api('/fields')
      setFields(f.items || [])

      const op = await api('/operators')
      setOperators(op.items || [])

      const fl = await api('/fleets')
      setFleets(fl.items || [])
      
      // Get live positions
      const d = await api('/dashboard/positions')
      if (d.positions) {
        setAllPositions(d.positions)
        setFarms(d.farms || [])
        setBuildings(d.buildings || [])
        if (fleetNumber !== 'ALL') {
          const live = d.positions.find(pos => pos.fleetNumber === fleetNumber)
          setLivePos(live || null)
        }
      }
    } catch (e) { console.error(e) }
  }, [fleetNumber, hasFilters, operatorRfid, fieldId, start, end])

  useEffect(() => {
    queueMicrotask(refresh)
    // Polling como reconciliação; a posição ao vivo chega via WebSocket (abaixo).
    const i = setInterval(refresh, 30000)
    return () => clearInterval(i)
  }, [refresh])

  // Tempo real (SPRINT-07): posição ao vivo da frota selecionada (sem filtro histórico ativo).
  useEffect(() => {
    if (fleetNumber === 'ALL') return undefined
    return subscribeDashboard((msg) => {
      if (msg.type !== 'position' || !msg.data) return
      const p = msg.data
      if (p.fleetNumber === fleetNumber) {
        setLivePos(p)
        if (!hasFilters) setPoints((prev) => [{ ...p }, ...prev])
      }
      setAllPositions((prev) => [...prev.filter((x) => x.fleetNumber !== p.fleetNumber), p])
    })
  }, [fleetNumber, hasFilters])

  const last = points.length > 0 ? points[0] : livePos
  const isMoving = last && last.speed > 0
  const isOff = last && !last.ignition

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Activity className="w-7 h-7 text-primary" /> Análise de Telemetria</h1>
          <p className="text-muted-foreground text-sm">Visão e Rota detalhada</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Selecionar Equipamento:</span>
          <select 
            value={fleetNumber} 
            onChange={e => setFleetNumber(e.target.value)}
            className="bg-secondary/50 border border-border/50 text-foreground text-sm rounded-md px-3 py-2 focus:ring-2 focus:ring-primary outline-none cursor-pointer"
          >
            <option value="ALL">Visão Geral (Todas as Máquinas)</option>
            {fleets.map(f => (
              <option key={f.fleet_number} value={f.fleet_number}>{f.fleet_number} {f.model ? `(${f.model})` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {fleetNumber !== 'ALL' && (
        <Card className="glow-card">
          <CardContent className="py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Operador</span>
              <select value={operatorRfid} onChange={e => setOperatorRfid(e.target.value)}
                className="w-full bg-secondary/50 border border-border/50 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary">
                <option value="">Todos</option>
                {operators.map(o => <option key={o.id} value={o.rfid}>{o.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Talhão</span>
              <select value={fieldId} onChange={e => setFieldId(e.target.value)}
                className="w-full bg-secondary/50 border border-border/50 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary">
                <option value="">Todos</option>
                {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Início</span>
              <input type="date" value={start} onChange={e => setStart(e.target.value)}
                className="w-full bg-secondary/50 border border-border/50 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Fim</span>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)}
                className="w-full bg-secondary/50 border border-border/50 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
            </div>
            {hasFilters && (
              <button onClick={() => { setOperatorRfid(''); setFieldId(''); setStart(''); setEnd('') }}
                className="text-sm text-muted-foreground hover:text-foreground border border-border/50 rounded-md px-3 py-2">
                Limpar filtros
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {fleetNumber !== 'ALL' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Radio} label="Status" value={isOff ? 'Desligado' : isMoving ? 'Em Movimento' : 'Parado'} color={isOff ? 'text-muted-foreground' : isMoving ? 'text-green-400' : 'text-amber-400'} />
          <KpiCard icon={Activity} label="Velocidade" value={`${last?.speed?.toFixed?.(1) || 0} km/h`} />
          <KpiCard icon={Timer} label="RPM" value={last?.engineRpm || 0} />
          <KpiCard icon={Fuel} label="Combustível" value={`${Number(last?.fuelLevel || 0).toFixed(1)}%`} color={last?.fuelLevel < 20 ? 'text-red-400' : 'text-primary'} />
        </div>
      )}

      {fleetNumber === 'ALL' ? (
        <Card className="glow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapIcon className="w-5 h-5 text-primary" /> Visão Geral das Frotas</CardTitle>
            <CardDescription>Localização ao vivo de todas as máquinas ({allPositions.length} conectadas)</CardDescription>
          </CardHeader>
          <CardContent>
            <MapView positions={allPositions} fields={fields} farms={farms} buildings={buildings} height={600} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 glow-card">
            <CardHeader>
              <CardTitle>Rota Rastreada</CardTitle>
              <CardDescription>{hasFilters ? `Trajeto filtrado - ${fleetNumber}` : `Trajeto das últimas 24 horas - ${fleetNumber}`}</CardDescription>
            </CardHeader>
            <CardContent>
              <RouteMap points={points} fields={fields} farms={farms} buildings={buildings} livePosition={livePos} height={500} />
            </CardContent>
          </Card>
          
          <Card className="glow-card flex flex-col h-[600px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Eventos Brutos</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              <div className="divide-y divide-border/40">
                {points.map((p, i) => (
                  <div key={i} className="p-4 hover:bg-secondary/20 transition-colors text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-xs text-muted-foreground">{new Date(p.timestamp).toLocaleString('pt-BR')}</span>
                      {p.speed > 25 && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1"/> Excesso de Vel.</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Velocidade:</span> <span className="font-mono">{p.speed?.toFixed?.(1)}</span></div>
                      <div><span className="text-muted-foreground">RPM:</span> <span className="font-mono">{p.engineRpm}</span></div>
                      <div><span className="text-muted-foreground">Lat:</span> <span className="font-mono">{p.latitude?.toFixed?.(5)}</span></div>
                      <div><span className="text-muted-foreground">Lng:</span> <span className="font-mono">{p.longitude?.toFixed?.(5)}</span></div>
                    </div>
                  </div>
                ))}
                {points.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">Sem dados de rota para esta frota nas últimas 24h</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
