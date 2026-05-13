export default function RouteInfo({ route }) {
  if (!route) return null

  const distanceKm = (route.distance / 1000).toFixed(1)
  const timeMin = route.duration
    ? Math.round(route.duration / 60)
    : Math.round(route.distance / 1000 / 15 * 60)

  return (
    <div className="route-info">
      <div className="route-stats">
        <div className="stat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18"/><circle cx="7" cy="12" r="1"/><circle cx="17" cy="12" r="1"/>
          </svg>
          <span className="stat-value">{distanceKm} km</span>
          <span className="stat-label">Distanza</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <span className="stat-value">~{timeMin} min</span>
          <span className="stat-label">Tempo stimato</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/>
            <circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h3.5"/>
          </svg>
          <span className="stat-value" style={{fontSize:'12px',color:'#22c55e'}}>piste ciclabili</span>
          <span className="stat-label">Preferenza percorso</span>
        </div>
      </div>
    </div>
  )
}
