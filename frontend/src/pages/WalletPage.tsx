import { useState, useEffect } from 'react'
import { Loader, Plus, ArrowUpRight, ArrowDownLeft, Gift, CreditCard } from 'lucide-react'
import { WalletTransaction } from '../types'
import { formatCurrency } from '../utils/formatters'
import { walletService } from '../services/firestore'
import { useAuth } from '../hooks/useAuth'

const TOPUP_OPTIONS = [
  { amount: 10, bonus: 0 },
  { amount: 20, bonus: 1 },
  { amount: 50, bonus: 5 },
]

function TxIcon({ type }: { type: string }) {
  if (type === 'topup' || type === 'topup_bonus')
    return <ArrowDownLeft size={18} className="text-success" />
  if (type === 'referral_credit' || type === 'promo_credit')
    return <Gift size={18} className="text-accent" />
  return <ArrowUpRight size={18} className="text-error" />
}

export default function WalletPage() {
  const { user } = useAuth()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showTopup, setShowTopup] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([walletService.getBalance(), walletService.getTransactions()])
      .then(([bal, txs]) => {
        setBalance(bal)
        setTransactions(txs)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  const handleTopup = (amount: number, bonus: number) => {
    alert(
      `💳 Pagamenti in arrivo!\n\nVerresti addebitato ${formatCurrency(amount)} e accreditato ${formatCurrency(amount + bonus)} sul tuo wallet ParkFree.`
    )
    setShowTopup(false)
  }

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
        <h1 className="text-3xl font-bold text-dark mb-6">Portafoglio</h1>

        {/* Card saldo */}
        <div
          className="card text-white mb-6"
          style={{ background: 'linear-gradient(135deg, #2E86C1, #17A589)' }}
        >
          <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Saldo disponibile
          </p>
          <p className="text-4xl font-bold mb-4">{formatCurrency(balance)}</p>
          <button
            onClick={() => setShowTopup(!showTopup)}
            className="btn gap-2 font-bold"
            style={{ background: 'white', color: '#2E86C1' }}
          >
            <Plus size={20} /> Ricarica
          </button>
        </div>

        {/* Opzioni ricarica */}
        {showTopup && (
          <div className="card mb-6">
            <h2 className="text-lg font-bold text-dark mb-4">Scegli importo</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {TOPUP_OPTIONS.map((opt) => (
                <button
                  key={opt.amount}
                  onClick={() => handleTopup(opt.amount, opt.bonus)}
                  className="card text-center p-3 border-2 border-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                >
                  <p className="font-bold text-lg">{formatCurrency(opt.amount)}</p>
                  {opt.bonus > 0 && (
                    <p className="text-xs text-success font-semibold">
                      +{formatCurrency(opt.bonus)} bonus
                    </p>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 p-3 bg-light-secondary rounded-lg">
              <CreditCard size={18} className="text-gray flex-shrink-0" />
              <p className="text-gray text-sm">
                I pagamenti con carta saranno disponibili a breve
              </p>
            </div>
          </div>
        )}

        {/* Movimenti */}
        <h2 className="text-lg font-bold text-dark mb-4">Movimenti</h2>
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-light-secondary flex items-center justify-center flex-shrink-0">
                  <TxIcon type={tx.type} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-dark text-sm">{tx.description}</p>
                  <p className="text-gray text-xs">
                    {new Date(tx.createdAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${
                      tx.amount >= 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {tx.amount >= 0 ? '+' : ''}
                    {formatCurrency(tx.amount)}
                  </p>
                  <p className="text-gray text-xs">
                    Saldo: {formatCurrency(tx.balanceAfter)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="text-gray-light mb-3 text-4xl">💳</div>
            <h3 className="text-lg font-semibold text-dark mb-2">Nessun movimento</h3>
            <p className="text-gray text-sm">I tuoi movimenti appariranno qui</p>
          </div>
        )}
      </div>
    </main>
  )
}
