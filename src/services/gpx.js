const COLORS = ['#f97316', '#a855f7', '#06b6d4', '#f43f5e', '#eab308', '#10b981']

export function parseGPX(xmlText, colorIndex = 0) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')

  if (doc.querySelector('parsererror')) throw new Error('File GPX non valido')

  const name =
    doc.querySelector('trk > name')?.textContent?.trim() ||
    doc.querySelector('rte > name')?.textContent?.trim() ||
    doc.querySelector('metadata > name')?.textContent?.trim() ||
    'Percorso importato'

  // Collect points from tracks (trkseg/trkpt) and routes (rtept)
  const points = []

  doc.querySelectorAll('trkpt, rtept').forEach(pt => {
    const lat = parseFloat(pt.getAttribute('lat'))
    const lon = parseFloat(pt.getAttribute('lon'))
    if (!isNaN(lat) && !isNaN(lon)) points.push([lon, lat])
  })

  if (points.length < 2) throw new Error('Il file GPX non contiene punti sufficienti')

  // Estimate distance in km
  let distKm = 0
  for (let i = 1; i < points.length; i++) {
    distKm += haversine(points[i - 1], points[i])
  }

  return {
    id: `gpx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name,
    color: COLORS[colorIndex % COLORS.length],
    distanceKm: distKm.toFixed(1),
    geojson: {
      type: 'Feature',
      properties: { name },
      geometry: { type: 'LineString', coordinates: points },
    },
  }
}

function haversine([lon1, lat1], [lon2, lat2]) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
