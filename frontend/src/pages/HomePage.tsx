import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Navigation } from 'lucide-react'
import Map from '../components/Map'
import ParkingCard from '../components/ParkingCard'
import ActiveSession from '../components/ActiveSession'
import { ParkingZone, Vehicle, ParkingSession } from '../types'
import { parkingAPI } from '../services/api'

// Dati demo per Milano (usati come fallback se API non disponibile)
const DEMO_ZONES: ParkingZone[] = [
  {
    id: 'z1',
    name: 'Duomo - Via Torino',
    city: 'Milano',
    coordinates: { latitude: 45.4641, longitude: 9.1862 },
    hourlyRate: 2.00,
    maxDuration: 2,
    operatingHours: { start: '08:00', end: '19:00' },
    dayOfWeek: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 'z2',
    name: 'Brera - Via Solferino',
    city: 'Milano',
    coordinates: { latitude: 45.4735, longitude: 9.1870 },
    hourlyRate: 1.50,
    maxDuration: 3,
    operatingHours: { start: '08:00', end: '19:00' },
    dayOfWeek: [1, 2, 3, 4, 5, 6],
  },
  {
    id: 'z3',
    name: 'Navigli - Ripa di Porta Ticinese',
    city: 'Milano',
    coordinates: { latitude: 45.4500, longitude: 9.1790 },
    hourlyRate: 1.20,
    maxDuration: 4,
    operatingHours: { start: '08:00', end: '19:00' },
    dayOfWeek: [1, 2, 3, 4, 5],
  },
  {
    id: 'z4',
    name: 'Porta Romana - Corso Lodi',
    city: 'Milano',
    coordinates: { latitude: 45.4490, longitude: 9.2050 },
    hourlyRate: 1.20,
    maxDuration: 0,
    operatingHours: { start: '08:00', end: '19:00' },
    dayOfWeek: [1, 2, 3, 4, 5],
  },
  {
    id: 'z5',
    name: 'Stazione Centrale - Via Vittor Pisani',
    city: 'Milano',
    coordinates: { latitude: 45.4854, longitude: 9.2020 },
    hourlyRate: 1.50,
    maxDuration: 2,
    operatingHours: { start: '07:00', end: '21:00' },
    dayOfWeek: [1, 2, 3, 4, 5, 6, 7],
  },
]

const DEMO_VEHICLES: Vehicle[] = [
  {
    id: 'v1',
    userId: '',
    licensePlate: 'MI 123AB',
    alias: 'La mia auto',
    defaultBadge: 'standard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export default function HomePage() {
  const [zones, setZones] = useState<ParkingZone[]>(DEMO_ZONES)
  const [vehicles, setVehicles] = useState<Vehicle[]>(DEMO_VEHICLES)
  const [selectedZone, setSelectedZone] = useState<ParkingZone | null>(null)
  const [activeSession, setActiveSession] = useState<ParkingSession | null>(null)
  const [showCard, setShowCard] = useState(false)
  const [loading, setLoading] = useState(false)

  // Carica dati dal backend (con fallback ai dati demo)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [zonesRes, vehiclesRes] = await Promise.allSettled([
          parkingAPI.getZones(45.4642, 9.1900, 5000),
          parkingAPI.getVehicles(),
        ])
        if (zonesRes.status === 'fulfilled' && zonesRes.value.data?.length > 0) {
          setZones(zonesRes.value.data)
        }
        if (vehiclesRes.status === 'fulfilled' && vehiclesRes.value.data?.length > 0) {
          setVehicles(vehiclesRes.value.data)
        }
      } catch {
        // Fallback ai dati demo — l'app resta funzionale
      }
    }
    fetchData()
  }, [])

  // Controlla sessione attiva
  useEffect(() => {
    const saved = localStorage.getItem('parkfree_active_session')
    if (saved) {
      try {
        const session: ParkingSession = JSON.parse(saved)
        // Verifica che la sessione non sia scaduta
        if (session.endTime && new Date(session.endTime) > new Date()) {
          setActiveSession(session)
        } else {
          localStorage.removeItem('parkfree_active_session')
        }
      } catch {
        localStorage.removeItem('parkfree_active_session')
      }
    }
  }, [])

  const handleZoneSelect = useCallback((zone: ParkingZone) => {
    setSelectedZone(zone)
    setShowCard(true)
  }, [])

  const handlePark = async (vehicleId: string, duration: number) => {
    if (!selectedZone || loading) return
    setLoading(true)

    try {
      const now = new Date()
      const endTime = new Date(now.getTime() + duration * 60000)
      const parkingCost = (selectedZone.hourlyRate * Math.ceil(duration / 60))
      const serviceFee = Math.max(0.39, Math.min((parkingCost * 0.15) + 0.20, 2.50))
      const serviceFeeRounded = Math.round(serviceFee * 100) / 100

      // Prova a creare la sessione via API
      let sessionId = Date.now().toString()
      try {
        const res = await parkingAPI.createSession({
          vehicleId,
          zoneId: selectedZone.id,
          durationMinutes: duration,
        })
        if (res.data?.id) sessionId = res.data.id
      } catch {
        // Fallback: sessione locale
      }

      const newSession: ParkingSession = {
        id: sessionId,
        userId: '',
        vehicleId,
        zoneId: selectedZone.id,
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        cost: Math.round((parkingCost + serviceFeeRounded) * 100) / 100,
        status: 'active',
        paymentMethodId: 'wallet',
      }

      setActiveSession(newSession)
      localStorage.setItem('parkfree_active_session', JSON.stringify(newSession))
      setShowCard(false)
    } finally {
      setLoading(false)
    }
  }

  const handleExtendSession = async () => {
    if (!activeSession) return
    // Estendi di 30 minuti
    const currentEnd = new Date(activeSession.endTime || new Date())
    const newEnd = new Date(currentEnd.getTime() + 30 * 60000)
    const updated = {
      ...activeSession,
      endTime: newEnd.toISOString(),
      duration: activeSession.duration + 30,
    }
    setActiveSession(updated)
    localStorage.setItem('parkfree_active_session', JSON.stringify(updated))

    try {
      await parkingAPI.extendSession(activeSession.id, { additionalMinutes: 30 })
    } catch {
      // Sessione estesa localmente
    }
  }

  const handleEndSession = async () => {
    if (!activeSession) return
    setActiveSession(null)
    localStorage.removeItem('parkfree_active_session')

    try {
      await parkingAPI.endSession(activeSession.id)
    } catch {
      // Sessione terminata localmente
    }
  }

  const activeSessionZone = activeSession
    ? zones.find((z) => z.id === activeSession.zoneId) || null
    : null

  const activeVehiclePlate = activeSession
    ? vehicles.find((v) => v.id === activeSession.vehicleId)?.licensePlate || ''
    : ''

  return (
    <div className="relative w-full h-full">
      {/* Mappa */}
      <Map
        zones={zones}
        onZoneSelect={handleZoneSelect}
        center={[9.1900, 45.4642]}
        zoom={13}
      />

      {/* Banner: nessuna zona */}
      {zones.length === 0 && (
        <div className="absolute top-4 left-4 right-4 bg-warning bg-opacity-20 border border-warning rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-warning flex-shrink-0" />
          <p className="text-warning text-sm">Nessuna zona di parcheggio disponibile in questa area</p>
        </div>
      )}

      {/* Quick-locate button */}
      {!showCard && !activeSession && (
        <button
          className="absolute bottom-24 right-4 btn btn-primary rounded-full p-4"
          style={{ boxShadow: '0 4px 20px rgba(46, 134, 193, 0.4)' }}
          title="Centra sulla mia posizione"
        >
          <Navigation size={24} />
        </button>
      )}

      {/* Card parcheggio */}
      {showCard && selectedZone && (
        <ParkingCard
          zone={selectedZone}
          vehicles={vehicles}
          onClose={() => setShowCard(false)}
          onPark={handlePark}
        />
      )}

      {/* Sessione attiva */}
      {activeSession && activeSessionZone && (
        <ActiveSession
          session={activeSession}
          zone={activeSessionZone}
          vehiclePlate={activeVehiclePlate}
          onExtend={handleExtendSession}
          onEnd={handleEndSession}
        />
      )}
    </div>
  )
}
