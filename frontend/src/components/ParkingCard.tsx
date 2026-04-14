import { useState } from 'react'
import { ChevronDown, Zap } from 'lucide-react'
import { ParkingZone, Vehicle } from '../types'
import { formatCurrency, formatDuration } from '../utils/formatters'

interface ParkingCardProps {
  zone: ParkingZone | null
  vehicles: Vehicle[]
  onClose: () => void
  onPark: (vehicleId: string, duration: number) => void
}

// Preset durate per parcheggio veloce (in minuti)
const DURATION_PRESETS = [
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: 'Max', value: 0 },
]

export default function ParkingCard({
  zone,
  vehicles,
  onClose,
  onPark,
}: ParkingCardProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<string>(vehicles[0]?.id || '')
  const [duration, setDuration] = useState(60)
  const [isLoading, setIsLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  if (!zone) return null

  const maxMinutes = zone.maxDuration > 0 ? zone.maxDuration * 60 : 480
  const parkingCost = zone.hourlyRate * Math.ceil(duration / 60)
  const serviceFee = Math.round(Math.max(0.39, Math.min((parkingCost * 0.15) + 0.20, 2.50)) * 100) / 100
  const total = Math.round((parkingCost + serviceFee) * 100) / 100

  const handlePreset = (minutes: number) => {
    if (minutes === 0) {
      setDuration(maxMinutes)
    } else {
      setDuration(Math.min(minutes, maxMinutes))
    }
  }

  const handlePark = async () => {
    if (!selectedVehicle) return
    setIsLoading(true)
    try {
      await onPark(selectedVehicle, duration)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="slide-up-card">
      <div className="slide-up-handle"></div>

      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 hover:bg-light rounded-lg transition"
      >
        <ChevronDown size={24} />
      </button>

      {/* Info zona */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-dark mb-1">{zone.name}</h2>
        <p className="text-gray text-sm">
          {zone.hourlyRate}€/h &middot; {zone.operatingHours.start}-{zone.operatingHours.end}
          {zone.maxDuration > 0 ? ` \u00B7 Max ${zone.maxDuration}h` : ' \u00B7 Illimitata'}
        </p>
      </div>

      {/* Veicolo (compatto se c'è solo un veicolo) */}
      {vehicles.length > 1 ? (
        <div className="form-group mb-4">
          <label className="form-label">Veicolo</label>
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="form-select"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.licensePlate} {v.alias ? `(${v.alias})` : ''}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-4 bg-light rounded-lg p-3">
          <span className="text-sm text-gray">Veicolo:</span>
          <span className="font-bold text-dark">
            {vehicles[0]?.licensePlate} {vehicles[0]?.alias ? `(${vehicles[0].alias})` : ''}
          </span>
        </div>
      )}

      {/* Preset durata — parcheggio veloce! */}
      <div className="mb-4">
        <label className="form-label">Durata</label>
        <div className="grid grid-cols-4 gap-2 mb-3" role="group">
          {DURATION_PRESETS.map((preset) => {
            const presetValue = preset.value === 0 ? maxMinutes : Math.min(preset.value, maxMinutes)
            const isActive = duration === presetValue
            return (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset.value)}
                className={`p-3 rounded-lg font-bold text-center transition ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-light text-dark hover:bg-light-secondary'
                }`}
              >
                {preset.value === 0 ? `${Math.floor(maxMinutes / 60)}h` : preset.label}
              </button>
            )
          })}
        </div>

        {/* Slider per personalizzare */}
        <input
          type="range"
          min="15"
          max={maxMinutes}
          step="15"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full h-2 bg-light-secondary rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${(duration / maxMinutes) * 100}%, var(--color-light-secondary) ${(duration / maxMinutes) * 100}%, var(--color-light-secondary) 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray mt-1">
          <span>15 min</span>
          <span className="font-semibold text-primary">{formatDuration(duration)}</span>
          <span>{formatDuration(maxMinutes)}</span>
        </div>
      </div>

      {/* Riepilogo costo (compatto, espandibile) */}
      <div className="mb-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between bg-light rounded-lg p-4"
        >
          <span className="text-lg font-bold text-dark">Totale</span>
          <span className="text-2xl font-bold text-accent">{formatCurrency(total)}</span>
        </button>

        {showDetails && (
          <div className="bg-light rounded-lg p-4 mt-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray">Parcheggio ({formatDuration(duration)})</span>
              <span className="text-dark">{formatCurrency(parkingCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray">Commissione servizio</span>
              <span className="text-dark">{formatCurrency(serviceFee)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Pulsante PARCHEGGIA - grande e visibile */}
      <button
        onClick={handlePark}
        disabled={isLoading || !selectedVehicle}
        className="btn btn-accent w-full gap-2"
        style={{ padding: '1rem', fontSize: '1.1rem' }}
      >
        {isLoading ? (
          <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
        ) : (
          <>
            <Zap size={22} />
            Parcheggia qui
          </>
        )}
      </button>
    </div>
  )
}
