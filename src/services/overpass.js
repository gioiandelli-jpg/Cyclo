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

export async function fetchCyclingInfrastructure() {
  const cached = sessionStorage.getItem('cyclo_infra')
  if (cached) return JSON.parse(cached)

  const data = await query(
    `(way["highway"="cycleway"](${BBOX});` +
    `way["cycleway"~"."](${BBOX});` +
    `way["bicycle"="designated"]["highway"~"path|track"](${BBOX}););` +
    `out body;>;out skel qt;`
  )
  const geojson = waysToGeoJSON(data.elements)
  sessionStorage.setItem('cyclo_infra', JSON.stringify(geojson))
  return geojson
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
