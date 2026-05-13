export default function IntercityRoutes({ routes, activeIds, onToggle, loading, onLoad }) {
  return (
    <div className="rec-routes-section">
      <div className="named-routes-header">
        <span className="layers-title">Verso Pistoia e Firenze</span>
        {routes.length === 0 && !loading && (
          <button className="load-routes-btn" onClick={onLoad}>Carica</button>
        )}
        {loading && <span className="layer-spinner" />}
      </div>

      {routes.length > 0 && (
        <ul className="routes-list" style={{ marginTop: 8 }}>
          {routes.map(r => (
            <li key={r.id}>
              <label className="route-item-label">
                <input
                  type="checkbox"
                  checked={activeIds.includes(r.id)}
                  onChange={() => onToggle(r.id)}
                />
                <span className="route-color-dot" style={{ background: r.color }} />
                <span className="route-name">{r.name}</span>
                {r.ref && <span className="route-dist-badge">{r.ref}</span>}
              </label>
            </li>
          ))}
        </ul>
      )}

      {routes.length === 0 && !loading && (
        <p style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
          Percorsi OSM verso Pistoia e Firenze
        </p>
      )}
    </div>
  )
}
