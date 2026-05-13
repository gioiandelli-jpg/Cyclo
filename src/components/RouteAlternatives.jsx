function fmt(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}
function fmtTime(s) {
  const m = Math.round(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`
}

export default function RouteAlternatives({ routes, selectedIdx, onSelect }) {
  if (!routes.length) return null
  return (
    <div className="route-alternatives">
      {routes.map((r, i) => (
        <button
          key={r.id}
          className={`route-alt-card${i === selectedIdx ? ' active' : ''}`}
          onClick={() => onSelect(i)}
        >
          <div className="route-alt-header">
            <span className="route-alt-label">{r.label}</span>
            <span className="route-alt-dist">{fmt(r.distance)}</span>
          </div>
          <div className="route-alt-stats">
            <span>⏱ {fmtTime(r.duration)}</span>
            <span>↑ {r.ascent} m</span>
            <span>↓ {r.descent} m</span>
          </div>
          <div className="route-alt-desc">{r.desc}</div>
        </button>
      ))}
    </div>
  )
}
