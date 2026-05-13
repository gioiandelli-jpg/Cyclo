import { useState, useEffect, useRef, useCallback } from 'react'
import { searchAddress } from '../services/geocoding'

function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

function AddressInput({ label, color, value, onSelect, onGeolocate, placeholder }) {
  const [query, setQuery] = useState(value?.display_name || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (value?.display_name) setQuery(value.display_name)
  }, [value])

  const doSearch = useCallback(
    debounce(async (q) => {
      if (q.length < 3) { setResults([]); setOpen(false); return }
      setLoading(true)
      try {
        const data = await searchAddress(q)
        setResults(data)
        setOpen(data.length > 0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300),
    []
  )

  const handleChange = (e) => {
    const q = e.target.value
    setQuery(q)
    if (!q) { onSelect(null); setResults([]); setOpen(false); return }
    doSearch(q)
  }

  const handleSelect = (item) => {
    setQuery(item.display_name)
    setResults([])
    setOpen(false)
    onSelect({ lat: parseFloat(item.lat), lng: parseFloat(item.lon), display_name: item.display_name })
  }

  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="input-group" ref={wrapRef}>
      <div className="input-label-row">
        <span className="point-badge" style={{ background: color }}>{label}</span>
        <span className="input-label-text">{label === 'A' ? 'Partenza' : 'Destinazione'}</span>
        {label === 'A' && (
          <button className="geolocate-btn" onClick={onGeolocate} title="Usa la tua posizione">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
              <circle cx="12" cy="12" r="9" opacity="0.3"/>
            </svg>
            GPS
          </button>
        )}
      </div>
      <div className="input-wrap">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          className="address-input"
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && <span className="input-spinner" />}
      </div>
      {open && (
        <ul className="autocomplete-list">
          {results.map((item) => (
            <li key={item.place_id} onMouseDown={() => handleSelect(item)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0,color:'#94a3b8'}}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>{item.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function SearchPanel({
  start, end, onStartSelect, onEndSelect,
  onCalculate, onClear, loading, error,
  showCyclingLayer, onToggleCyclingLayer,
}) {
  const handleGeolocate = () => {
    if (!navigator.geolocation) { alert('Geolocalizzazione non supportata dal browser'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => onStartSelect({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        display_name: 'La mia posizione',
      }),
      () => alert('Impossibile ottenere la posizione. Verifica i permessi del browser.')
    )
  }

  return (
    <div className="search-panel">
      <div className="panel-header">
        <span className="panel-logo">🚲</span>
        <div>
          <h1 className="panel-title">Cyclo</h1>
          <p className="panel-subtitle">Percorsi in bici a Prato</p>
        </div>
      </div>

      <div className="inputs-section">
        <AddressInput
          label="A"
          color="#22c55e"
          value={start}
          onSelect={onStartSelect}
          onGeolocate={handleGeolocate}
          placeholder="Cerca indirizzo di partenza…"
        />
        <div className="route-connector">
          <div className="connector-line" />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </div>
        <AddressInput
          label="B"
          color="#ef4444"
          value={end}
          onSelect={onEndSelect}
          onGeolocate={null}
          placeholder="Cerca indirizzo di destinazione…"
        />
      </div>

      <p className="map-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
        </svg>
        Oppure clicca sulla mappa per impostare i punti
      </p>

      <div className="actions">
        <button
          className="btn btn-primary"
          onClick={onCalculate}
          disabled={!start || !end || loading}
        >
          {loading ? (
            <><span className="btn-spinner" /> Calcolo…</>
          ) : (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M13 5l7 7-7 7"/></svg> Calcola percorso</>
          )}
        </button>
        <button className="btn btn-secondary" onClick={onClear}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
          </svg>
          Azzera
        </button>
      </div>

      {error && (
        <div className="error-msg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          {error}
        </div>
      )}

      <div className="layer-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showCyclingLayer}
            onChange={onToggleCyclingLayer}
          />
          <span className="toggle-switch" />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/>
            <circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h3.5"/>
          </svg>
          Mostra piste ciclabili
        </label>
      </div>
    </div>
  )
}
