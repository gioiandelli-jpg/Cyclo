const THRESHOLD_M = 20

function toRad(d) { return d * Math.PI / 180 }

function distM(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(a))
}

function ptToSegM(pLat, pLon, aLat, aLon, bLat, bLon) {
  const dx = bLon - aLon, dy = bLat - aLat
  if (dx === 0 && dy === 0) return distM(pLat, pLon, aLat, aLon)
  const t = Math.max(0, Math.min(1,
    ((pLon - aLon) * dx + (pLat - aLat) * dy) / (dx * dx + dy * dy)
  ))
  return distM(pLat, pLon, aLat + t * dy, aLon + t * dx)
}

// Takes route coords in GeoJSON [lon, lat] format.
// Returns array of { isCycling: bool, coords: [[lon, lat], ...] }
// or null if no infra data available.
export function classifyRouteSegments(routeCoords, cyclingInfraGeoJSON) {
  if (!cyclingInfraGeoJSON?.features?.length) return null

  // Flatten all cycling infrastructure into line segments once
  const segs = []
  cyclingInfraGeoJSON.features.forEach(f => {
    const cs = f.geometry?.coordinates || []
    for (let i = 0; i < cs.length - 1; i++) {
      segs.push([cs[i][1], cs[i][0], cs[i + 1][1], cs[i + 1][0]])
    }
  })

  const threshDeg = THRESHOLD_M / 111320

  const onCycling = routeCoords.map(([lon, lat]) =>
    segs.some(([aLat, aLon, bLat, bLon]) => {
      if (
        lat < Math.min(aLat, bLat) - threshDeg ||
        lat > Math.max(aLat, bLat) + threshDeg ||
        lon < Math.min(aLon, bLon) - threshDeg ||
        lon > Math.max(aLon, bLon) + threshDeg
      ) return false
      return ptToSegM(lat, lon, aLat, aLon, bLat, bLon) <= THRESHOLD_M
    })
  )

  const result = []
  let current = { isCycling: onCycling[0], coords: [routeCoords[0]] }

  for (let i = 1; i < routeCoords.length; i++) {
    if (onCycling[i] === current.isCycling) {
      current.coords.push(routeCoords[i])
    } else {
      result.push(current)
      // Overlap by one point so segments join without gaps
      current = { isCycling: onCycling[i], coords: [routeCoords[i - 1], routeCoords[i]] }
    }
  }
  result.push(current)
  return result
}
