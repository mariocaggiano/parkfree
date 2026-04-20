import { useState, useEffect } from 'react'
import { ChevronDown, Download, Loader } from 'lucide-react'
import { ParkingSession } from '../types'
import { formatCurrency, formatDuration, formatDateTime } from '../utils/formatters'
import { sessionsService } from '../services/firestore'
import { useAuth } from '../hooks/useAuth'

const ZONE_NAMES: Record<string, string> = {
  z1: 'Duomo - Via Torino', z2: 'Brera - Via Solferino',
  z3: 'Navigli - Ripa di Porta Ticinese', z4: 'Porta Romana - Corso Lodi',
  z5: 'Stazione Centrale - Via Vittor Pisani',
}

export default function HistoryPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ParkingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('all')

  useEffect(() => {
    if (!user) return
    setLoading(true)
    sessionsService.getCompleted(100).then(setSessions).catch(console.error).finally(() => setLoading(false))
  }, [user])

  const getZoneName = (zoneId: string) => ZONE_NAMES[zoneId] || `Zona ${zoneId}`

  const getFilteredSessions = () => {
    const now = new Date()
    return sessions.filter((s) => {
      const diffDays = Math.ceil((now.getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60 * 24))
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

  if (loading) return (
    <main className="bg-light min-h-screen flex items-center justify-center">
      <Loader size={32} className="animate-spin text-primary" />
    </main>
  )

  return (
    <main className="bg-light min-h-screen">
      <div className="container py-6">
        <h1 className="text-3xl font-bold text-dark mb-8">Cronologia Parcheggi</h1>
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
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['all', 'week', 'month', 'year'] as const).map((filter) => (
            <button key={filter} onClick={() => setDateFilter(filter)} className={`chip whitespace-nowrap ${dateFilter === filter ? 'active' : ''}`}>
              {filter === 'all' ? 'Tutto' : filter === 'week' ? 'Settimana' : filter === 'month' ? 'Mese' : 'Anno'}
            </button>
          ))}
        </div>
        {filteredSessions.length > 0 ? (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <div key={session.id} className="card">
                <button onClick={() => setExpandedId(expandedId === session.id ? null : session.id)} className="w-full flex items-center justify-between">
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-dark">{getZoneName(session.zoneId)}</h3>
                    <p className="text-gray text-xs">{formatDateTime(session.startTime)}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-dark">{formatCurrency(session.cost)}</p>
                    <p className="text-gray text-xs">{formatDuration(session.duration)}</p>
                  </div>
                  <ChevronDown size={20} className={`text-gray ml-2 ${expandedId === session.id ? 'rotate-180' : ''}`} style={{ transition: 'transform 0.2s' }} />
                </button>
                {expandedId === session.id && (
                  <div className="mt-4 pt-4 border-t border-light-secondary space-y-3">
                    <div className="flex justify-between"><span className="text-gray text-sm">Zona</span><span className="font-semibold text-dark">{getZoneName(session.zoneId)}</span></div>
                    <div className="flex justify-between"><span className="text-gray text-sm">Inizio</span><span className="font-semibold text-dark">{formatDateTime(session.startTime)}</span></div>
                    {session.endTime && <div className="flex justify-between"><span className="text-gray text-sm">Fine</span><span className="font-semibold text-dark">{formatDateTime(session.endTime)}</span></div>}
                    <div className="flex justify-between"><span className="text-gray text-sm">Durata</span><span className="font-semibold text-dark">{formatDuration(session.duration)}</span></div>
                    <div className="pt-2 border-t border-light-secondary flex justify-between">
                      <span className="text-gray text-sm font-semibold">Importo totale</span>
                      <span className="font-bold text-accent">{formatCurrency(session.cost)}</span>
                    </div>
                    <button className="w-full btn btn-secondary gap-2 mt-4"><Download size={18} /> Scarica Ricevuta</button>
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
