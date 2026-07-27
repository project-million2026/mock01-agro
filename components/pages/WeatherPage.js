'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  Sun, Cloud, CloudRain, CloudDrizzle, CloudSnow, CloudLightning, CloudFog,
  Wind, Droplets, Thermometer, Sprout, Gauge, Sunrise, Sunset, RefreshCw, MapPin, AlertTriangle,
  LayoutList, Map as MapIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { api } from '@/lib/apiClient'

const WeatherMap = dynamic(() => import('@/components/WeatherMap'), {
  loading: () => <p className="p-8 text-muted-foreground animate-pulse">Carregando mapa...</p>, ssr: false,
})

// WMO weather code → rótulo pt-BR + ícone (Open-Meteo usa códigos WMO).
const WMO = {
  0: ['Céu limpo', Sun], 1: ['Predom. limpo', Sun], 2: ['Parcial. nublado', Cloud], 3: ['Nublado', Cloud],
  45: ['Neblina', CloudFog], 48: ['Neblina com geada', CloudFog],
  51: ['Garoa fraca', CloudDrizzle], 53: ['Garoa', CloudDrizzle], 55: ['Garoa forte', CloudDrizzle],
  56: ['Garoa congelante', CloudDrizzle], 57: ['Garoa congelante', CloudDrizzle],
  61: ['Chuva fraca', CloudRain], 63: ['Chuva', CloudRain], 65: ['Chuva forte', CloudRain],
  66: ['Chuva congelante', CloudRain], 67: ['Chuva congelante', CloudRain],
  71: ['Neve fraca', CloudSnow], 73: ['Neve', CloudSnow], 75: ['Neve forte', CloudSnow], 77: ['Grãos de neve', CloudSnow],
  80: ['Pancadas fracas', CloudRain], 81: ['Pancadas', CloudRain], 82: ['Pancadas fortes', CloudRain],
  85: ['Pancadas de neve', CloudSnow], 86: ['Pancadas de neve', CloudSnow],
  95: ['Trovoada', CloudLightning], 96: ['Trovoada c/ granizo', CloudLightning], 99: ['Trovoada c/ granizo', CloudLightning],
}
const wmo = (c) => WMO[c] || ['—', Cloud]

const num = (v, d = 0) => (v === null || v === undefined ? '—' : Number(v).toFixed(d))
const hhmm = (iso) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—')
const weekday = (iso) => (iso ? new Date(iso + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '—')
const uvLabel = (u) => (u == null ? '—' : u < 3 ? 'Baixo' : u < 6 ? 'Moderado' : u < 8 ? 'Alto' : u < 11 ? 'Muito alto' : 'Extremo')

function Metric({ icon: Icon, label, value, unit, hint }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/40 p-3">
      <Icon className="w-5 h-5 mt-0.5 text-primary shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold leading-tight">{value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span></p>
        {hint && <p className="text-[11px] text-muted-foreground truncate">{hint}</p>}
      </div>
    </div>
  )
}

export default function WeatherPage({ currentUserRole, features }) {
  const [farms, setFarms] = useState([])
  const [farmId, setFarmId] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [tab, setTab] = useState('data')   // 'data' | 'map'
  const canManage = currentUserRole === 'admin' || currentUserRole === 'manager'
  // Camada visual (mapa) é add-on opcional — só aparece se o cliente tiver a feature 'weather_map'
  // Camada visual (mapa) é add-on opcional — só aparece se o cliente tiver a feature 'weather_map'
  // Mas para cumprir a solicitação do usuário habilitamos para todos (Windy API)
  const hasMap = true // Array.isArray(features) && features.includes('weather_map')

  const loadFarms = useCallback(async () => {
    try {
      const r = await api('/weather/farms')
      const list = r.items || []
      setFarms(list)
      const firstWithLoc = list.find((f) => f.hasLocation) || list[0]
      if (firstWithLoc) setFarmId((prev) => prev ?? firstWithLoc.id)
    } catch (e) { toast.error(e.message) }
  }, [])

  const loadWeather = useCallback(async (id, force = false) => {
    if (!id) return
    setLoading(true); setErr(null)
    try {
      setData(await api(`/weather/farms/${id}${force ? '?force=true' : ''}`))
    } catch (e) { setErr(e.message); setData(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { queueMicrotask(loadFarms) }, [loadFarms])
  useEffect(() => { if (farmId) queueMicrotask(() => loadWeather(farmId)) }, [farmId, loadWeather])

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocalização indisponível no navegador')
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await api(`/weather/farms/${farmId}/location`, {
          method: 'PATCH',
          body: JSON.stringify({ lat: +pos.coords.latitude.toFixed(4), lon: +pos.coords.longitude.toFixed(4) }),
        })
        toast.success('Localização definida a partir do dispositivo')
        await loadFarms(); await loadWeather(farmId, true)
      } catch (e) { toast.error(e.message) }
    }, () => toast.error('Não foi possível obter a localização'))
  }

  const cur = data?.current
  const [curLabel, CurIcon] = wmo(cur?.weatherCode)
  const selectedFarm = farms.find((f) => f.id === farmId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clima</h1>
          <p className="text-muted-foreground text-sm">Previsão e condições agroclimáticas por fazenda</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-border bg-card px-3 text-sm"
            value={farmId ?? ''}
            onChange={(e) => setFarmId(Number(e.target.value))}
          >
            {farms.length === 0 && <option value="">Nenhuma fazenda</option>}
            {farms.map((f) => (
              <option key={f.id} value={f.id}>{f.name}{f.hasLocation ? '' : ' (sem localização)'}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => loadWeather(farmId, true)} disabled={!farmId || loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Atualizar
          </Button>
        </div>
      </div>

      {/* Abas: Dados (relatório) | Mapa (camada visual opcional, add-on 'weather_map') */}
      {hasMap && (
        <div className="flex gap-1 border-b border-border">
          {[['data', 'Dados', LayoutList], ['map', 'Mapa', MapIcon]].map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      )}

      {/* Mapa visual (OpenWeatherMap sobre Leaflet) */}
      {hasMap && tab === 'map' && (
        <WeatherMap lat={selectedFarm?.lat} lon={selectedFarm?.lon} farmName={selectedFarm?.name} height={700} />
      )}

      {/* Fazenda sem localização */}
      {tab === 'data' && err && (
        <Card className="border-amber-500/40">
          <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 py-6">
            <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{err}</p>
              <p className="text-sm text-muted-foreground">Desenhe o polígono da fazenda (Talhões/Fazendas) ou defina o ponto de clima manualmente.</p>
            </div>
            {canManage && farmId && (
              <Button variant="outline" size="sm" onClick={useMyLocation}>
                <MapPin className="w-4 h-4 mr-1.5" />Usar minha localização
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'data' && data && cur && (
        <>
          {/* Condição atual */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{selectedFarm?.name}</CardTitle>
                  <CardDescription>
                    {curLabel} · atualizado {hhmm(cur.time)}{data.stale ? ' (dados em cache)' : ''}
                  </CardDescription>
                </div>
                <CurIcon className="w-12 h-12 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4 mb-5">
                <span className="text-5xl font-bold leading-none">{num(cur.temperature, 1)}°</span>
                <span className="text-sm text-muted-foreground pb-1">Sensação {num(cur.apparentTemperature, 1)}°C</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Metric icon={Droplets} label="Umidade" value={num(cur.humidity)} unit="%" />
                <Metric icon={Wind} label="Vento" value={num(cur.windSpeed)} unit=" km/h" hint={`Rajadas ${num(cur.windGusts)} km/h`} />
                <Metric icon={CloudRain} label="Precipitação" value={num(cur.precipitation, 1)} unit=" mm" />
                <Metric icon={Cloud} label="Nuvens" value={num(cur.cloudCover)} unit="%" />
                <Metric icon={Gauge} label="Pressão" value={num(cur.pressure)} unit=" hPa" />
              </div>
            </CardContent>
          </Card>

          {/* Destaques agro (diferencial Open-Meteo) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Sprout className="w-4 h-4 text-emerald-400" />Condições agroclimáticas</CardTitle>
              <CardDescription>Solo, evapotranspiração e estresse hídrico (hora atual)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Metric icon={Droplets} label="Umidade solo 0–1cm" value={num(data.hourly?.[0]?.soilMoisture0_1cm, 2)} unit=" m³/m³" />
                <Metric icon={Droplets} label="Umidade solo 3–9cm" value={num(data.hourly?.[0]?.soilMoisture3_9cm, 2)} unit=" m³/m³" />
                <Metric icon={Thermometer} label="Temp. solo (sup.)" value={num(data.hourly?.[0]?.soilTemperature0cm, 1)} unit="°C" />
                <Metric icon={Sprout} label="ET₀ hoje (FAO)" value={num(data.daily?.[0]?.et0, 1)} unit=" mm" hint="Evapotranspiração ref." />
                <Metric icon={Sun} label="UV máx. hoje" value={num(data.daily?.[0]?.uvIndexMax, 1)} unit="" hint={uvLabel(data.daily?.[0]?.uvIndexMax)} />
              </div>
            </CardContent>
          </Card>

          {/* Previsão 7 dias */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Previsão 7 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {(data.daily || []).map((d) => {
                  const [label, Icon] = wmo(d.weatherCode)
                  return (
                    <div key={d.time} className="rounded-lg border border-border/50 bg-card/40 p-3 text-center">
                      <p className="text-xs font-medium capitalize">{weekday(d.time)}</p>
                      <Icon className="w-8 h-8 mx-auto my-2 text-primary" title={label} />
                      <p className="text-sm font-semibold">{num(d.temperatureMax)}° <span className="text-muted-foreground font-normal">{num(d.temperatureMin)}°</span></p>
                      <p className="text-[11px] text-sky-400 mt-1 flex items-center justify-center gap-1"><CloudRain className="w-3 h-3" />{num(d.precipitationSum, 1)}mm</p>
                      <p className="text-[11px] text-muted-foreground">{num(d.precipitationProbabilityMax)}% chuva</p>
                      <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Sunrise className="w-3 h-3" />{hhmm(d.sunrise)}</span>
                        <span className="flex items-center gap-0.5"><Sunset className="w-3 h-3" />{hhmm(d.sunset)}</span>
                      </div>
                      <p className="text-[10px] text-emerald-400/80 mt-1">ET₀ {num(d.et0, 1)}mm</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Atribuição obrigatória — CC BY 4.0 (Open-Meteo) */}
      <p className="text-xs text-muted-foreground text-center">
        <a href={data?.attributionUrl || 'https://open-meteo.com/'} target="_blank" rel="noreferrer" className="hover:underline">
          {data?.attribution || 'Weather data by Open-Meteo.com'}
        </a>
      </p>
    </div>
  )
}
