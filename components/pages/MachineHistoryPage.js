'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Wrench, ClipboardList, Gauge, Timer, Route, ShieldCheck, AlertTriangle, HelpCircle, FileText, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { api, apiUpload, apiDownload } from '@/lib/apiClient'

const num = (v, d = 0) => (v === null || v === undefined ? '—' : Number(v).toFixed(d))
const dt = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—')
const MT = {
  preventiva: { label: 'Preventiva', color: 'text-emerald-400', Icon: ShieldCheck },
  corretiva: { label: 'Corretiva', color: 'text-amber-400', Icon: Wrench },
}
const mt = (t) => MT[t] || { label: 'Não classificada', color: 'text-muted-foreground', Icon: HelpCircle }

function Stat({ icon: Icon, label, value, unit, hint }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"><Icon className="w-4 h-4" />{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span></div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  )
}

export default function MachineHistoryPage() {
  const [fleets, setFleets] = useState([])
  const [fleet, setFleet] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [parts, setParts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [form, setForm] = useState({ partId: '', supplierId: '', unitCost: '' })

  const loadFleets = useCallback(async () => {
    try {
      const r = await api('/fleets')
      const list = r.items || []
      setFleets(list)
      if (list[0]) setFleet((p) => p || list[0].fleet_number)
    } catch (e) { toast.error(e.message) }
    // Peças/fornecedores p/ registrar troca (módulo estoque; ignora se não tiver).
    api('/parts').then((r) => setParts(r.items || [])).catch(() => {})
    api('/suppliers').then((r) => setSuppliers(r.items || [])).catch(() => {})
  }, [])

  const installPart = async () => {
    if (!form.partId) return toast.error('Selecione a peça')
    try {
      await api('/part-installations', { method: 'POST', body: JSON.stringify({
        part_id: Number(form.partId), fleet_number: fleet,
        supplier_id: form.supplierId ? Number(form.supplierId) : null,
        unit_cost: form.unitCost ? Number(form.unitCost) : 0,
      }) })
      toast.success('Troca registrada — durabilidade da peça anterior calculada')
      setForm({ partId: '', supplierId: '', unitCost: '' })
      loadHistory(fleet)
    } catch (e) { toast.error(e.message) }
  }

  // Manual do operador (PDF) por máquina.
  const fileRef = useRef(null)
  const selFleet = fleets.find((x) => x.fleet_number === fleet)
  const uploadManual = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selFleet) return
    try {
      const fd = new FormData(); fd.append('file', file)
      await apiUpload(`/fleets/${selFleet.id}/manual`, fd)
      toast.success('Manual do operador anexado')
      loadFleets()
    } catch (err) { toast.error(err.message) }
    finally { if (fileRef.current) fileRef.current.value = '' }
  }
  const viewManual = async () => {
    if (!selFleet) return
    try { await apiDownload(`/fleets/${selFleet.id}/manual`, `manual-${fleet}.pdf`) }
    catch (err) { toast.error(err.message) }
  }

  const loadHistory = useCallback(async (fn) => {
    if (!fn) return
    setLoading(true)
    try { setData(await api(`/machine-history/${encodeURIComponent(fn)}`)) }
    catch (e) { toast.error(e.message); setData(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { queueMicrotask(loadFleets) }, [loadFleets])
  useEffect(() => { if (fleet) queueMicrotask(() => loadHistory(fleet)) }, [fleet, loadHistory])

  const s = data?.summary
  const f = data?.fleet

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Histórico da Máquina</h2>
          <p className="text-sm text-muted-foreground">Manutenções, custos e uso ao longo da vida do equipamento</p>
        </div>
        <select className="h-9 rounded-md border border-border bg-card px-3 text-sm" value={fleet} onChange={(e) => setFleet(e.target.value)}>
          {fleets.length === 0 && <option value="">Nenhuma máquina</option>}
          {fleets.map((x) => <option key={x.id} value={x.fleet_number}>{x.fleet_number} — {x.type}</option>)}
        </select>
      </div>

      {/* Manual do operador (PDF) por máquina */}
      {fleet && selFleet && (
        <div className="rounded-lg border border-border/50 bg-card/40 p-3 flex flex-wrap items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Manual do operador</span>
          <span className="text-xs text-muted-foreground">
            {selFleet.manual_filename ? 'PDF anexado a esta máquina' : 'Nenhum manual anexado'}
          </span>
          <div className="ml-auto flex gap-2">
            {selFleet.manual_filename && (
              <Button variant="outline" size="sm" onClick={viewManual}><FileText className="w-4 h-4 mr-1.5" />Ver / baixar</Button>
            )}
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1.5" />{selFleet.manual_filename ? 'Substituir' : 'Enviar PDF'}
            </Button>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={uploadManual} />
          </div>
        </div>
      )}

      {/* Registrar troca de peça: captura horímetro/km atuais → durabilidade da peça anterior. */}
      {fleet && parts.length > 0 && (
        <div className="rounded-lg border border-border/50 bg-card/40 p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">Registrar troca de peça nesta máquina</div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="h-9 rounded-md border border-border bg-background px-3 text-sm min-w-[160px]"
              value={form.partId} onChange={(e) => setForm({ ...form, partId: e.target.value })}>
              <option value="">Peça...</option>
              {parts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="h-9 rounded-md border border-border bg-background px-3 text-sm min-w-[140px]"
              value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">Fornecedor (opcional)</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="number" placeholder="Custo unit. (R$)" className="h-9 w-36 rounded-md border border-border bg-background px-3 text-sm"
              value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
            <Button size="sm" onClick={installPart}>Registrar troca</Button>
          </div>
        </div>
      )}

      {loading && <p className="text-muted-foreground animate-pulse">Carregando histórico...</p>}

      {!loading && data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat icon={Timer} label="Horímetro" value={num(f.horimeterHours, 1)} unit=" h" />
            <Stat icon={Gauge} label="Odômetro" value={num(f.odometerKm, 0)} unit=" km" />
            <Stat icon={Route} label="km desde última manut." value={num(s.kmSinceLastMaintenance, 0)} unit=" km" hint={s.daysSinceLastMaintenance != null ? `há ${s.daysSinceLastMaintenance} dias` : ''} />
            <Stat icon={Wrench} label="Manutenções" value={s.maintenances.total} unit="" hint={`${s.maintenances.preventive} prev · ${s.maintenances.corrective} corr`} />
            <Stat icon={ClipboardList} label="Ordens de Serviço" value={s.serviceOrders.total} unit="" />
            <Stat icon={Gauge} label="Custo total" value={`R$ ${num(s.totalCost, 2)}`} unit="" />
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Linha do tempo</CardTitle></CardHeader>
            <CardContent>
              {data.timeline.length === 0 && <p className="text-sm text-muted-foreground">Sem manutenções ou ordens de serviço registradas.</p>}
              <div className="space-y-2">
                {data.timeline.map((e) => {
                  const meta = mt(e.maintenanceType)
                  const MetaIcon = meta.Icon
                  const KindIcon = e.kind === 'downtime' ? Wrench : ClipboardList
                  return (
                    <div key={`${e.kind}-${e.id}`} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/40 p-3">
                      <KindIcon className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{e.kind === 'downtime' ? 'Manutenção' : `O.S. ${e.number || ''}`.trim()}</span>
                          {e.title && e.kind === 'service_order' && <span className="text-sm text-muted-foreground truncate">— {e.title}</span>}
                          <span className={`inline-flex items-center gap-1 text-[11px] ${meta.color}`}><MetaIcon className="w-3 h-3" />{meta.label}</span>
                          {e.status && <span className="text-[11px] rounded bg-muted px-1.5 py-0.5">{e.status}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">{dt(e.date)}{e.endedAt ? ` → ${dt(e.endedAt)}` : ''}</div>
                      </div>
                      <div className="text-sm font-semibold tabular-nums shrink-0">R$ {num(e.cost, 2)}</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <p className="text-[11px] text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" /> Horímetro/odômetro são atualizados automaticamente pela telemetria (horímetro do CAN quando disponível; odômetro pela distância). O cadastro define a leitura inicial.
          </p>
        </>
      )}
    </div>
  )
}
