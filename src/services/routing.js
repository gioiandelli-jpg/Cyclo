const BROUTER = 'https://brouter.de/brouter'

export async function getBikeRoute(start, end) {
  const lonlats = `${start.lng},${start.lat}|${end.lng},${end.lat}`
  const url = `${BROUTER}?lonlats=${lonlats}&profile=trekking&alternativeidx=0&format=geojson`

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

  const coordinates = (feature.geometry.coordinates || []).map(([lon, lat]) => [lon, lat])
  const distanceM = parseFloat(props['track-length']) || 0
  // BRouter gives total-time in seconds; fallback to 15 km/h estimate
  const durationS = parseFloat(props['total-time']) || (distanceM / 1000 / 15 * 3600)

  return {
    geometry: { type: 'LineString', coordinates },
    distance: distanceM,
    duration: durationS,
    legs: [{ steps: parseMessages(props.messages || []) }],
  }
}

function parseMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 2) return []

  // BRouter prepends a header row with column names when strings are present
  const isHeader = isNaN(parseFloat(messages[0]?.[0]))
  const rows = isHeader ? messages.slice(1) : messages

  // rows: [lon, lat, ele, distFromPrev, turnAngle, hint]
  // skip departure (index 0) and arrival (last)
  return rows.slice(1, -1).map((row, i) => {
    const angle = parseFloat(row[4]) || 0
    const distToNext = parseFloat(rows[i + 2]?.[3]) || 0
    const hint = (row[5] || '').replace(/^\w\|/, '').trim()

    let modifier = 'straight'
    if (Math.abs(angle) > 150)     modifier = 'u-turn'
    else if (angle > 60)           modifier = 'right'
    else if (angle > 20)           modifier = 'slight right'
    else if (angle < -60)          modifier = 'left'
    else if (angle < -20)          modifier = 'slight left'

    return {
      maneuver: { type: 'turn', modifier },
      name: hint,
      distance: distToNext,
    }
  })
}
