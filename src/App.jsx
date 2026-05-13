import { useState } from 'react'
import Map from './components/Map'
import SearchPanel from './components/SearchPanel'
import RouteAlternatives from './components/RouteAlternatives'
import { getRouteAlternatives } from './services/routing'
import { fetchCyclingInfrastructure, bboxFromRoute } from './services/overpass'

export default function App() {
  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [routes, setRoutes] = useState([])
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [clickMode, setClickMode] = useState('start')
  const [cyclingInfra, setCyclingInfra] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const route = routes[selectedRouteIdx] || null

  const handleMapClick = (latlng) => {
    const point = { lat: latlng.lat, lng: latlng.lng, display_name: `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}` }
    if (clickMode === 'start') { setStart(point); setClickMode('end') }
    else { setEnd(point); setClickMode('start') }
    setRoutes([]); setSheetOpen(false); setError(null)
  }

  const handleStartSelect = (point) => { setStart(point); setRoutes([]); setSheetOpen(false); setError(null) }
  const handleEndSelect = (point) => { setEnd(point); setRoutes([]); setSheetOpen(false); setError(null) }

  const handleCalculate = async () => {
    if (!start || !end) return
    setLoading(true); setError(null); setRoutes([]); setSheetOpen(false)
    try {
      const alternatives = await getRouteAlternatives(start, end)
      const allCoords = alternatives.flatMap(r => r.geometry.coordinates)
      const freshInfra = await fetchCyclingInfrastructure(bboxFromRoute(allCoords)).catch(() => null)
      setCyclingInfra(freshInfra)
      setSelectedRouteIdx(0)
      setRoutes(alternatives)
      setSheetOpen(true)
    } catch (e) {
      setError(e.message || 'Errore nel calcolo del percorso')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setStart(null); setEnd(null); setRoutes([]); setSelectedRouteIdx(0)
    setError(null); setClickMode('start'); setSheetOpen(false)
  }

  const hintText = !start
    ? 'Tocca la mappa per impostare la partenza'
    : !end
    ? 'Tocca la mappa per impostare la destinazione'
    : routes.length
    ? null
    : 'Punti impostati — calcola il percorso!'

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">🚲</span>
          <div>
            <h1 className="brand-name">Cyclo</h1>
            <p className="brand-sub">Percorsi in bici</p>
          </div>
        </div>
        <SearchPanel
          start={start} end={end}
          onStartSelect={handleStartSelect} onEndSelect={handleEndSelect}
          onCalculate={handleCalculate} onClear={handleClear}
          loading={loading} error={error}
        />
        <div className="sidebar-routes">
          <RouteAlternatives routes={routes} selectedIdx={selectedRouteIdx} onSelect={setSelectedRouteIdx} />
        </div>
      </aside>

      <main className="map-area">
        <Map
          start={start} end={end} route={route}
          cyclingInfra={cyclingInfra}
          onMapClick={handleMapClick}
        />

        {/* Mobile bottom sheet */}
        <div className={`mobile-sheet${sheetOpen ? ' visible' : ''}`}>
          <div className="sheet-top">
            <div className="sheet-handle" />
            <button className="sheet-dismiss" onClick={() => setSheetOpen(false)} aria-label="Chiudi">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
          <RouteAlternatives routes={routes} selectedIdx={selectedRouteIdx} onSelect={setSelectedRouteIdx} />
        </div>

        {/* FAB to reopen sheet after dismiss */}
        {routes.length > 0 && !sheetOpen && (
          <button className="fab-routes" onClick={() => setSheetOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 15l7-7 7 7"/>
            </svg>
            Percorsi
          </button>
        )}

        {route && cyclingInfra && (
          <div className="route-legend">
            <span className="legend-item"><span className="legend-line green" />Ciclabile</span>
            <span className="legend-item"><span className="legend-line yellow dashed" />Strada</span>
          </div>
        )}
        {hintText && <div className="click-hint">{hintText}</div>}
      </main>
    </div>
  )
}
