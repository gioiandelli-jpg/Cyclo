export async function searchAddress(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&viewbox=10.80,43.68,11.42,44.02&countrycodes=it`
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'it', 'User-Agent': 'Cyclo/1.0' },
  })
  if (!res.ok) throw new Error('Errore nella ricerca')
  return res.json()
}
