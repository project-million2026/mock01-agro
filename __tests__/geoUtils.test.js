import { describe, it, expect } from 'vitest'
import { parseGeoFile } from '@/lib/geoUtils'

// jsdom fornece File/Blob; parseGeoFile usa file.text() para .geojson.
function geojsonFile(obj, name = 'area.geojson') {
  return new File([JSON.stringify(obj)], name, { type: 'application/geo+json' })
}

const POLYGON_FEATURE = {
  type: 'Feature',
  properties: { name: 'T1' },
  geometry: { type: 'Polygon', coordinates: [[[-48.1, -10.1], [-48.2, -10.1], [-48.2, -10.2], [-48.1, -10.1]]] },
}

describe('geoUtils.parseGeoFile', () => {
  it('extrai polígonos de um FeatureCollection GeoJSON', async () => {
    const fc = { type: 'FeatureCollection', features: [POLYGON_FEATURE] }
    const polys = await parseGeoFile(geojsonFile(fc))
    expect(polys).toHaveLength(1)
    expect(polys[0].geometry.type).toBe('Polygon')
  })

  it('aceita extensão .json além de .geojson', async () => {
    const fc = { type: 'FeatureCollection', features: [POLYGON_FEATURE] }
    const polys = await parseGeoFile(geojsonFile(fc, 'area.json'))
    expect(polys).toHaveLength(1)
  })

  it('extrai polígonos de um arquivo KML', async () => {
    const kmlStr = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>T</name>
<Polygon><outerBoundaryIs><LinearRing><coordinates>
-48.1,-10.1 -48.2,-10.1 -48.2,-10.2 -48.1,-10.1
</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`
    const polys = await parseGeoFile(new File([kmlStr], 'area.kml', { type: 'application/vnd.google-earth.kml+xml' }))
    expect(polys.length).toBeGreaterThanOrEqual(1)
    expect(polys[0].geometry.type).toMatch(/Polygon/)
  })

  it('rejeita formato não suportado', async () => {
    await expect(parseGeoFile(new File(['x'], 'foo.txt'))).rejects.toThrow(/Formato não suportado/)
  })

  it('rejeita GeoJSON sem polígonos (só pontos/linhas)', async () => {
    const fc = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [-48, -10] } }],
    }
    await expect(parseGeoFile(geojsonFile(fc))).rejects.toThrow(/Polígonos/)
  })
})
