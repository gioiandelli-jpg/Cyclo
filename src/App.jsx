import { useState } from 'react'
import Map from './components/Map'
import SearchPanel from './components/SearchPanel'
import RouteInfo from './components/RouteInfo'
import { getBikeRoute } from './services/routing'

export default function App() {
  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [route, setRoute] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showCyclingLayer, setShowCyclingLayer] = useState(false)
  const [clickMode, setClickMode] = useState('start') // 'start' | 'end'

  const handleMapClick = (latlng) => {
    const point = { lat: latlng.lat, lng: latlng.lng, display_name: `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}` }
    if (clickMode === 'start') {
      setStart(point)
      setClickMode('end')
    } else {
      setEnd(point)
      setClickMode('start')
    }
    setRoute(null)
    setError(null)
  }

  const handleStartSelect = (point) => {
    setStart(point)
    setRoute(null)
    setError(null)
  }

  const handleEndSelect = (point) => {
    setEnd(point)
    setRoute(null)
    setError(null)
  }

  const handleCalculate = async () => {
    if (!start || !end) return
    setLoading(true)
    setError(null)
    try {
      const result = await getBikeRoute(start, end)
      setRoute(result)
    } catch (e) {
      setError(e.message || 'Errore nel calcolo del percorso')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setStart(null)
    setEnd(null)
    setRoute(null)
    setError(null)
    setClickMode('start')
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <SearchPanel
          start={start}
          end={end}
          onStartSelect={handleStartSelect}
          onEndSelect={handleEndSelect}
          onCalculate={handleCalculate}
          onClear={handleClear}
          loading={loading}
          error={error}
          showCyclingLayer={showCyclingLayer}
          onToggleCyclingLayer={() => setShowCyclingLayer(v => !v)}
        />
        <RouteInfo route={route} />
      </aside>
      <main className="map-area">
        <Map
          start={start}
          end={end}
          route={route}
          showCyclingLayer={showCyclingLayer}
          onMapClick={handleMapClick}
        />
        <div className="click-hint">
          {!start
            ? 'Clicca sulla mappa per impostare la partenza (A)'
            : !end
            ? 'Clicca sulla mappa per impostare la destinazione (B)'
            : route
            ? null
            : 'Punti impostati — calcola il percorso!'}
        </div>
      </main>
    </div>
  )
}
