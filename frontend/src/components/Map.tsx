import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { ParkingZone } from '../types'

// Token loaded from .env file (VITE_MAPBOX_TOKEN)
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

interface MapProps {
  onZoneSelect?: (zone: ParkingZone) => void
  zones?: ParkingZone[]
  center?: [number, number]
  zoom?: number
}

export default function Map({
  onZoneSelect,
  zones = [],
  center = [9.1900, 45.4642], // Milan coordinates
  zoom = 12,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Effect 1: initialize map (only when center/zoom change)
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: zoom,
    })

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      })
    )
    map.current.addControl(new mapboxgl.NavigationControl())

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [center, zoom])

  // Effect 2: add/update zones whenever they change or the map becomes ready
  useEffect(() => {
    if (mapLoaded) {
      addZonesToMap(zones)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, mapLoaded])

  const addZonesToMap = (parkingZones: ParkingZone[]) => {
    if (!map.current || !mapLoaded) return

    parkingZones.forEach((zone) => {
      // Add marker for zone center
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="font-size:14px;line-height:1.4">
          <h3 style="font-weight:700;font-size:16px;margin-bottom:4px">${zone.name}</h3>
          <p style="font-size:12px;color:#6C757D;margin-bottom:8px">${zone.city}</p>
          <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px">
            <span>Tariffa: ${zone.hourlyRate}€/h</span>
            <span>Max: ${zone.maxDuration > 0 ? zone.maxDuration + 'h' : 'Illimitata'}</span>
          </div>
          <p style="font-size:12px;color:#ADADAD">
            ${zone.operatingHours.start} - ${zone.operatingHours.end}
          </p>
        </div>
      `)

      new mapboxgl.Marker({ color: '#2E86C1' })
        .setLngLat([zone.coordinates.longitude, zone.coordinates.latitude])
        .setPopup(popup)
        .addTo(map.current!)
        .getElement()
        .addEventListener('click', () => {
          if (onZoneSelect) {
            onZoneSelect(zone)
          }
        })

      // If zone has polygon, draw it
      if (zone.polygon && zone.polygon.length > 0) {
        const sourceId = `zone-${zone.id}`
        const layerId = `zone-layer-${zone.id}`

        if (!map.current!.getSource(sourceId)) {
          map.current!.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [zone.polygon],
              },
              properties: {},
            },
          })

          map.current!.addLayer({
            id: layerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': '#2E86C1',
              'fill-opacity': 0.3,
            },
          })

          map.current!.addLayer({
            id: `${layerId}-stroke`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#2E86C1',
              'line-width': 2,
            },
          })

          // Add click listener to polygon
          map.current!.on('click', layerId, () => {
            if (onZoneSelect) {
              onZoneSelect(zone)
            }
          })

          map.current!.on('mouseenter', layerId, () => {
            map.current!.getCanvas().style.cursor = 'pointer'
          })

          map.current!.on('mouseleave', layerId, () => {
            map.current!.getCanvas().style.cursor = ''
          })
        }
      }
    })
  }

  if (!MAPBOX_TOKEN) {
    return (
      <div className="map-container flex items-center justify-center bg-light">
        <div className="text-center p-8">
          <p className="text-lg font-semibold text-dark mb-2">Mappa non disponibile</p>
          <p className="text-sm text-gray">
            Configura VITE_MAPBOX_TOKEN nel file .env per abilitare la mappa
          </p>
        </div>
      </div>
    )
  }

  return <div ref={mapContainer} className="map-container" />
}
