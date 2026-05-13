import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, GeoJSON, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { classifyRouteSegments } from '../utils/classifyRoute'
import { RECOMMENDED_ROUTES } from '../data/recommendedRoutes'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const markerIcon = (label, color) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:${color};border:3px solid white;
      transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);color:white;font-weight:bold;font-size:13px;display:block;text-align:center;line-height:26px;">${label}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  })

const greenIcon = markerIcon('A', '#22c55e')
const redIcon = markerIcon('B', '#ef4444')

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) })
  return null
}

function FitBounds({ route }) {
  const map = useMap()
  useEffect(() => {
    if (!route) return
    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
    if (coords.length > 0) map.fitBounds(coords, { padding: [50, 50] })
  }, [route, map])
  return null
}

function InfraLayer({ data }) {
  const rev = useRef(0)
  useEffect(() => { rev.current++ }, [data])
  if (!data) return null
  return <GeoJSON key={rev.current} data={data} style={{ color: '#38bdf8', weight: 3, opacity: 0.85 }} />
}

function NamedRouteLayer({ route }) {
  return (
    <GeoJSON
      key={route.id}
      data={route.geojson}
      style={{ color: route.color, weight: 4, opacity: 0.9 }}
      onEachFeature={(_, layer) => route.name && layer.bindTooltip(route.name, { sticky: true })}
    />
  )
}

export default function Map({
  start, end, route,
  cyclingInfra, showCyclingInfra,
  namedRoutes, activeRouteIds,
  activeRecIds,
  onMapClick,
}) {
  // Classify route segments: green = cycling infra, dashed yellow = road connection
  const segments = useMemo(() => {
    if (!route) return []
    const coords = route.geometry.coordinates // [lon, lat]
    const classified = classifyRouteSegments(coords, cyclingInfra)

    if (!classified) {
      // No infra data yet — render as plain blue
      return [{ isCycling: null, coords: coords.map(([lon, lat]) => [lat, lon]) }]
    }
    return classified.map(s => ({
      ...s,
      coords: s.coords.map(([lon, lat]) => [lat, lon]), // convert to [lat, lon] for Leaflet
    }))
  }, [route, cyclingInfra])

  return (
    <MapContainer center={[43.8777, 11.1022]} zoom={14} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onMapClick={onMapClick} />
      <FitBounds route={route} />

      {showCyclingInfra && <InfraLayer data={cyclingInfra} />}

      {namedRoutes
        .filter(r => activeRouteIds.includes(r.id))
        .map(r => <NamedRouteLayer key={r.id} route={r} />)
      }

      {RECOMMENDED_ROUTES.filter(r => activeRecIds.includes(r.id)).map(r =>
        r.segments.map((seg, i) => (
          <Polyline
            key={`${r.id}-${i}`}
            positions={seg.map(([lon, lat]) => [lat, lon])}
            pathOptions={{ color: r.color, weight: 4, opacity: 0.9 }}
          />
        ))
      )}

      {start && <Marker position={start} icon={greenIcon} />}
      {end && <Marker position={end} icon={redIcon} />}

      {segments.map((seg, i) => {
        if (seg.isCycling === null) {
          return <Polyline key={i} positions={seg.coords} color="#3b82f6" weight={5} opacity={0.85} />
        }
        if (seg.isCycling) {
          return <Polyline key={i} positions={seg.coords} color="#22c55e" weight={5} opacity={0.95} />
        }
        return (
          <Polyline
            key={i}
            positions={seg.coords}
            pathOptions={{ color: '#eab308', weight: 4, opacity: 0.9, dashArray: '10 7' }}
          />
        )
      })}
    </MapContainer>
  )
}
