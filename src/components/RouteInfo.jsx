export default function RouteInfo({ route }) {
  if (!route) return null

  const distanceKm = (route.distance / 1000).toFixed(1)
  const timeMin = route.duration
    ? Math.round(route.duration / 60)
    : Math.round(route.distance / 1000 / 15 * 60)
  const steps = route.legs?.[0]?.steps?.filter(s => s.name) || []

  const maneuverIcon = (type) => {
    const icons = {
      'turn': '↪', 'new name': '→', 'depart': '🚲', 'arrive': '🏁',
      'merge': '⤵', 'roundabout': '↻', 'rotary': '↻',
      'fork': '⑂', 'end of road': '⤴',
    }
    return icons[type] || '→'
  }

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

      {steps.length > 0 && (
        <div className="route-steps">
          <h3 className="steps-title">Istruzioni</h3>
          <ol className="steps-list">
            {steps.slice(0, 8).map((step, i) => (
              <li key={i} className="step-item">
                <span className="step-icon">{maneuverIcon(step.maneuver?.type)}</span>
                <span className="step-text">
                  {step.maneuver?.modifier
                    ? `Svolta ${step.maneuver.modifier === 'left' ? 'a sinistra' : step.maneuver.modifier === 'right' ? 'a destra' : step.maneuver.modifier}`
                    : 'Continua'
                  }
                  {step.name && step.name !== '' ? ` su ${step.name}` : ''}
                </span>
                {step.distance > 0 && (
                  <span className="step-dist">
                    {step.distance >= 1000
                      ? `${(step.distance / 1000).toFixed(1)} km`
                      : `${Math.round(step.distance)} m`}
                  </span>
                )}
              </li>
            ))}
            {steps.length > 8 && (
              <li className="step-item step-more">…e altri {steps.length - 8} passaggi</li>
            )}
          </ol>
        </div>
      )}
    </div>
  )
}
