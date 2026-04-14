import { useState, useEffect } from 'react'
import { ChevronDown, Download } from 'lucide-react'
import { ParkingSession, ParkingZone, Vehicle } from '../types'
import { formatCurrency, formatDuration, formatDateTime } from '../utils/formatters'
import { parkingAPI } from '../services/api'

// Nomi zone demo (usati se API non disponibile)
const ZONE_NAMES: Record<string, string> = {
  z1: 'Duomo - Via Torino',
  z2: 'Brera - Via Solferino',
  z3: 'Navigli - Ripa di Porta Ticinese',
  z4: 'Porta Romana - Corso Lodi',
  z5: 'Stazione Centrale - Via Vittor Pisani',
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<ParkingSession[]>([
    {
      id: '1',
      userId: '',
      vehicleId: 'v1',
      zoneId: 'z1',
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      duration: 120,
      cost: 4.64,
      status: 'completed',
      paymentMethodId: 'pm1',
    },
    {
      id: '2',
      userId: '',
      vehicleId: 'v1',
      zoneId: 'z3',
      startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
      duration: 90,
      cost: 2.72,
      status: 'completed',
      paymentMethodId: 'pm1',
    },
    {
      id: '3',
      userId: '',
      vehicleId: 'v1',
      zoneId: 'z5',
      startTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      duration: 60,
      cost: 1.85,
      status: 'completed',
      paymentMethodId: 'pm1',
    },
  ])

  const [vehicles] = useState<Vehicle[]>([
    {
      id: 'v1',
      userId: '',
      licensePlate: 'MI 123AB',
      alias: 'La mia auto',
      defaultBadge: 'standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ])

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('all')

  // Prova a caricare dati reali
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await parkingAPI.getSessions()
        if (res.data?.length > 0) {
          setSessions(res.data)
        }
      } catch {
        // Fallback ai dati demo
      }
    }
    fetchSessions()
  }, [])

  const getZoneName = (zoneId: string) => ZONE_NAMES[zoneId] || `Zona ${zoneId}`
  const getVehiclePlate = (vehicleId: string) =>
    vehicles.find((v) => v.id === vehicleId)?.licensePlate || 'N/D'

  const getFilteredSessions = () => {
    const now = new Date()
    return sessions.filter((session) => {
      const sessionDate = new Date(session.startTime)
      const diffDays = Math.ceil((now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
      switch (dateFilter) {
        case 'week': return diffDays <= 7
        case 'month': return diffDays <= 30
        case 'year': return diffDays <= 365
        default: return true
      }
    })
  }

  const filteredSessions = getFilteredSessions()
  const totalSpent = filteredSessions.reduce((sum, s) => sum + s.cost, 0)
  const avgPerSession = filteredSessions.length > 0 ? totalSpent / filteredSessions.length : 0

  return (
    <main className="bg-light min-h-screen">
      <div className="container py-6">
        <h1 className="text-3xl font-bold text-dark mb-8">Cronologia Parcheggi</h1>

        {/* Statistiche */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card">
            <p className="text-gray text-xs font-semibold uppercase mb-1">Spesa Totale</p>
            <p className="text-2xl font-bold text-accent">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="card">
            <p className="text-gray text-xs font-semibold uppercase mb-1">Media</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(avgPerSession)}</p>
          </div>
        </div>

        {/* Filtri */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['all', 'week', 'month', 'year'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`chip whitespace-nowrap ${dateFilter === filter ? 'active' : ''}`}
            >
              {filter === 'all' ? 'Tutto'
                : filter === 'week' ? 'Settimana'
                : filter === 'month' ? 'Mese'
                : 'Anno'}
            </button>
          ))}
        </div>

        {/* Lista sessioni */}
        {filteredSessions.length > 0 ? (
          <div className="space-y-3">
            {[...filteredSessions].reverse().map((session) => (
              <div key={session.id} className="card">
                <button
                  onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-dark">{getZoneName(session.zoneId)}</h3>
                    <p className="text-gray text-xs">{formatDateTime(session.startTime)}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-dark">{formatCurrency(session.cost)}</p>
                    <p className="text-gray text-xs">{formatDuration(session.duration)}</p>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-gray ml-2 transition ${expandedId === session.id ? 'rotate-180' : ''}`}
                    style={{ transition: 'transform 0.2s' }}
                  />
                </button>

                {expandedId === session.id && (
                  <div className="mt-4 pt-4 border-t border-light-secondary space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray text-sm">Zona</span>
                      <span className="font-semibold text-dark">{getZoneName(session.zoneId)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray text-sm">Targa</span>
                      <span className="font-semibold text-dark">{getVehiclePlate(session.vehicleId)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray text-sm">Inizio</span>
                      <span className="font-semibold text-dark">{formatDateTime(session.startTime)}</span>
                    </div>
                    {session.endTime && (
                      <div className="flex justify-between">
                        <span className="text-gray text-sm">Fine</span>
                        <span className="font-semibold text-dark">{formatDateTime(session.endTime)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray text-sm">Durata</span>
                      <span className="font-semibold text-dark">{formatDuration(session.duration)}</span>
                    </div>
                    <div className="pt-2 border-t border-light-secondary flex justify-between">
                      <span className="text-gray text-sm font-semibold">Importo totale</span>
                      <span className="font-bold text-accent">{formatCurrency(session.cost)}</span>
                    </div>
                    <button className="w-full btn btn-secondary gap-2 mt-4">
                      <Download size={18} />
                      Scarica Ricevuta
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="text-gray-light mb-3 text-4xl">📍</div>
            <h3 className="text-lg font-semibold text-dark mb-2">Nessun parcheggio</h3>
            <p className="text-gray text-sm">Non hai ancora parcheggiato con questo filtro attivo</p>
          </div>
        )}
      </div>
    </main>
  )
}
