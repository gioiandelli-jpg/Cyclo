import { useState, useEffect, useRef, useCallback } from 'react'
import { searchAddress } from '../services/geocoding'
import RouteAlternatives from './RouteAlternatives'

function debounce(fn, d) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), d) }
}

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
)
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>
)
const CloseIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
)

export default function MobileSheet({
  start, end,
  onStartSelect, onEndSelect,
  onCalculate, onClear,
  loading, error,
  routes, selectedIdx, onRouteSelect,
}) {
  // phase: idle | search | ready | results
  const [phase, setPhase] = useState('idle')
  const [activeField, setActiveField] = useState('end')
  const [startQuery, setStartQuery] = useState('')
  const [endQuery, setEndQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [fetching, setFetching] = useState(false)
  const startRef = useRef(null)
  const endRef = useRef(null)

  // Keep display text in sync with parent
  useEffect(() => { setStartQuery(start?.display_name || '') }, [start])
  useEffect(() => { setEndQuery(end?.display_name || '') }, [end])

  // Transition to results when routes arrive
  useEffect(() => { if (routes.length > 0) setPhase('results') }, [routes.length])

  // Reset to idle when parent clears everything
  useEffect(() => {
    if (!start && !end && phase !== 'idle' && phase !== 'search') {
      setPhase('idle'); setStartQuery(''); setEndQuery(''); setSuggestions([])
    }
  }, [start, end])

  const doSearch = useCallback(debounce(async (q) => {
    if (q.length < 3) { setSuggestions([]); return }
    setFetching(true)
    try { setSuggestions(await searchAddress(q)) }
    catch { setSuggestions([]) }
    finally { setFetching(false) }
  }, 300), [])

  const handleQueryChange = (field, value) => {
    field === 'start' ? setStartQuery(value) : setEndQuery(value)
    setSuggestions([])
    if (!value) { field === 'start' ? onStartSelect(null) : onEndSelect(null); return }
    doSearch(value)
  }

  const handleSuggestionSelect = (item) => {
    const pt = { lat: parseFloat(item.lat), lng: parseFloat(item.lon), display_name: item.display_name }
    setSuggestions([])
    if (activeField === 'start') {
      onStartSelect(pt); setStartQuery(item.display_name)
      if (endQuery) { setPhase('ready') }
      else { setActiveField('end'); setTimeout(() => endRef.current?.focus(), 60) }
    } else {
      onEndSelect(pt); setEndQuery(item.display_name)
      if (startQuery) { setPhase('ready') }
      else { setActiveField('start'); setTimeout(() => startRef.current?.focus(), 60) }
    }
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => {
        const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude, display_name: 'La mia posizione' }
        onStartSelect(pt); setStartQuery('La mia posizione')
        if (endQuery) { setPhase('ready') }
        else { setActiveField('end'); setTimeout(() => endRef.current?.focus(), 60) }
      },
      () => alert('Impossibile ottenere la posizione.')
    )
  }

  const openSearch = () => {
    setPhase('search'); setActiveField('end')
    setTimeout(() => endRef.current?.focus(), 80)
  }

  const goBack = () => {
    setSuggestions([])
    setPhase(start && end ? 'ready' : 'idle')
  }

  const clearAll = () => {
    onClear(); setStartQuery(''); setEndQuery(''); setSuggestions([])
    setPhase('idle')
  }

  return (
    <>
      {phase === 'search' && <div className="map-scrim" onClick={goBack} />}

      <div className={`ms ms-${phase}`}>
        <div className="ms-handle" />

        {/* ── IDLE ── */}
        {phase === 'idle' && (
          <button className="ms-pill" onClick={openSearch}>
            <SearchIcon />
            <span>Dove vuoi andare?</span>
          </button>
        )}

        {/* ── SEARCH ── */}
        {phase === 'search' && (
          <div className="ms-search">
            <button className="ms-back" onClick={goBack}><BackIcon /></button>

            <div className="ms-fields">
              {/* Start field */}
              <div
                className={`ms-field${activeField === 'start' ? ' ms-field-active' : ''}`}
                onClick={() => { setActiveField('start'); startRef.current?.focus() }}
              >
                <span className="ms-dot ms-dot-a" />
                <input
                  ref={startRef}
                  className="ms-input"
                  value={startQuery}
                  onChange={e => handleQueryChange('start', e.target.value)}
                  onFocus={() => { setActiveField('start'); if (startQuery.length >= 3) doSearch(startQuery) }}
                  placeholder="Partenza…"
                  autoComplete="off"
                />
                {activeField === 'start' && !startQuery
                  ? <button className="ms-gps" onClick={handleGeolocate}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                      </svg>
                      GPS
                    </button>
                  : startQuery
                    ? <button className="ms-clear-field" onMouseDown={() => { setStartQuery(''); onStartSelect(null); setSuggestions([]) }}><CloseIcon /></button>
                    : null
                }
              </div>

              <div className="ms-connector" />

              {/* End field */}
              <div
                className={`ms-field${activeField === 'end' ? ' ms-field-active' : ''}`}
                onClick={() => { setActiveField('end'); endRef.current?.focus() }}
              >
                <span className="ms-dot ms-dot-b" />
                <input
                  ref={endRef}
                  className="ms-input"
                  value={endQuery}
                  onChange={e => handleQueryChange('end', e.target.value)}
                  onFocus={() => { setActiveField('end'); if (endQuery.length >= 3) doSearch(endQuery) }}
                  placeholder="Destinazione…"
                  autoComplete="off"
                />
                {endQuery && (
                  <button className="ms-clear-field" onMouseDown={() => { setEndQuery(''); onEndSelect(null); setSuggestions([]) }}><CloseIcon /></button>
                )}
              </div>
            </div>

            {/* Suggestions (inline, not dropdown) */}
            {fetching && <p className="ms-fetching">Ricerca…</p>}
            {!fetching && suggestions.length > 0 && (
              <ul className="ms-suggestions">
                {suggestions.map((s, i) => (
                  <li key={i} className="ms-suggestion" onMouseDown={() => handleSuggestionSelect(s)}>
                    <span className="ms-sugg-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                    </span>
                    <span className="ms-sugg-text">{s.display_name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── READY ── */}
        {phase === 'ready' && (
          <div className="ms-ready">
            <button className="ms-points-row" onClick={() => setPhase('search')}>
              <div className="ms-point-line">
                <span className="ms-dot ms-dot-a" />
                <span className="ms-point-label">{startQuery || 'Partenza'}</span>
              </div>
              <div className="ms-vline" />
              <div className="ms-point-line">
                <span className="ms-dot ms-dot-b" />
                <span className="ms-point-label">{endQuery || 'Destinazione'}</span>
              </div>
            </button>
            {error && <div className="ms-error">{error}</div>}
            <div className="ms-ready-actions">
              <button className="ms-btn-calc" onClick={onCalculate} disabled={loading}>
                {loading ? <><span className="ms-spinner" />Calcolo…</> : 'Calcola percorso'}
              </button>
              <button className="ms-btn-clear" onClick={clearAll}>Azzera</button>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === 'results' && (
          <div className="ms-results">
            <div className="ms-results-header">
              <button className="ms-back ms-back-sm" onClick={clearAll}><CloseIcon /></button>
              <span className="ms-results-title">Percorsi</span>
              <span className="ms-results-sub">{startQuery} → {endQuery}</span>
            </div>
            <RouteAlternatives routes={routes} selectedIdx={selectedIdx} onSelect={onRouteSelect} />
          </div>
        )}
      </div>
    </>
  )
}
