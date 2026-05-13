// Default bbox: Prato only (used for manual infra toggle)
const BBOX = '43.83,11.03,43.94,11.20'

// Multiple mirrors — tries each in order until one works
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

function buildNodeMap(elements) {
  const map = {}
  elements.forEach(el => { if (el.type === 'node') map[el.id] = [el.lon, el.lat] })
  return map
}

function waysToGeoJSON(elements) {
  const nodeMap = buildNodeMap(elements)
  const features = elements
    .filter(el => el.type === 'way' && el.nodes?.length > 1)
    .map(way => {
      const coords = way.nodes.map(id => nodeMap[id]).filter(Boolean)
      if (coords.length < 2) return null
      return {
        type: 'Feature',
        properties: { id: way.id, name: way.tags?.name },
        geometry: { type: 'LineString', coordinates: coords },
      }
    })
    .filter(Boolean)
  return { type: 'FeatureCollection', features }
}

async function queryMirror(url, ql) {
  const res = await fetch(url, {
    method: 'POST',
    // Standard Overpass form-encoded format, compatible with all mirrors
    body: new URLSearchParams({ data: `[out:json][timeout:30];${ql}` }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!json.elements) throw new Error('Risposta non valida')
  return json
}

async function query(ql) {
  let lastErr
  for (const mirror of MIRRORS) {
    try { return await queryMirror(mirror, ql) }
    catch (e) { lastErr = e; console.warn(`Overpass mirror ${mirror} fallita:`, e.message) }
  }
  throw new Error(`Tutti i server Overpass non raggiungibili: ${lastErr?.message}`)
}

export async function fetchCyclingInfrastructure(bbox = BBOX) {
  const cacheKey = `cyclo_infra_${bbox}`
  const cached = sessionStorage.getItem(cacheKey)
  if (cached) return JSON.parse(cached)

  const data = await query(
    `(way["highway"="cycleway"](${bbox});` +
    `way["cycleway"~"."](${bbox});` +
    `way["bicycle"="designated"]["highway"~"path|track"](${bbox}););` +
    `out body;>;out skel qt;`
  )
  const geojson = waysToGeoJSON(data.elements)
  sessionStorage.setItem(cacheKey, JSON.stringify(geojson))
  return geojson
}

// Compute a padded bbox string from a GeoJSON route geometry
export function bboxFromRoute(coordinates, paddingDeg = 0.015) {
  const lons = coordinates.map(c => c[0])
  const lats = coordinates.map(c => c[1])
  const minLat = Math.min(...lats) - paddingDeg
  const minLon = Math.min(...lons) - paddingDeg
  const maxLat = Math.max(...lats) + paddingDeg
  const maxLon = Math.max(...lons) + paddingDeg
  return `${minLat.toFixed(5)},${minLon.toFixed(5)},${maxLat.toFixed(5)},${maxLon.toFixed(5)}`
}

export async function fetchNamedRoutes() {
  const cached = sessionStorage.getItem('cyclo_named_routes')
  if (cached) return JSON.parse(cached)

  const data = await query(
    `relation["type"="route"]["route"="bicycle"](${BBOX});` +
    `out body;>;out skel qt;`
  )

  const nodeMap = buildNodeMap(data.elements)
  const wayCoords = {}
  data.elements.forEach(el => {
    if (el.type === 'way' && el.nodes)
      wayCoords[el.id] = el.nodes.map(id => nodeMap[id]).filter(Boolean)
  })

  const COLORS = ['#f97316', '#a855f7', '#06b6d4', '#f43f5e', '#eab308']

  const routes = data.elements
    .filter(el => el.type === 'relation')
    .map((rel, i) => {
      const coords = []
      ;(rel.members || [])
        .filter(m => m.type === 'way')
        .forEach(m => coords.push(...(wayCoords[m.ref] || [])))
      if (coords.length < 2) return null
      return {
        id: rel.id,
        name: rel.tags?.name || rel.tags?.['name:it'] || `Percorso #${rel.id}`,
        color: COLORS[i % COLORS.length],
        distance: rel.tags?.distance,
        geojson: {
          type: 'Feature',
          properties: { name: rel.tags?.name },
          geometry: { type: 'LineString', coordinates: coords },
        },
      }
    })
    .filter(Boolean)

  sessionStorage.setItem('cyclo_named_routes', JSON.stringify(routes))
  return routes
}

// Parse OSM relation members into ordered coordinate arrays.
// Tries to chain ways end-to-end so the route is continuous.
function buildRouteCoords(members, wayCoords) {
  const segments = members
    .filter(m => m.type === 'way')
    .map(m => wayCoords[m.ref])
    .filter(c => c && c.length >= 2)

  if (!segments.length) return []

  // Chain: repeatedly append the segment whose first/last point is closest
  // to the current end — handles reversed ways automatically
  const dist2 = (a, b) => (a[0]-b[0])**2 + (a[1]-b[1])**2
  const chain = [...segments[0]]
  const remaining = segments.slice(1)

  while (remaining.length) {
    const tail = chain[chain.length - 1]
    let bestIdx = 0, bestDist = Infinity, reversed = false

    remaining.forEach((seg, i) => {
      const d1 = dist2(tail, seg[0])
      const d2 = dist2(tail, seg[seg.length - 1])
      if (d1 < bestDist) { bestDist = d1; bestIdx = i; reversed = false }
      if (d2 < bestDist) { bestDist = d2; bestIdx = i; reversed = true }
    })

    const seg = remaining.splice(bestIdx, 1)[0]
    const pts = reversed ? [...seg].reverse() : seg
    // Skip first point if it duplicates tail
    const start = dist2(tail, pts[0]) < 1e-10 ? 1 : 0
    chain.push(...pts.slice(start))
  }
  return chain
}

const INTERCITY_COLORS = ['#dc2626', '#16a34a', '#2563eb', '#d97706', '#7c3aed']

export async function fetchIntercityRoutes() {
  const cached = sessionStorage.getItem('cyclo_intercity')
  if (cached) return JSON.parse(cached)

  const data = await query(
    `relation["type"="route"]["route"="bicycle"](${BBOX_INTERCITY});` +
    `out body;>;out skel qt;`
  )

  const nodeMap = buildNodeMap(data.elements)
  const wayCoords = {}
  data.elements.forEach(el => {
    if (el.type === 'way' && el.nodes)
      wayCoords[el.id] = el.nodes.map(id => nodeMap[id]).filter(Boolean)
  })

  const allRelations = data.elements.filter(el => el.type === 'relation')

  // Keep only routes that span a meaningful distance (> ~5 km bbox diagonal)
  const routes = allRelations
    .map((rel, i) => {
      const coords = buildRouteCoords(rel.members || [], wayCoords)
      if (coords.length < 10) return null

      const lons = coords.map(c => c[0]), lats = coords.map(c => c[1])
      const spanKm = Math.sqrt(
        ((Math.max(...lons) - Math.min(...lons)) * 80) ** 2 +
        ((Math.max(...lats) - Math.min(...lats)) * 111) ** 2
      )
      if (spanKm < 4) return null   // skip short local routes

      return {
        id: rel.id,
        name: rel.tags?.name || rel.tags?.['name:it'] || `Percorso #${rel.id}`,
        network: rel.tags?.network || '',
        ref: rel.tags?.ref || '',
        color: INTERCITY_COLORS[i % INTERCITY_COLORS.length],
        geojson: {
          type: 'Feature',
          properties: { name: rel.tags?.name },
          geometry: { type: 'LineString', coordinates: coords },
        },
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name))

  sessionStorage.setItem('cyclo_intercity', JSON.stringify(routes))
  return routes
}
