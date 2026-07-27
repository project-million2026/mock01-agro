'use client'

import { useState, useEffect } from 'react'
import { FileText, FileSpreadsheet, FileDown, Timer, Wallet, Route, Globe, Gauge, Users, Fuel, AlertTriangle, Package, ArrowLeftRight, Award, Star, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { api, apiDownload } from '@/lib/apiClient'
import ConfiabilidadePage from '@/components/pages/ConfiabilidadePage'
import ReincidenciaPage from '@/components/pages/ReincidenciaPage'

const PERIODS = [
  { days: 7, label: '7 dias' },
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
]

function ReportCard({ icon: Icon, title, description, path, filenameBase }) {
  const [days, setDays] = useState(30)
  const [busy, setBusy] = useState('')

  const download = async (format) => {
    setBusy(format)
    try {
      await apiDownload(`${path}?format=${format}&days=${days}`, `${filenameBase}_${days}d.${format === 'pdf' ? 'pdf' : 'xlsx'}`)
    } catch (e) { toast.error(e.message) } finally { setBusy('') }
  }

  return (
    <Card className="glow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Icon className="w-5 h-5 text-primary" /> {title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Período</Label>
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <Button key={p.days} size="sm" variant={days === p.days ? 'default' : 'outline'} onClick={() => setDays(p.days)}>
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" variant="outline" disabled={!!busy} onClick={() => download('xlsx')}>
            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" /> {busy === 'xlsx' ? 'Gerando...' : 'Excel'}
          </Button>
          <Button className="flex-1" variant="outline" disabled={!!busy} onClick={() => download('pdf')}>
            <FileDown className="w-4 h-4 mr-2 text-rose-500" /> {busy === 'pdf' ? 'Gerando...' : 'PDF'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Histórico de Rotas (SPRINT-05): filtros ricos (frota obrig., operador, período, talhão) +
// exportação em Excel/PDF/KML. O KML abre direto no Google Earth.
function RouteHistoryCard({ canKml }) {
  const [fleets, setFleets] = useState([])
  const [operators, setOperators] = useState([])
  const [fields, setFields] = useState([])
  const [fleetNumber, setFleetNumber] = useState('')
  const [operatorRfid, setOperatorRfid] = useState('')
  const [fieldId, setFieldId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const [fl, op, fi] = await Promise.all([api('/fleets'), api('/operators'), api('/fields')])
        setFleets(fl.items || [])
        setOperators(op.items || [])
        setFields(fi.items || [])
      } catch (e) { console.error(e) }
    })()
  }, [])

  const download = async (format) => {
    if (!fleetNumber) { toast.error('Selecione uma frota'); return }
    setBusy(format)
    const qs = new URLSearchParams({ format, fleet_number: fleetNumber })
    if (operatorRfid) qs.set('operator_rfid', operatorRfid)
    if (fieldId) qs.set('field_id', fieldId)
    if (start) qs.set('start', `${start}T00:00:00`)
    if (end) qs.set('end', `${end}T23:59:59`)
    const ext = format === 'pdf' ? 'pdf' : format === 'kml' ? 'kml' : 'xlsx'
    try {
      await apiDownload(`/reports/route?${qs.toString()}`, `rota_${fleetNumber}.${ext}`)
    } catch (e) { toast.error(e.message) } finally { setBusy('') }
  }

  return (
    <Card className="glow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Route className="w-5 h-5 text-primary" /> Histórico de Rotas</CardTitle>
        <CardDescription>Trajeto de uma frota filtrado por operador, período e talhão. Exporte em Excel, PDF ou KML (Google Earth).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Frota *</Label>
            <select value={fleetNumber} onChange={e => setFleetNumber(e.target.value)}
              className="w-full bg-secondary/50 border border-border/50 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary">
              <option value="">Selecione…</option>
              {fleets.map(f => <option key={f.fleet_number} value={f.fleet_number}>{f.fleet_number} {f.model ? `(${f.model})` : ''}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Operador</Label>
            <select value={operatorRfid} onChange={e => setOperatorRfid(e.target.value)}
              className="w-full bg-secondary/50 border border-border/50 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todos</option>
              {operators.map(o => <option key={o.id} value={o.rfid}>{o.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Talhão</Label>
            <select value={fieldId} onChange={e => setFieldId(e.target.value)}
              className="w-full bg-secondary/50 border border-border/50 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todos</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Início</Label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)}
              className="w-full bg-secondary/50 border border-border/50 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1.5">
            <Label>Fim</Label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)}
              className="w-full bg-secondary/50 border border-border/50 text-sm rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!busy} onClick={() => download('xlsx')}>
            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" /> {busy === 'xlsx' ? 'Gerando...' : 'Excel'}
          </Button>
          <Button variant="outline" disabled={!!busy} onClick={() => download('pdf')}>
            <FileDown className="w-4 h-4 mr-2 text-rose-500" /> {busy === 'pdf' ? 'Gerando...' : 'PDF'}
          </Button>
          {canKml && (
            <Button variant="outline" disabled={!!busy} onClick={() => download('kml')}>
              <Globe className="w-4 h-4 mr-2 text-sky-500" /> {busy === 'kml' ? 'Gerando...' : 'KML (Google Earth)'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Cruzamento qualidade × fornecedor (Oficina Inteligente, Fatia G): mostra o ranking na tela e
// exporta em Excel/PDF. `score` = nota média descontada pela taxa de reprovação das entradas.
function SupplierQualityCard() {
  const [items, setItems] = useState(null)
  useEffect(() => {
    api('/reports/supplier-quality')
      .then((r) => setItems(r.items || []))
      .catch((e) => { toast.error(e.message); setItems([]) })
  }, [])
  const scoreColor = (s) => (s >= 4 ? 'text-emerald-400' : s >= 2.5 ? 'text-amber-400' : 'text-rose-400')
  const dl = async (fmt) => {
    try { await apiDownload(`/reports/supplier-quality?format=${fmt}`, `qualidade_fornecedores.${fmt === 'pdf' ? 'pdf' : 'xlsx'}`) }
    catch (e) { toast.error(e.message) }
  }
  return (
    <Card className="glow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Qualidade por Fornecedor</CardTitle>
        <CardDescription>Cruza a qualidade das peças com as entradas: nota média, taxa de reprovação e score por fornecedor.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items === null && <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>}
        {items && items.length === 0 && <p className="text-sm text-muted-foreground">Sem fornecedores cadastrados.</p>}
        {items && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border/50">
                  <th className="py-1.5 pr-2">Fornecedor</th>
                  <th className="py-1.5 px-2 text-right">Peças</th>
                  <th className="py-1.5 px-2 text-right">Nota</th>
                  <th className="py-1.5 px-2 text-right">Durab. (h)</th>
                  <th className="py-1.5 px-2 text-right">Custo méd.</th>
                  <th className="py-1.5 px-2 text-right">% Reprov.</th>
                  <th className="py-1.5 pl-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.supplierId} className="border-b border-border/30">
                    <td className="py-1.5 pr-2">{i.supplier}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{i.partsSupplied}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{i.avgQualityRating ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{i.avgDurabilityHours ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{i.avgCost != null ? `R$ ${i.avgCost}` : '—'}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{i.rejectRate}%</td>
                    <td className={`py-1.5 pl-2 text-right font-semibold tabular-nums ${scoreColor(i.score)}`}>{i.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => dl('xlsx')}><FileSpreadsheet className="w-4 h-4 mr-1.5" />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => dl('pdf')}><FileDown className="w-4 h-4 mr-1.5" />PDF</Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Ranking por peça (Oficina Inteligente, Fatia L): durabilidade observada (horas/km) + qualidade,
// com custo sempre ao lado. Só insumo p/ decisão — o sistema não decide.
const SORTS = [
  { v: 'durability_h', label: 'Durabilidade (h)' },
  { v: 'durability_km', label: 'Durabilidade (km)' },
  { v: 'quality', label: 'Qualidade' },
  { v: 'value', label: 'Valor (h/R$)' },
  { v: 'cost', label: 'Menor custo' },
]

function PartRankingCard() {
  const [items, setItems] = useState(null)
  const [suppliers, setSuppliers] = useState([])
  const [sort, setSort] = useState('durability_h')
  const [minQuality, setMinQuality] = useState('')
  const [supplierId, setSupplierId] = useState('')

  const qs = () => {
    const p = new URLSearchParams({ format: 'json', sort })
    if (minQuality) p.set('min_quality', minQuality)
    if (supplierId) p.set('supplier_id', supplierId)
    return p.toString()
  }
  useEffect(() => {
    api(`/reports/part-ranking?${qs()}`)
      .then((r) => setItems(r.items || []))
      .catch((e) => { toast.error(e.message); setItems([]) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, minQuality, supplierId])
  useEffect(() => { api('/suppliers').then((r) => setSuppliers(r.items || [])).catch(() => {}) }, [])

  const dl = async (fmt) => {
    const p = new URLSearchParams({ format: fmt, sort })
    if (minQuality) p.set('min_quality', minQuality)
    if (supplierId) p.set('supplier_id', supplierId)
    try { await apiDownload(`/reports/part-ranking?${p.toString()}`, `ranking_pecas.${fmt === 'pdf' ? 'pdf' : 'xlsx'}`) }
    catch (e) { toast.error(e.message) }
  }
  return (
    <Card className="glow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-primary" /> Ranking de Peças</CardTitle>
        <CardDescription>Durabilidade observada (horas/km) e qualidade de cada peça — com custo sempre ao lado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Ordenar por</span>
          <select className="h-8 rounded-md border border-border bg-background px-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
          <span className="text-xs text-muted-foreground ml-2">Nota mín.</span>
          <select className="h-8 rounded-md border border-border bg-background px-2 text-sm" value={minQuality} onChange={(e) => setMinQuality(e.target.value)}>
            <option value="">todas</option>{[1, 2, 3, 4, 4.5].map((q) => <option key={q} value={q}>≥ {q}</option>)}
          </select>
          <span className="text-xs text-muted-foreground ml-2">Fornecedor</span>
          <select className="h-8 rounded-md border border-border bg-background px-2 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">todos</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {items === null && <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>}
        {items && items.length === 0 && <p className="text-sm text-muted-foreground">Sem peças cadastradas.</p>}
        {items && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border/50">
                  <th className="py-1.5 pr-2">Peça</th>
                  <th className="py-1.5 px-2 text-right">Fornecedor</th>
                  <th className="py-1.5 px-2 text-right">Nota</th>
                  <th className="py-1.5 px-2 text-right">Durab. (h)</th>
                  <th className="py-1.5 px-2 text-right">Durab. (km)</th>
                  <th className="py-1.5 px-2 text-right">Valor (h/R$)</th>
                  <th className="py-1.5 px-2 text-right">Trocas</th>
                  <th className="py-1.5 pl-2 text-right">Custo unit.</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.partId} className="border-b border-border/30">
                    <td className="py-1.5 pr-2">{i.part}</td>
                    <td className="py-1.5 px-2 text-right">{i.supplier ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{i.qualityRating ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-semibold text-emerald-400">{i.avgDurabilityHours ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{i.avgDurabilityKm ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{i.valuePerCost ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{i.replacements}</td>
                    <td className="py-1.5 pl-2 text-right tabular-nums">R$ {i.unitCost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => dl('xlsx')}><FileSpreadsheet className="w-4 h-4 mr-1.5" />Excel</Button>
          <Button variant="outline" size="sm" onClick={() => dl('pdf')}><FileDown className="w-4 h-4 mr-1.5" />PDF</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ReportsPage({ features }) {
  // Feature flags do plano (o gate real é o backend; aqui só escondemos). null = ainda carregando.
  const has = (f) => !features || features.includes(f)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><FileText className="w-7 h-7 text-primary" /> Relatórios</h1>
        <p className="text-muted-foreground text-sm">Exporte os dados operacionais e de performance em Excel, PDF ou KML</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Operacional</h2>
        <RouteHistoryCard canKml={has('integrations')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReportCard
            icon={Timer}
            title="Jornada de Trabalho"
            description="Por turno: operador, frota, horas de trabalho × ocioso, combustível, L/h e aproveitamento."
            path="/reports/shifts"
            filenameBase="jornada"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ReportCard
            icon={Gauge}
            title="Performance de Máquina"
            description="Por frota: horas, aproveitamento, L/h, horímetro, distância (km), alertas, custo e faturamento potencial."
            path="/reports/machine-performance"
            filenameBase="performance_maquina"
          />
          <ReportCard
            icon={Users}
            title="Ranking de Operadores"
            description="Por operador: horas, produtividade (L/h), consumo ocioso e % de tempo ocioso."
            path="/reports/operators-ranking"
            filenameBase="ranking_operadores"
          />
          <ReportCard
            icon={Fuel}
            title="Consumo por Hectare"
            description="Por talhão: combustível consumido em trabalho e litros por hectare (L/ha)."
            path="/reports/fuel-per-hectare"
            filenameBase="consumo_hectare"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Custos &amp; Ocorrências</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReportCard
            icon={Wallet}
            title="Custos de Manutenção"
            description="Por frota: peças + mão de obra + custo de parada (horas × taxa/h) = custo total."
            path="/reports/maintenance-costs"
            filenameBase="custos_manutencao"
          />
          <ReportCard
            icon={AlertTriangle}
            title="Ocorrências / Alertas"
            description="Alertas do período com o operador identificado: frota, operador, tipo, status e data."
            path="/reports/alerts"
            filenameBase="ocorrencias"
          />
          {has('stock') && <ReportCard
            icon={Package}
            title="Inventário de Peças"
            description="Estoque de peças: saldo, mínimo, custo unitário, valor e status (OK/baixo)."
            path="/reports/parts"
            filenameBase="inventario_pecas"
          />}
          {has('stock') && <ReportCard
            icon={ArrowLeftRight}
            title="Movimentações de Estoque"
            description="Entradas, saídas e baixas por O.S.: data, peça, tipo, qtde, lote, fornecedor e usuário."
            path="/reports/stock-movements"
            filenameBase="movimentacoes_estoque"
          />}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Confiabilidade &amp; Custo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReportCard
            icon={ShieldCheck}
            title="Confiabilidade & Custo (planilha)"
            description="Por frota: preventiva × corretiva, % corretiva, disponibilidade, MTBF, horas e R$ por hora trabalhada."
            path="/reports/reliability"
            filenameBase="confiabilidade"
          />
          {has('stock') && <ReportCard
            icon={Gauge}
            title="Peças por km rodado"
            description="Por máquina × peça: km rodados, qtde, custo, km por peça e peças a cada 1.000 km."
            path="/reports/parts-per-km"
            filenameBase="pecas_por_km"
          />}
        </div>
        <ConfiabilidadePage />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Reincidência &amp; Retrabalho</h2>
        <ReincidenciaPage />
      </section>

      {has('stock') && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Oficina — Cruzamentos</h2>
          <PartRankingCard />
          <SupplierQualityCard />
        </section>
      )}
    </div>
  )
}
