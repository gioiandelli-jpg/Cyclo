export async function getBikeRoute(start, end) {
  const url = `https://router.project-osrm.org/route/v1/cycling/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Errore nel calcolo del percorso')
  const data = await res.json()
  if (data.code !== 'Ok') throw new Error('Percorso non trovato')
  return data.routes[0]
}
