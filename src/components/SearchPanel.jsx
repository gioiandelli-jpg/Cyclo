import { useState, useEffect, useRef, useCallback } from 'react'
import { searchAddress } from '../services/geocoding'

function debounce(fn, delay) {
  let timer
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay) }
}

function AddressInput({ dot, label, value, onSelect, onGeolocate, placeholder }) {
  const [query, setQuery] = useState(value?.display_name || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => { if (value?.display_name) setQuery(value.display_name) }, [value])

  const doSearch = useCallback(
    debounce(async (q) => {
      if (q.length < 3) { setResults([]); setOpen(false); return }
      setLoading(true)
      try {
        const data = await searchAddress(q)
        setResults(data); setOpen(data.length > 0)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 300), []
  )

  const handleChange = (e) => {
    const q = e.target.value
    setQuery(q)
    if (!q) { onSelect(null); setResults([]); setOpen(false); return }
    doSearch(q)
  }

  const handleSelect = (item) => {
    setQuery(item.display_name)
    setResults([]); setOpen(false)
    onSelect({ lat: parseFloat(item.lat), lng: parseFloat(item.lon), display_name: item.display_name })
  }

  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="input-row" ref={wrapRef}>
      <span className="input-dot" style={{ background: dot }} />
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
        {onGeolocate && !loading && (
          <button className="gps-btn" onClick={onGeolocate} title="Usa posizione GPS">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            </svg>
          </button>
        )}
      </div>
      {open && (
        <ul className="autocomplete-list">
          {results.map((item) => (
            <li key={item.place_id} onMouseDown={() => handleSelect(item)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0,opacity:0.4}}>
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

export default function SearchPanel({ start, end, onStartSelect, onEndSelect, onCalculate, onClear, loading, error }) {
  const handleGeolocate = () => {
    if (!navigator.geolocation) { alert('Geolocalizzazione non supportata dal browser'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => onStartSelect({ lat: pos.coords.latitude, lng: pos.coords.longitude, display_name: 'La mia posizione' }),
      () => alert('Impossibile ottenere la posizione. Verifica i permessi del browser.')
    )
  }

  return (
    <div className="search-panel">
      <div className="inputs-card">
        <AddressInput dot="#22c55e" label="A" value={start} onSelect={onStartSelect} onGeolocate={handleGeolocate} placeholder="Partenza…" />
        <div className="input-divider">
          <div className="divider-line" />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          <div className="divider-line" />
        </div>
        <AddressInput dot="#ef4444" label="B" value={end} onSelect={onEndSelect} onGeolocate={null} placeholder="Destinazione…" />
      </div>

      {error && (
        <div className="error-msg">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          {error}
        </div>
      )}

      <div className="actions">
        <button className="btn btn-primary" onClick={onCalculate} disabled={!start || !end || loading}>
          {loading
            ? <><span className="btn-spinner" />Calcolo in corso…</>
            : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 12h18M13 5l7 7-7 7"/></svg>Calcola percorso</>
          }
        </button>
        <button className="btn btn-ghost" onClick={onClear} title="Azzera">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>
    </div>
  )
}
