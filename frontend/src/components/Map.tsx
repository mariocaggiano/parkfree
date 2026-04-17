import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ParkingZone } from '../types'

// Fix default marker icons for bundlers (Vite/Webpack strip the asset URLs)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const parkingIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface MapProps {
  onZoneSelect?: (zone: ParkingZone) => void
  zones?: ParkingZone[]
  center?: [number, number]
  zoom?: number
}

export default function Map({
  onZoneSelect,
  zones = [],
  center = [41.9028, 12.4964],
  zoom = 13,
}: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%' }}
      className="map-container"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {zones.map((zone) => (
        <Marker
          key={zone.id}
          position={[zone.coordinates.latitude, zone.coordinates.longitude]}
          icon={parkingIcon}
          eventHandlers={{
            click: () => onZoneSelect && onZoneSelect(zone),
          }}
        >
          <Popup>
            <div className="popup-content">
              <strong>{zone.name}</strong>
              <p>{zone.hourlyRate}€/ora</p>
              <p>Max {zone.maxDuration}h</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
