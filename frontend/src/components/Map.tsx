import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
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

function LocateControl() {
  const map = useMap()
  useEffect(() => {
    map.locate({ setView: true, maxZoom: 15 })
  }, [map])
  return null
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
            click: () => {
              if (onZoneSelect) onZoneSelect(zone)
            },
          }}
        >
          <Popup>
            <div className="text-sm min-w-[180px]">
              <h3 className="font-bold text-base mb-1">{zone.name}</h3>
              <p className="text-xs text-gray-600 mb-2">{zone.city}</p>
              <div className="flex justify-between gap-3 mb-2">
                <span>Tariffa: {zone.hourlyRate}€/h</span>
                <span>Max: {zone.maxDuration}h</span>
              </div>
              <p className="text-xs text-gray-500">
                {zone.operatingHours.start} - {zone.operatingHours.end}
              </p>
              <button
                onClick={() => onZoneSelect && onZoneSelect(zone)}
                style={{
                  marginTop: '8px',
                  width: '100%',
                  padding: '6px 12px',
                  backgroundColor: '#2E86C1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Parcheggia qui
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
