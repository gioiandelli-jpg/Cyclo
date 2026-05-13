export async function searchAddress(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&bounded=1&viewbox=10.9,43.75,11.25,44.05&countrycodes=it`
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'it', 'User-Agent': 'Cyclo/1.0' },
  })
  if (!res.ok) throw new Error('Errore nella ricerca')
  return res.json()
}
