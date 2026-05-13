const BROUTER = 'https://brouter.de/brouter'

const ROUTE_PROFILES = [
  { id: 'fast',     profile: 'fastbike', label: 'Più veloce',      desc: 'Percorso rapido su strade' },
  { id: 'balanced', profile: 'trekking', label: 'Consigliato',     desc: 'Preferisce le piste ciclabili' },
  { id: 'scenic',   profile: 'safety',   label: 'Parchi e ombra',  desc: 'Massima preferenza ciclabili e zone verdi' },
]

async function fetchSingleRoute(start, end, profile) {
  const lonlats = `${start.lng},${start.lat}|${end.lng},${end.lat}`
  const url = `${BROUTER}?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=geojson`

  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 500 || text.includes('no route'))
      throw new Error('Percorso non trovato — prova punti più vicini a strade o piste ciclabili')
    throw new Error(`Errore nel calcolo del percorso (${res.status})`)
  }

  const data = await res.json()
  if (!data.features?.length) throw new Error('Percorso non trovato')

  const feature = data.features[0]
  const props = feature.properties || {}

  // Keep only [lon, lat] for Leaflet rendering
  const coordinates = (feature.geometry.coordinates || []).map(([lon, lat]) => [lon, lat])
  const distanceM = parseFloat(props['track-length']) || 0
  const durationS = parseFloat(props['total-time']) || (distanceM / 1000 / 15 * 3600)
  // BRouter reports filtered (smoothed) elevation change in metres
  const ascent  = Math.round(parseFloat(props['filtered ascent'])  || 0)
  const descent = Math.round(parseFloat(props['filtered descent']) || 0)

  return {
    geometry: { type: 'LineString', coordinates },
    distance: distanceM,
    duration: durationS,
    ascent,
    descent,
  }
}

export async function getRouteAlternatives(start, end) {
  const settled = await Promise.allSettled(
    ROUTE_PROFILES.map(p => fetchSingleRoute(start, end, p.profile))
  )
  const results = ROUTE_PROFILES
    .map((p, i) => {
      if (settled[i].status === 'rejected') {
        console.warn(`Profile ${p.profile} failed:`, settled[i].reason)
        return null
      }
      return { ...p, ...settled[i].value }
    })
    .filter(Boolean)

  if (!results.length) throw new Error('Percorso non trovato — prova punti più vicini a strade o piste ciclabili')
  return results
}
