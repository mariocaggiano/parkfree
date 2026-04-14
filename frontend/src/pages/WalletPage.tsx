import { useEffect, useRef, useState, useCallback } from 'react'
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, Gift, RotateCcw, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { parkingAPI } from '../services/api'
import { WalletBalance, WalletTransaction, TopupOption } from '../types'
import { formatCurrency } from '../utils/formatters'

// ─── Taglie di ricarica ───────────────────────────────────────────────────────

const TOPUP_OPTIONS: TopupOption[] = [
  { amount: 5,  bonus: 0,    totalCredit: 5,    label: '€5' },
  { amount: 10, bonus: 0,    totalCredit: 10,   label: '€10' },
  { amount: 20, bonus: 1.00, totalCredit: 21,   label: '€20 +5%' },
  { amount: 50, bonus: 3.50, totalCredit: 53.5, label: '€50 +7%' },
]

// ─── Helper: icona e colore per tipo transazione ──────────────────────────────

function TxIcon({ type }: { type: WalletTransaction['type'] }) {
  switch (type) {
    case 'topup':
    case 'topup_bonus':
      return <ArrowDownLeft size={18} className="text-accent" />
    case 'session_debit':
      return <ArrowUpRight size={18} className="text-error" />
    case 'session_refund':
      return <RotateCcw size={18} className="text-primary" />
    case 'referral_credit':
    case 'promo_credit':
      return <Gift size={18} className="text-warning" />
    default:
      return <ArrowDownLeft size={18} className="text-gray" />
  }
}

function txAmountClass(amount: number): string {
  return amount >= 0 ? 'text-accent font-semibold' : 'text-dark font-semibold'
}

function formatAmount(amount: number): string {
  const prefix = amount >= 0 ? '+' : ''
  return `${prefix}${formatCurrency(Math.abs(amount))}`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletBalance | null>(null)
  const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>([])
  const [txPage, setTxPage] = useState(1)
  const [txTotal, setTxTotal] = useState(0)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [loadingTx, setLoadingTx] = useState(false)

  // Top-up state
  const [selectedTopup, setSelectedTopup] = useState<TopupOption | null>(null)
  const [topupStep, setTopupStep] = useState<'select' | 'confirm' | 'processing' | 'success' | 'error'>('select')
  const [topupError, setTopupError] = useState('')
  const [showTopup, setShowTopup] = useState(false)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carica saldo
  const loadBalance = useCallback(async () => {
    try {
      setLoadingBalance(true)
      const res = await parkingAPI.getWalletBalance()
      setWallet(res.data)
    } catch {
      // saldo non critico, mostra 0
      setWallet({ balance: 0, recentTransactions: [] })
    } finally {
      setLoadingBalance(false)
    }
  }, [])

  // Carica storico transazioni (paginato)
  const loadTransactions = useCallback(async (page: number) => {
    try {
      setLoadingTx(true)
      const res = await parkingAPI.getWalletTransactions(page, 15)
      if (page === 1) {
        setAllTransactions(res.data.transactions)
      } else {
        setAllTransactions((prev) => [...prev, ...res.data.transactions])
      }
      setTxTotal(res.data.pagination.total)
      setTxPage(page)
    } catch {
      // silenzioso
    } finally {
      setLoadingTx(false)
    }
  }, [])

  useEffect(() => {
    loadBalance()
    loadTransactions(1)
  }, [loadBalance, loadTransactions])

  // Pulizia timer al unmount per evitare memory leak
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  // ─── Logica ricarica ────────────────────────────────────────────────────────

  const handleStartTopup = (option: TopupOption) => {
    setSelectedTopup(option)
    setTopupStep('confirm')
    setTopupError('')
  }

  const handleConfirmTopup = async () => {
    if (!selectedTopup) return
    setTopupStep('processing')
    try {
      // Crea il PaymentIntent sul backend
      await parkingAPI.createTopup(selectedTopup.amount)
      // In produzione qui si apre Stripe Elements / redirect.
      // Per ora simuliamo il successo (il webhook reale accrediterà il saldo).
      setTopupStep('success')
      // Ricarica il saldo dopo 2s (il webhook Stripe potrebbe impiegare qualche secondo)
      successTimerRef.current = setTimeout(() => {
        loadBalance()
        loadTransactions(1)
        setTopupStep('select')
        setShowTopup(false)
        setSelectedTopup(null)
      }, 2000)
    } catch {
      setTopupError('Pagamento non riuscito. Riprova.')
      setTopupStep('error')
    }
  }

  const handleCancelTopup = () => {
    setTopupStep('select')
    setSelectedTopup(null)
    setTopupError('')
    setShowTopup(false)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Wallet size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark">Il mio saldo</h1>
            <p className="text-sm text-gray">Gestisci la tua ricarica ParkFree</p>
          </div>
        </div>
      </div>

      {/* Balance card */}
      <div className="card mb-4" style={{ background: 'linear-gradient(135deg, #2E86C1 0%, #1a5c87 100%)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/80 text-sm font-medium">Saldo disponibile</span>
          <Wallet size={20} className="text-white/60" />
        </div>
        {loadingBalance ? (
          <div className="h-12 flex items-center">
            <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
          </div>
        ) : (
          <div className="text-white text-4xl font-bold tracking-tight mb-1">
            {formatCurrency(wallet?.balance ?? 0)}
          </div>
        )}
        <p className="text-white/60 text-xs mt-2">
          Usato per tutte le sessioni di parcheggio
        </p>
      </div>

      {/* Pulsante ricarica */}
      {!showTopup && (
        <button
          className="btn btn-primary w-full mb-6 gap-2"
          onClick={() => { setShowTopup(true); setTopupStep('select') }}
        >
          <Plus size={20} />
          Ricarica saldo
        </button>
      )}

      {/* ─── Pannello ricarica ─────────────────────────────────────────────── */}
      {showTopup && (
        <div className="card mb-6">
          {topupStep === 'select' && (
            <>
              <h2 className="text-lg font-bold text-dark mb-1">Scegli l'importo</h2>
              <p className="text-sm text-gray mb-4">
                Ricariche ≥€20 includono un bonus gratuito
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {TOPUP_OPTIONS.map((opt) => (
                  <button
                    key={opt.amount}
                    onClick={() => handleStartTopup(opt)}
                    className={`relative rounded-xl p-4 text-left border-2 transition-all ${
                      selectedTopup?.amount === opt.amount
                        ? 'border-primary bg-primary/5'
                        : 'border-light-secondary hover:border-primary/40'
                    }`}
                  >
                    {opt.bonus > 0 && (
                      <span className="absolute top-2 right-2 bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        +{opt.bonus >= 3 ? '7%' : '5%'}
                      </span>
                    )}
                    <div className="text-2xl font-bold text-dark">€{opt.amount}</div>
                    {opt.bonus > 0 ? (
                      <div className="text-sm text-accent font-medium mt-1">
                        Ricevi €{opt.totalCredit.toFixed(2)}
                      </div>
                    ) : (
                      <div className="text-sm text-gray mt-1">Nessun bonus</div>
                    )}
                  </button>
                ))}
              </div>
              <button className="btn btn-outline w-full" onClick={handleCancelTopup}>
                Annulla
              </button>
            </>
          )}

          {topupStep === 'confirm' && selectedTopup && (
            <>
              <h2 className="text-lg font-bold text-dark mb-4">Conferma ricarica</h2>
              <div className="bg-light rounded-xl p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray">Importo addebitato</span>
                  <span className="font-semibold">{formatCurrency(selectedTopup.amount)}</span>
                </div>
                {selectedTopup.bonus > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray">Bonus gratuito</span>
                    <span className="font-semibold text-accent">+{formatCurrency(selectedTopup.bonus)}</span>
                  </div>
                )}
                <div className="border-t border-light-secondary pt-2 flex justify-between">
                  <span className="font-bold text-dark">Saldo accreditato</span>
                  <span className="font-bold text-primary text-lg">
                    {formatCurrency(selectedTopup.totalCredit)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray mb-4">
                Il pagamento avviene in modo sicuro tramite Stripe. Verrai reindirizzato alla
                pagina di pagamento.
              </p>
              <div className="flex gap-3">
                <button className="btn btn-outline flex-1" onClick={() => setTopupStep('select')}>
                  Indietro
                </button>
                <button className="btn btn-primary flex-1" onClick={handleConfirmTopup}>
                  Paga {formatCurrency(selectedTopup.amount)}
                </button>
              </div>
            </>
          )}

          {topupStep === 'processing' && (
            <div className="text-center py-6">
              <div className="spinner mx-auto mb-4" />
              <p className="text-dark font-medium">Elaborazione pagamento…</p>
              <p className="text-sm text-gray mt-1">Non chiudere questa pagina</p>
            </div>
          )}

          {topupStep === 'success' && (
            <div className="text-center py-6">
              <CheckCircle2 size={48} className="text-accent mx-auto mb-3" />
              <p className="text-dark font-bold text-lg">Ricarica completata!</p>
              <p className="text-sm text-gray mt-1">
                {formatCurrency(selectedTopup?.totalCredit ?? 0)} aggiunti al tuo saldo
              </p>
            </div>
          )}

          {topupStep === 'error' && (
            <div className="text-center py-6">
              <AlertCircle size={48} className="text-error mx-auto mb-3" />
              <p className="text-dark font-bold text-lg">Pagamento non riuscito</p>
              <p className="text-sm text-gray mt-2">{topupError}</p>
              <button
                className="btn btn-primary mt-4"
                onClick={() => setTopupStep('confirm')}
              >
                Riprova
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Come funziona ──────────────────────────────────────────────────── */}
      <div className="card mb-6 bg-primary/5 border border-primary/20">
        <h3 className="font-bold text-dark mb-3">Come funziona il saldo?</h3>
        <div className="space-y-2">
          {[
            { n: '1', text: 'Ricarichi una volta con carta di credito' },
            { n: '2', text: 'Ogni parcheggio scala automaticamente dal saldo' },
            { n: '3', text: 'Se termini prima, il non usato torna subito nel saldo' },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                {n}
              </span>
              <p className="text-sm text-dark">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Storico transazioni ────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="text-lg font-bold text-dark mb-4">Storico movimenti</h2>

        {allTransactions.length === 0 && !loadingTx && (
          <p className="text-center text-gray text-sm py-6">
            Nessun movimento ancora. Ricarica il saldo per iniziare.
          </p>
        )}

        <div className="space-y-1">
          {allTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-light last:border-0">
              <div className="w-9 h-9 rounded-full bg-light flex items-center justify-center shrink-0">
                <TxIcon type={tx.type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark truncate">{tx.description}</p>
                <p className="text-xs text-gray">{formatDate(tx.createdAt)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm ${txAmountClass(tx.amount)}`}>
                  {formatAmount(tx.amount)}
                </p>
                <p className="text-xs text-gray">saldo {formatCurrency(tx.balanceAfter)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Load more */}
        {allTransactions.length < txTotal && (
          <button
            className="btn btn-outline w-full mt-4 gap-2"
            onClick={() => loadTransactions(txPage + 1)}
            disabled={loadingTx}
          >
            {loadingTx ? (
              <div className="spinner" />
            ) : (
              <>
                <ChevronRight size={16} className="rotate-90" />
                Carica altri movimenti
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
