'use client'

import { useState, useEffect } from 'react'
import { Tractor, Database, Radio, Sparkles, Cpu } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { api } from '@/lib/apiClient'

export default function SimulatorPage() {
  const [activeTab, setActiveTab] = useState('equipamento') // 'equipamento' | 'carga' | 'postman'
  
  // Equipamento State
  const [deviceId, setDeviceId] = useState('')
  const [devLoading, setDevLoading] = useState(false)
  const [devData, setDevData] = useState(null)
  
  const fetchDevice = async () => {
    if (!deviceId) return toast.error('Informe o ID do dispositivo')
    setDevLoading(true); setDevData(null)
    try {
      const r = await api(`/simulator/device?deviceId=${encodeURIComponent(deviceId)}`)
      setDevData(JSON.stringify(r, null, 2))
    } catch (e) {
      toast.error(e.message)
      setDevData(`Erro: ${e.message}`)
    } finally {
      setDevLoading(false)
    }
  }

  // Load Simulator State
  const [running, setRunning] = useState(false)
  const [count, setCount] = useState(100)
  const [intv, setIntv] = useState(2000)
  const [totalSent, setTotalSent] = useState(0)
  const [log, setLog] = useState([])

  // Postman State
  const [reqUrl, setReqUrl] = useState('https://flespi.io/gw/devices/all/telemetry')
  const [reqMethod, setReqMethod] = useState('GET')
  const [reqHeaders, setReqHeaders] = useState('{\n  "Authorization": "FlespiToken SEU_TOKEN_AQUI"\n}')
  const [reqBody, setReqBody] = useState('{\n  \n}')
  const [resData, setResData] = useState(null)
  const [resStatus, setResStatus] = useState(null)
  const [resTime, setResTime] = useState(null)
  const [reqLoading, setReqLoading] = useState(false)

  useEffect(() => {
    if (!running || activeTab !== 'carga') return
    const tick = async () => {
      try {
        const r = await api('/telemetry/simulate', { method: 'POST', body: JSON.stringify({ count: parseInt(count) }) })
        setTotalSent(s => s + r.enqueued)
        setLog(l => [{ time: new Date().toLocaleTimeString('pt-BR'), count: r.enqueued }, ...l].slice(0, 20))
      } catch (e) { toast.error(e.message); setRunning(false) }
    }
    tick()
    const id = setInterval(tick, parseInt(intv))
    return () => clearInterval(id)
  }, [running, count, intv, activeTab])

  const sendOne = async () => {
    try {
      const payload = {
        deviceId: 'VC07-TR001', fleetNumber: 'TR001', timestamp: new Date().toISOString(),
        latitude: -10.1843 + (Math.random() - 0.5), longitude: -48.3336 + (Math.random() - 0.5),
        speed: Math.random() * 30, engineRpm: 1500, engineHours: 2450.3,
        fuelLevel: Math.floor(Math.random() * 100), operatorRFID: 'A2F48D11', ignition: true,
      }
      const r = await fetch('/api/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await r.json()
      toast.success(`Evento enfileirado: ${j.id?.slice(0, 8)}...`)
      setTotalSent(s => s + 1)
    } catch (e) { toast.error(e.message) }
  }

  const sendPostmanReq = async () => {
    if (!reqUrl) return toast.error('URL inválida')
    setReqLoading(true); setResData(null); setResStatus(null); setResTime(null)
    const t0 = performance.now()
    try {
      let headers = {}
      try { if (reqHeaders.trim()) headers = JSON.parse(reqHeaders) } catch(e) { toast.error("Headers inválidos (JSON incorreto)"); setReqLoading(false); return }
      const opts = { method: reqMethod, headers }
      if (reqMethod !== 'GET' && reqBody.trim()) opts.body = reqBody
      
      const r = await fetch(reqUrl, opts)
      setResStatus(r.status)
      const text = await r.text()
      try { setResData(JSON.stringify(JSON.parse(text), null, 2)) } 
      catch { setResData(text) }
    } catch (e) {
      setResData(`Erro na requisição: ${e.message}`)
    } finally {
      setResTime(Math.round(performance.now() - t0))
      setReqLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Sparkles className="w-7 h-7 text-primary" /> Testes e Simulação</h1>
          <p className="text-muted-foreground text-sm">Comunicação direta com APIs (Flespi / VC07) e injeção de dados simulados</p>
        </div>
        <div className="flex bg-secondary rounded-lg p-1">
          <button onClick={() => setActiveTab('equipamento')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'equipamento' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>Consultar Equipamento</button>
          <button onClick={() => setActiveTab('postman')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'postman' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>Virtual Postman</button>
          <button onClick={() => setActiveTab('carga')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'carga' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}>Carga de Telemetria</button>
        </div>
      </div>

      {activeTab === 'equipamento' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glow-card">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-lg flex items-center gap-2"><Tractor className="w-5 h-5 text-primary" /> Consultar Equipamento</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase">ID do Dispositivo (Flespi)</Label>
                <div className="flex gap-2">
                  <Input value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="Ex: 1234567 ou identificador" className="font-mono flex-1" />
                  <Button onClick={fetchDevice} disabled={devLoading} className="w-24">
                    {devLoading ? '...' : 'Buscar'}
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-4">
                <p>Use esta tela para simular a comunicação direta com a API do equipamento informando seu ID.</p>
                <p className="mt-1">O token de autorização é injetado automaticamente pelo servidor para segurança.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glow-card flex flex-col h-[500px]">
            <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Dados Retornados</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 p-0 flex-1 relative overflow-hidden bg-black/50 rounded-b-lg">
              {!devData && !devLoading && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">Nenhuma busca realizada. Informe um ID.</div>}
              {devLoading && <div className="absolute inset-0 flex items-center justify-center text-primary text-sm animate-pulse">Buscando telemetria do equipamento...</div>}
              {devData && !devLoading && (
                <pre className="w-full h-full p-4 overflow-auto font-mono text-xs text-green-400">
                  {devData}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'postman' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glow-card">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-lg flex items-center gap-2"><Radio className="w-5 h-5 text-primary" /> Nova Requisição</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex gap-2">
                <Select value={reqMethod} onValueChange={setReqMethod}>
                  <SelectTrigger className="w-28 font-mono font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET" className="text-green-400 font-mono">GET</SelectItem>
                    <SelectItem value="POST" className="text-amber-400 font-mono">POST</SelectItem>
                    <SelectItem value="PUT" className="text-blue-400 font-mono">PUT</SelectItem>
                    <SelectItem value="DELETE" className="text-red-400 font-mono">DELETE</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={reqUrl} onChange={e => setReqUrl(e.target.value)} placeholder="https://flespi.io/gw/devices/all" className="font-mono flex-1" />
                <Button onClick={sendPostmanReq} disabled={reqLoading} className="w-24">
                  {reqLoading ? '...' : 'Enviar'}
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase">Headers (JSON)</Label>
                <textarea 
                  value={reqHeaders} onChange={e => setReqHeaders(e.target.value)}
                  className="w-full h-24 bg-black/40 border border-border/50 rounded-md p-3 font-mono text-xs focus:ring-1 focus:ring-primary outline-none"
                  placeholder='{ "Authorization": "FlespiToken XYZ" }'
                />
              </div>

              {reqMethod !== 'GET' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase">Body (JSON)</Label>
                  <textarea 
                    value={reqBody} onChange={e => setReqBody(e.target.value)}
                    className="w-full h-32 bg-black/40 border border-border/50 rounded-md p-3 font-mono text-xs focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glow-card flex flex-col h-[500px]">
            <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Resposta</CardTitle>
              {resStatus && (
                <div className="flex gap-3 text-xs font-mono">
                  <Badge variant={resStatus >= 200 && resStatus < 300 ? 'default' : 'destructive'}>
                    Status: {resStatus}
                  </Badge>
                  <Badge variant="outline" className="text-muted-foreground">{resTime} ms</Badge>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0 p-0 flex-1 relative overflow-hidden bg-black/50 rounded-b-lg">
              {!resData && !reqLoading && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">Nenhuma requisição enviada.</div>}
              {reqLoading && <div className="absolute inset-0 flex items-center justify-center text-primary text-sm animate-pulse">Aguardando resposta do servidor...</div>}
              {resData && !reqLoading && (
                <pre className="w-full h-full p-4 overflow-auto font-mono text-xs text-green-400">
                  {resData}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'carga' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glow-card md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Configuração</CardTitle>
                <CardDescription>Eventos por ciclo e intervalo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Eventos por ciclo</Label>
                  <Input type="number" value={count} onChange={e => setCount(e.target.value)} min={1} max={5000} />
                </div>
                <div className="space-y-2">
                  <Label>Intervalo (ms)</Label>
                  <Input type="number" value={intv} onChange={e => setIntv(e.target.value)} min={500} step={500} />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button onClick={() => setRunning(!running)} variant={running ? 'destructive' : 'default'}>
                    {running ? 'Parar' : 'Iniciar'}
                  </Button>
                  <Button variant="outline" onClick={sendOne}>Enviar 1</Button>
                </div>
                <div className="pt-4 border-t border-border/40 mt-4">
                  <p className="text-xs text-muted-foreground">Total enviados nesta sessão</p>
                  <p className="text-3xl font-bold text-primary">{totalSent.toLocaleString('pt-BR')}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glow-card md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" /> Log de envios</CardTitle>
                <CardDescription>Últimos ciclos de simulação</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-xs space-y-1 max-h-[300px] overflow-auto">
                  {log.length === 0 && <p className="text-muted-foreground">Aguardando simulação...</p>}
                  {log.map((l, i) => (
                    <div key={i} className="flex items-center gap-3 py-1 border-b border-border/30">
                      <span className="text-muted-foreground">{l.time}</span>
                      <Badge variant="secondary" className="font-mono">+{l.count} eventos</Badge>
                      <span className="text-green-400">enfileirados</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="glow-card">
            <CardHeader>
              <CardTitle className="text-lg">Exemplo de payload</CardTitle>
              <CardDescription>POST /api/telemetry (endpoint público - ingestão de dispositivo)</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-black/40 p-4 rounded-lg text-xs overflow-auto border border-border/40">{`{
  "deviceId": "VC07-001",
  "fleetNumber": "TR001",
  "timestamp": "${new Date().toISOString()}",
  "latitude": -10.1843,
  "longitude": -48.3336,
  "speed": 15.4,
  "engineRpm": 1800,
  "engineHours": 1250.5,
  "fuelLevel": 85,
  "operatorRFID": "A1B2C3D4",
  "ignition": true
}`}</pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
