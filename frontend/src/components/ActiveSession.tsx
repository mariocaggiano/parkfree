import { useEffect, useState } from 'react'
import { X, Plus, Square } from 'lucide-react'
import { ParkingSession, ParkingZone } from '../types'
import { formatCurrency } from '../utils/formatters'
import SessionTimer from './SessionTimer'

interface ActiveSessionProps {
  session: ParkingSession
  zone: ParkingZone | null
  vehiclePlate?: string
  onExtend: () => void
  onEnd: () => void
}

export default function ActiveSession({
  session,
  zone,
  vehiclePlate = '',
  onExtend,
  onEnd,
}: ActiveSessionProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [costSoFar, setCostSoFar] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const endTime = new Date(session.endTime || new Date())
      const remaining = Math.max(0, endTime.getTime() - now.getTime())
      setRemainingSeconds(Math.floor(remaining / 1000))

      // Calculate cost so far based on actual elapsed time
      if (zone) {
        const startTime = new Date(session.startTime)
        const elapsedMs = Math.max(0, now.getTime() - startTime.getTime())
        const elapsedMinutes = elapsedMs / 60000
        const costSoFar = (zone.hourlyRate * elapsedMinutes) / 60
        setCostSoFar(costSoFar)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [session, zone])

  const totalSeconds = session.duration * 60

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button
          onClick={onEnd}
          className="modal-close"
          title="Chiudi"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-accent rounded-full p-3 mb-4">
            <div className="session-active-indicator"></div>
          </div>
          <h1 className="text-3xl font-bold text-dark mb-2">
            {zone?.name || 'Parcheggio attivo'}
          </h1>
          <p className="text-gray text-sm">Targa: {vehiclePlate || 'N/D'}</p>
        </div>

        {/* Timer */}
        <SessionTimer
          remainingSeconds={remainingSeconds}
          totalSeconds={totalSeconds}
        />

        {/* Cost Display */}
        <div className="bg-light rounded-xl p-6 mb-6 text-center">
          <p className="text-gray text-sm mb-2">Importo stimato</p>
          <div className="price-display justify-center">
            <span className="price-value">{formatCurrency(costSoFar)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onExtend}
            className="btn btn-primary flex-1 gap-2"
          >
            <Plus size={20} />
            Prolunga
          </button>
          <button
            onClick={onEnd}
            className="btn btn-outline flex-1 gap-2"
          >
            <Square size={20} />
            Termina
          </button>
        </div>

        {/* Info Footer */}
        <div className="mt-6 pt-6 border-t border-light-secondary">
          <p className="text-xs text-gray text-center">
            L'importo finale sarà calcolato al termine della sessione
          </p>
        </div>
      </div>
    </div>
  )
}
