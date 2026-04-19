import { useState, useEffect } from 'react'
import { Loader, Copy, Check, Gift, Users } from 'lucide-react'
import { referralService, ReferralInfo } from '../services/firestore'
import { formatCurrency } from '../utils/formatters'
import { useAuth } from '../hooks/useAuth'

export default function ReferralPage() {
  const { user } = useAuth()
  const [info, setInfo] = useState<ReferralInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyMessage, setApplyMessage] = useState<{
    text: string
    success: boolean
  } | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    referralService
      .getInfo()
      .then(setInfo)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  const handleCopy = () => {
    if (!info?.code) return
    navigator.clipboard.writeText(info.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codeInput.trim()) return
    setApplying(true)
    setApplyMessage(null)
    try {
      const result = await referralService.applyCode(codeInput.trim())
      setApplyMessage({ text: result.message, success: result.success })
      if (result.success) setCodeInput('')
    } catch {
      setApplyMessage({
        text: "Errore durante l'applicazione del codice",
        success: false,
      })
    } finally {
      setApplying(false)
    }
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
        <h1 className="text-3xl font-bold text-dark mb-2">Programma Referral</h1>
        <p className="text-gray text-sm mb-8">
          Invita amici e guadagna crediti per i tuoi parcheggi
        </p>

        {/* Come funziona */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-dark mb-4">Come funziona</h2>
          <div className="space-y-3">
            {[
              {
                step: '1',
                title: 'Condividi il tuo codice',
                desc: 'Invia il tuo codice personale agli amici',
              },
              {
                step: '2',
                title: 'Il tuo amico si registra',
                desc: 'Usa il tuo codice durante la registrazione',
              },
              {
                step: '€',
                title: 'Entrambi guadagnate',
                desc: 'Tu ricevi €2.00, il tuo amico riceve €1.00',
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <p className="font-semibold text-dark text-sm">{item.title}</p>
                  <p className="text-gray text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Il tuo codice */}
        <div className="card mb-6">
          <h2 className="text-lg font-bold text-dark mb-3">Il tuo codice personale</h2>
          <div className="flex items-center gap-3 bg-light-secondary rounded-lg p-4">
            <p className="text-2xl font-bold text-primary tracking-widest flex-1">
              {info?.code || '—'}
            </p>
            <button onClick={handleCopy} className="btn btn-primary gap-2">
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copiato!' : 'Copia'}
            </button>
          </div>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card text-center">
            <Users size={28} className="text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-dark">{info?.referredUsers ?? 0}</p>
            <p className="text-gray text-xs">Amici invitati</p>
          </div>
          <div className="card text-center">
            <Gift size={28} className="text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold text-dark">
              {formatCurrency(info?.totalEarned ?? 0)}
            </p>
            <p className="text-gray text-xs">Crediti guadagnati</p>
          </div>
        </div>

        {/* Applica codice amico */}
        <div className="card">
          <h2 className="text-lg font-bold text-dark mb-3">Hai un codice amico?</h2>
          <form onSubmit={handleApplyCode} className="flex gap-3">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Es. PFABC123"
              className="form-input flex-1"
              maxLength={10}
            />
            <button type="submit" className="btn btn-accent" disabled={applying}>
              {applying ? <Loader size={18} className="animate-spin" /> : 'Applica'}
            </button>
          </form>
          {applyMessage && (
            <p
              className={`mt-3 text-sm font-semibold ${
                applyMessage.success ? 'text-success' : 'text-error'
              }`}
            >
              {applyMessage.text}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
