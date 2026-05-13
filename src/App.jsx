import { useState } from 'react'
import Map from './components/Map'
import SearchPanel from './components/SearchPanel'
import RecommendedRoutes from './components/RecommendedRoutes'
import RouteAlternatives from './components/RouteAlternatives'
import { getRouteAlternatives } from './services/routing'
import { fetchCyclingInfrastructure, fetchNamedRoutes, bboxFromRoute } from './services/overpass'

export default function App() {
  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [routes, setRoutes] = useState([])
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [clickMode, setClickMode] = useState('start')

  const [showCyclingInfra, setShowCyclingInfra] = useState(false)
  const [cyclingInfra, setCyclingInfra] = useState(null)
  const [infraLoading, setInfraLoading] = useState(false)

  const [namedRoutes, setNamedRoutes] = useState([])
  const [activeRouteIds, setActiveRouteIds] = useState([])
  const [routesLoading, setRoutesLoading] = useState(false)
  const [activeRecIds, setActiveRecIds] = useState([])

  const route = routes[selectedRouteIdx] || null

  const handleMapClick = (latlng) => {
    const point = { lat: latlng.lat, lng: latlng.lng, display_name: `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}` }
    if (clickMode === 'start') { setStart(point); setClickMode('end') }
    else { setEnd(point); setClickMode('start') }
    setRoutes([]); setError(null)
  }

  const handleStartSelect = (point) => { setStart(point); setRoutes([]); setError(null) }
  const handleEndSelect = (point) => { setEnd(point); setRoutes([]); setError(null) }

  const handleCalculate = async () => {
    if (!start || !end) return
    setLoading(true); setError(null); setRoutes([])
    try {
      const alternatives = await getRouteAlternatives(start, end)
      // Union bbox of all route coordinates for accurate infra classification
      const allCoords = alternatives.flatMap(r => r.geometry.coordinates)
      const routeBbox = bboxFromRoute(allCoords)
      const freshInfra = await fetchCyclingInfrastructure(routeBbox).catch(err => {
        console.error('Overpass non raggiungibile:', err)
        return null
      })
      setCyclingInfra(freshInfra)
      setSelectedRouteIdx(0)
      setRoutes(alternatives)
    }
    catch (e) { setError(e.message || 'Errore nel calcolo del percorso') }
    finally { setLoading(false) }
  }

  const handleClear = () => {
    setStart(null); setEnd(null); setRoutes([]); setSelectedRouteIdx(0); setError(null); setClickMode('start')
  }

  const handleToggleCyclingInfra = async () => {
    const next = !showCyclingInfra
    setShowCyclingInfra(next)
    if (next && !cyclingInfra) {
      setInfraLoading(true)
      try { setCyclingInfra(await fetchCyclingInfrastructure()) }
      catch { setError('Errore nel caricamento delle piste ciclabili') }
      finally { setInfraLoading(false) }
    }
  }

  const handleLoadRoutes = async () => {
    setRoutesLoading(true)
    try {
      const loaded = await fetchNamedRoutes()
      setNamedRoutes(loaded)
      setActiveRouteIds(loaded.map(r => r.id))
    }
    catch { setError('Errore nel caricamento dei percorsi') }
    finally { setRoutesLoading(false) }
  }

  const handleToggleRoute = (id) => {
    setActiveRouteIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <SearchPanel
          start={start} end={end}
          onStartSelect={handleStartSelect} onEndSelect={handleEndSelect}
          onCalculate={handleCalculate} onClear={handleClear}
          loading={loading} error={error}
          showCyclingInfra={showCyclingInfra} onToggleCyclingInfra={handleToggleCyclingInfra} infraLoading={infraLoading}
          namedRoutes={namedRoutes} activeRouteIds={activeRouteIds}
          onToggleRoute={handleToggleRoute} routesLoading={routesLoading}
          onLoadRoutes={handleLoadRoutes}
        />
        <RouteAlternatives
          routes={routes}
          selectedIdx={selectedRouteIdx}
          onSelect={setSelectedRouteIdx}
        />
        <RecommendedRoutes
          activeIds={activeRecIds}
          onToggle={id => setActiveRecIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
          )}
        />
      </aside>
      <main className="map-area">
        <Map
          start={start} end={end} route={route}
          cyclingInfra={cyclingInfra} showCyclingInfra={showCyclingInfra}
          namedRoutes={namedRoutes} activeRouteIds={activeRouteIds}
          activeRecIds={activeRecIds}
          onMapClick={handleMapClick}
        />
        {route && cyclingInfra && (
          <div className="route-legend">
            <span className="legend-item"><span className="legend-line green" />Pista ciclabile</span>
            <span className="legend-item"><span className="legend-line yellow dashed" />Collegamento su strada</span>
          </div>
        )}
        {route && !cyclingInfra && (
          <div className="route-legend route-legend-warn">
            Dati piste non disponibili — percorso in blu
          </div>
        )}
        <div className="click-hint">
          {!start ? 'Clicca sulla mappa per impostare la partenza (A)'
            : !end ? 'Clicca sulla mappa per impostare la destinazione (B)'
            : route ? null
            : 'Punti impostati — calcola il percorso!'}
        </div>
      </main>
    </div>
  )
}
