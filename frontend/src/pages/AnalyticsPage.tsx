import { useState, useEffect } from 'react'
import { Loader, TrendingUp, Clock, MapPin, Euro } from 'lucide-react'
import { ParkingSession } from '../types'
import { formatCurrency, formatDuration } from '../utils/formatters'
import { sessionsService } from '../services/firestore'
import { useAuth } from '../hooks/useAuth'

const ZONE_NAMES: Record<string, string> = {
  z1: 'Duomo',
  z2: 'Brera',
  z3: 'Navigli',
  z4: 'Porta Romana',
  z5: 'Stazione Centrale',
}

const MONTH_NAMES = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
]

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ParkingSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    sessionsService
      .getCompleted(100)
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  const now = new Date()

  // KPI questo mese
  const thisMonth = sessions.filter((s) => {
    const d = new Date(s.startTime)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalSpentThisMonth = thisMonth.reduce((sum, s) => sum + s.cost, 0)
  const totalSessionsThisMonth = thisMonth.length

  // Media globale
  const avgDuration =
    sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
      : 0
  const avgCost =
    sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.cost, 0) / sessions.length
      : 0

  // Zona più usata
  const zoneCounts: Record<string, number> = {}
  sessions.forEach((s) => {
    zoneCounts[s.zoneId] = (zoneCounts[s.zoneId] || 0) + 1
  })
  const topZoneId = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topZone = topZoneId ? ZONE_NAMES[topZoneId] || topZoneId : '—'

  // Grafico ultimi 6 mesi
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { month: MONTH_NAMES[d.getMonth()], monthIndex: d.getMonth(), year: d.getFullYear(), amount: 0 }
  })
  sessions.forEach((s) => {
    const d = new Date(s.startTime)
    const idx = last6Months.findIndex(
      (m) => d.getMonth() === m.monthIndex && d.getFullYear() === m.year
    )
    if (idx >= 0) last6Months[idx].amount += s.cost
  })
  const maxAmount = Math.max(...last6Months.map((m) => m.amount), 1)

  // Zone per frequenza
  const zoneStats = Object.entries(zoneCounts)
    .map(([id, count]) => ({ name: ZONE_NAMES[id] || id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  if (loading) {
    return (
      <main className="bg-light min-h-screen flex items-center justify-center">
        <Loader size={32} className="animate-spin text-primary" />
      </main>
    )
  }

  return (
    <main className="bg-light min-h-screen">
      <div className="container py-6">
        <h1 className="text-3xl font-bold text-dark mb-8">Statistiche</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <Euro size={18} className="text-accent" />
              <p className="text-gray text-xs font-semibold uppercase">Questo mese</p>
            </div>
            <p className="text-2xl font-bold text-accent">
              {formatCurrency(totalSpentThisMonth)}
            </p>
            <p className="text-gray text-xs mt-1">{totalSessionsThisMonth} parcheggi</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-primary" />
              <p className="text-gray text-xs font-semibold uppercase">Media</p>
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(avgCost)}</p>
            <p className="text-gray text-xs mt-1">per sessione</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-warning" />
              <p className="text-gray text-xs font-semibold uppercase">Durata media</p>
            </div>
            <p className="text-2xl font-bold text-warning">
              {formatDuration(Math.round(avgDuration))}
            </p>
            <p className="text-gray text-xs mt-1">per sessione</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={18} className="text-success" />
              <p className="text-gray text-xs font-semibold uppercase">Zona preferita</p>
            </div>
            <p className="text-lg font-bold text-success leading-tight">{topZone}</p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-gray-light mb-3 text-4xl">📊</div>
            <h3 className="text-lg font-semibold text-dark mb-2">Nessun dato disponibile</h3>
            <p className="text-gray text-sm">
              Le statistiche appariranno dopo il tuo primo parcheggio
            </p>
          </div>
        ) : (
          <>
            {/* Grafico spesa ultimi 6 mesi */}
            <div className="card mb-6">
              <h2 className="text-lg font-bold text-dark mb-4">Spesa ultimi 6 mesi</h2>
              <div className="flex items-end gap-2 h-32">
                {last6Months.map((m) => (
                  <div
                    key={`${m.month}-${m.year}`}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-primary rounded-t transition-all"
                      style={{
                        height: `${(m.amount / maxAmount) * 100}%`,
                        minHeight: m.amount > 0 ? '4px' : '0',
                      }}
                    />
                    <span className="text-gray text-xs">{m.month}</span>
                    {m.amount > 0 && (
                      <span className="text-primary text-xs font-semibold">
                        {formatCurrency(m.amount)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Zone più usate */}
            {zoneStats.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-bold text-dark mb-4">Zone più usate</h2>
                <div className="space-y-3">
                  {zoneStats.map((z, i) => (
                    <div key={z.name} className="flex items-center gap-3">
                      <span className="text-gray text-sm w-4">{i + 1}.</span>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-dark text-sm font-semibold">{z.name}</span>
                          <span className="text-gray text-sm">
                            {z.count} {z.count === 1 ? 'volta' : 'volte'}
                          </span>
                        </div>
                        <div className="w-full bg-light-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${(z.count / (zoneStats[0]?.count || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
