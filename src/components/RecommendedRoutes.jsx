import { RECOMMENDED_ROUTES } from '../data/recommendedRoutes'

export default function RecommendedRoutes({ activeIds, onToggle }) {
  return (
    <div className="rec-routes-section">
      <div className="layers-title">Percorsi consigliati</div>
      <ul className="routes-list">
        {RECOMMENDED_ROUTES.map(r => (
          <li key={r.id}>
            <label className="route-item-label">
              <input
                type="checkbox"
                checked={activeIds.includes(r.id)}
                onChange={() => onToggle(r.id)}
              />
              <span className="route-color-dot" style={{ background: r.color }} />
              <span className="route-name">{r.name}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
