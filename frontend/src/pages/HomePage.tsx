import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Navigation } from 'lucide-react'
import Map from '../components/Map'
import ParkingCard from '../components/ParkingCard'
import ActiveSession from '../components/ActiveSession'
import { ParkingZone, Vehicle, ParkingSession } from '../types'
import { vehiclesService, sessionsService } from '../services/firestore'
import { useAuth } from '../hooks/useAuth'

const DEMO_ZONES: ParkingZone[] = [
  { id: 'z1', name: 'Duomo - Via Torino', city: 'Milano', coordinates: { latitude: 45.4641, longitude: 9.1862 }, hourlyRate: 2.0, maxDuration: 2, operatingHours: { start: '08:00', end: '19:00' }, dayOfWeek: [1, 2, 3, 4, 5, 6] },
  { id: 'z2', name: 'Brera - Via Solferino', city: 'Milano', coordinates: { latitude: 45.4735, longitude: 9.187 }, hourlyRate: 1.5, maxDuration: 3, operatingHours: { start: '08:00', end: '19:00' }, dayOfWeek: [1, 2, 3, 4, 5, 6] },
  { id: 'z3', name: 'Navigli - Ripa di Porta Ticinese', city: 'Milano', coordinates: { latitude: 45.45, longitude: 9.179 }, hourlyRate: 1.2, maxDuration: 4, operatingHours: { start: '08:00', end: '19:00' }, dayOfWeek: [1, 2, 3, 4, 5] },
  { id: 'z4', name: 'Porta Romana - Corso Lodi', city: 'Milano', coordinates: { latitude: 45.449, longitude: 9.205 }, hourlyRate: 1.2, maxDuration: 0, operatingHours: { start: '08:00', end: '19:00' }, dayOfWeek: [1, 2, 3, 4, 5] },
  { id: 'z5', name: 'Stazione Centrale - Via Vittor Pisani', city: 'Milano', coordinates: { latitude: 45.4854, longitude: 9.202 }, hourlyRate: 1.5, maxDuration: 2, operatingHours: { start: '07:00', end: '21:00' }, dayOfWeek: [1, 2, 3, 4, 5, 6, 7] },
]

export default function HomePage() {
  const { user } = useAuth()
  const [zones] = useState<ParkingZone[]>(DEMO_ZONES)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedZone, setSelectedZone] = useState<ParkingZone | null>(null)
  const [activeSession, setActiveSession] = useState<ParkingSession | null>(null)
  const [showCard, setShowCard] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    vehiclesService.getAll().then(setVehicles).catch(console.error)
    sessionsService.getActive().then(setActiveSession).catch(console.error)
  }, [user])

  useEffect(() => {
    if (!user) return
    const unsubscribe = sessionsService.onActiveSession(user.uid, setActiveSession)
    return unsubscribe
  }, [user])

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
      const parkingCost = selectedZone.hourlyRate * Math.ceil(duration / 60)
      const serviceFee = Math.round(Math.max(0.39, Math.min(parkingCost * 0.15 + 0.2, 2.5)) * 100) / 100
      const totalCost = Math.round((parkingCost + serviceFee) * 100) / 100
      const newSession = await sessionsService.create({
        vehicleId,
        zoneId: selectedZone.id,
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        duration,
        cost: totalCost,
        status: 'active',
        paymentMethodId: 'wallet',
      })
      setActiveSession(newSession)
      setShowCard(false)
    } catch (err) {
      console.error(err)
      alert("Errore durante l'avvio del parcheggio")
    } finally {
      setLoading(false)
    }
  }

  const handleExtendSession = async () => {
    if (!activeSession) return
    const currentEnd = new Date(activeSession.endTime || new Date())
    const newEnd = new Date(currentEnd.getTime() + 30 * 60000)
    const updated: ParkingSession = { ...activeSession, endTime: newEnd.toISOString(), duration: activeSession.duration + 30 }
    try {
      await sessionsService.update(activeSession.id, { endTime: newEnd.toISOString(), duration: updated.duration })
      setActiveSession(updated)
    } catch (err) {
      console.error(err)
    }
  }

  const handleEndSession = async () => {
    if (!activeSession) return
    try {
      await sessionsService.end(activeSession.id, new Date().toISOString(), activeSession.cost)
      setActiveSession(null)
    } catch (err) {
      console.error(err)
    }
  }

  const activeSessionZone = activeSession ? zones.find((z) => z.id === activeSession.zoneId) || null : null
  const activeVehiclePlate = activeSession ? vehicles.find((v) => v.id === activeSession.vehicleId)?.licensePlate || '' : ''

  return (
    <div className="relative w-full h-full">
      <Map zones={zones} onZoneSelect={handleZoneSelect} center={[9.19, 45.4642]} zoom={13} />
      {zones.length === 0 && (
        <div className="absolute top-4 left-4 right-4 bg-warning bg-opacity-20 border border-warning rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-warning flex-shrink-0" />
          <p className="text-warning text-sm">Nessuna zona di parcheggio disponibile in questa area</p>
        </div>
      )}
      {!showCard && !activeSession && (
        <button className="absolute bottom-24 right-4 btn btn-primary rounded-full p-4" style={{ boxShadow: '0 4px 20px rgba(46, 134, 193, 0.4)' }} title="Centra sulla mia posizione">
          <Navigation size={24} />
        </button>
      )}
      {showCard && selectedZone && (
        <ParkingCard zone={selectedZone} vehicles={vehicles} onClose={() => setShowCard(false)} onPark={handlePark} />
      )}
      {activeSession && activeSessionZone && (
        <ActiveSession session={activeSession} zone={activeSessionZone} vehiclePlate={activeVehiclePlate} onExtend={handleExtendSession} onEnd={handleEndSession} />
      )}
    </div>
  )
}
