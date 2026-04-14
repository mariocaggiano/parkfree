import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { SpendingData, ZoneStatistic } from '../types'
import { formatCurrency } from '../utils/formatters'

const COLORS = ['#2E86C1', '#27AE60', '#F39C12', '#E74C3C', '#9B59B6']

export default function AnalyticsPage() {
  // Mock data
  const spendingData: SpendingData[] = [
    { month: 'Gennaio', amount: 45.5 },
    { month: 'Febbraio', amount: 52.3 },
    { month: 'Marzo', amount: 38.7 },
    { month: 'Aprile', amount: 61.2 },
  ]

  const topZones: ZoneStatistic[] = [
    { name: 'Duomo - Via Torino', value: 35, percentage: 35 },
    { name: 'Brera - Via Solferino', value: 28, percentage: 28 },
    { name: 'Navigli', value: 20, percentage: 20 },
    { name: 'Stazione Centrale', value: 17, percentage: 17 },
  ]

  const totalSpentThisMonth = 61.2
  const averagePerSession = 8.5
  const totalSessions = 7
  const topZone = 'Duomo - Via Torino'

  return (
    <main className="bg-light min-h-screen">
      <div className="container py-6">
        {/* Header */}
        <h1 className="text-3xl font-bold text-dark mb-8">Analisi Spesa</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="card">
            <p className="text-gray text-xs font-semibold uppercase mb-2">
              Spesa Questo Mese
            </p>
            <p className="text-4xl font-bold text-accent mb-2">
              {formatCurrency(totalSpentThisMonth)}
            </p>
            <p className="text-gray text-sm">In aumento del 15% rispetto al mese scorso</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <p className="text-gray text-xs font-semibold uppercase mb-2">
                Media per Sessione
              </p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(averagePerSession)}
              </p>
            </div>
            <div className="card">
              <p className="text-gray text-xs font-semibold uppercase mb-2">
                Sessioni
              </p>
              <p className="text-2xl font-bold text-primary">{totalSessions}</p>
            </div>
          </div>

          <div className="card">
            <p className="text-gray text-xs font-semibold uppercase mb-2">
              Zona Preferita
            </p>
            <p className="text-xl font-bold text-dark">{topZone}</p>
            <p className="text-gray text-sm mt-1">
              Dove parcheggi più frequentemente
            </p>
          </div>
        </div>

        {/* Monthly Spending Chart */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-dark mb-4">Spesa Mensile</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={spendingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-light-secondary)" />
              <XAxis dataKey="month" stroke="var(--color-gray)" />
              <YAxis stroke="var(--color-gray)" />
              <Tooltip
                formatter={(value) => formatCurrency(value as number)}
                contentStyle={{
                  backgroundColor: 'var(--color-white)',
                  border: '1px solid var(--color-light-secondary)',
                  borderRadius: '8px',
                }}
                cursor={{ fill: 'rgba(46, 134, 193, 0.1)' }}
              />
              <Bar dataKey="amount" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Zones Chart */}
        <div className="card">
          <h2 className="text-xl font-bold text-dark mb-4">Zone Preferite</h2>
          <div className="flex items-center justify-center mb-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={topZones}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {topZones.map((_zone, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Zone Legend */}
          <div className="space-y-3">
            {topZones.map((zone, index) => (
              <div key={zone.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="font-semibold text-dark">{zone.name}</span>
                </div>
                <span className="text-gray text-sm">{zone.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 card bg-info bg-opacity-10 border border-info border-opacity-20">
          <h3 className="font-bold text-info mb-2">💡 Consiglio</h3>
          <p className="text-info text-sm">
            Considera di aggiungere una carta di credito come metodo di pagamento predefinito
            per transazioni più veloci
          </p>
        </div>
      </div>
    </main>
  )
}
