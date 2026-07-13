// Geographic helpers: point-in-polygon (ray casting) and area calculation (Shoelace on Haversine projection)

// polygon: array of [lat, lng]
export function pointInPolygon(lat, lng, polygon) {
  if (!polygon || polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0]
    const xj = polygon[j][1], yj = polygon[j][0]
    const intersect = ((yi > lat) !== (yj > lat)) && (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// Compute area in hectares using spherical excess approximation (good enough for small polygons)
const EARTH_RADIUS_M = 6378137
function toRad(d) { return (d * Math.PI) / 180 }

export function polygonAreaHa(polygon) {
  if (!polygon || polygon.length < 3) return 0
  let area = 0
  const n = polygon.length
  for (let i = 0; i < n; i++) {
    const [lat1, lng1] = polygon[i]
    const [lat2, lng2] = polygon[(i + 1) % n]
    area += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)))
  }
  area = (Math.abs(area) * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2
  return area / 10000 // m² → ha
}
