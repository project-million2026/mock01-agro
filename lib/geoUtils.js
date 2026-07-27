import shp from 'shpjs'
import { kml } from '@tmcw/togeojson'

/**
 * Faz a leitura de um arquivo geográfico (.zip com SHP, .kml ou .geojson)
 * e retorna um array de features GeoJSON válidas (Polygon ou MultiPolygon).
 *
 * @param {File} file O arquivo selecionado pelo usuário
 * @returns {Promise<Array<Object>>} Array de Features GeoJSON
 */
export async function parseGeoFile(file) {
  const extension = file.name.split('.').pop().toLowerCase()

  if (extension === 'zip') {
    return await parseShapefileZip(file)
  } else if (extension === 'kml') {
    return await parseKmlFile(file)
  } else if (extension === 'geojson' || extension === 'json') {
    return await parseGeoJsonFile(file)
  } else {
    throw new Error('Formato não suportado. Use .zip (Shapefile), .kml ou .geojson')
  }
}

async function parseShapefileZip(file) {
  const arrayBuffer = await file.arrayBuffer()
  // shpjs retorna um GeoJSON FeatureCollection ou um array de FeatureCollections
  const geojson = await shp(arrayBuffer)
  return extractFeatures(geojson)
}

async function parseKmlFile(file) {
  const text = await file.text()
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(text, 'text/xml')
  
  // togeojson.kml converte o DOM do KML para GeoJSON FeatureCollection
  const geojson = kml(xmlDoc)
  return extractFeatures(geojson)
}

async function parseGeoJsonFile(file) {
  const text = await file.text()
  const geojson = JSON.parse(text)
  return extractFeatures(geojson)
}

/**
 * Normaliza qualquer retorno (Feature, FeatureCollection ou Array)
 * em um array de Features simplificado.
 */
function extractFeatures(geoData) {
  let features = []
  
  if (Array.isArray(geoData)) {
    geoData.forEach(item => {
      if (item.type === 'FeatureCollection') {
        features.push(...item.features)
      } else if (item.type === 'Feature') {
        features.push(item)
      }
    })
  } else if (geoData.type === 'FeatureCollection') {
    features = geoData.features
  } else if (geoData.type === 'Feature') {
    features.push(geoData)
  } else if (geoData.type === 'Polygon' || geoData.type === 'MultiPolygon') {
    // Se for apenas uma geometria (sem `file` em escopo aqui — rótulo genérico)
    features.push({
      type: 'Feature',
      properties: { name: 'Área Importada' },
      geometry: geoData
    })
  }

  // Filtra apenas Features com geometria de polígono
  const polygons = features.filter(f => 
    f.geometry && 
    (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
  )

  if (polygons.length === 0) {
    throw new Error('O arquivo não contém áreas desenhadas (Polígonos). Foram encontradas apenas linhas ou pontos.')
  }

  return polygons
}
