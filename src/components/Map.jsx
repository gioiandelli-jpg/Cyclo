import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

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

export default function Map({ start, end, route, showCyclingLayer, onMapClick }) {
  const routeCoords = route
    ? route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
    : []

  return (
    <MapContainer
      center={[43.8777, 11.1022]}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {showCyclingLayer && (
        <TileLayer
          url="https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png"
          opacity={0.7}
          attribution='Cycling routes &copy; <a href="https://cycling.waymarkedtrails.org">Waymarked Trails</a>'
        />
      )}
      <ClickHandler onMapClick={onMapClick} />
      <FitBounds route={route} />
      {start && <Marker position={start} icon={greenIcon} />}
      {end && <Marker position={end} icon={redIcon} />}
      {routeCoords.length > 0 && (
        <Polyline positions={routeCoords} color="#3b82f6" weight={5} opacity={0.85} />
      )}
    </MapContainer>
  )
}
