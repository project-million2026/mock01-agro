'use client'

export default function WeatherMap({ lat, lon, farmName, polygon, height = 460 }) {
  if (lat == null || lon == null) {
    return <p className="text-sm text-muted-foreground">Selecione uma fazenda com localização para ver o mapa.</p>
  }

  return (
    <div className="space-y-3">
      <div className="w-full rounded-lg overflow-hidden border border-border/50 z-0 bg-muted" style={{ height }}>
        <iframe
          width="100%"
          height="100%"
          src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=10&overlay=wind&product=ecmwf&level=surface&lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&detail=true`}
          frameBorder="0"
          title={`Previsão para ${farmName || 'Fazenda'}`}
        ></iframe>
      </div>
    </div>
  )
}
