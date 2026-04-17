import { useState, useEffect } from 'react'
import { Gift, Copy, Check, Users, Euro, Share2 } from 'lucide-react'
import { parkingAPI } from '../services/api'

interface ReferralStats {
  code: string
  invitesSent: number
  invitesAccepted: number
  creditsEarned: number
  creditsAvailable: number
  referralHistory: ReferralEntry[]
}

interface ReferralEntry {
  id: string
  inviteeName: string
  acceptedAt: string
  creditEarned: number
  status: 'pending' | 'completed'
}

// Dati demo
const DEMO_STATS: ReferralStats = {
  code: 'PARK-MARIO7',
  invitesSent: 5,
  invitesAccepted: 3,
  creditsEarned: 3.0,
  creditsAvailable: 1.5,
  referralHistory: [
    { id: 'r1', inviteeName: 'Luca B.', acceptedAt: new Date(Date.now() - 7 * 86400000).toISOString(), creditEarned: 1.0, status: 'completed' },
    { id: 'r2', inviteeName: 'Sara M.', acceptedAt: new Date(Date.now() - 14 * 86400000).toISOString(), creditEarned: 1.0, status: 'completed' },
    { id: 'r3', inviteeName: 'Marco R.', acceptedAt: new Date(Date.now() - 2 * 86400000).toISOString(), creditEarned: 1.0, status: 'completed' },
    { id: 'r4', inviteeName: 'Anna T.', acceptedAt: new Date().toISOString(), creditEarned: 1.0, status: 'pending' },
    { id: 'r5', inviteeName: 'Giorgio F.', acceptedAt: new Date().toISOString(), creditEarned: 1.0, status: 'pending' },
  ],
}

export default function ReferralPage() {
  const [stats, setStats] = useState<ReferralStats>(DEMO_STATS)
  const [copied, setCopied] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)

  useEffect(() => {
    const fetchReferral = async () => {
      try {
        const res = await parkingAPI.getReferralStats()
        if (res.data) setStats(res.data)
      } catch {
        // Usa dati demo
      }
    }
    fetchReferral()
  }, [])

  const referralLink = `https://parkfree.it/invito/${stats.code}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleShare = async () => {
    setShareLoading(true)
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'ParkFree — Parcheggia in un tap',
          text: `Prova ParkFree per pagare le strisce blu! Usiamo il mio codice e otteniamo entrambi 1€ di credito: ${stats.code}`,
          url: referralLink,
        })
      } else {
        handleCopy()
      }
    } catch {
      // Ignorato (es. utente ha annullato)
    } finally {
      setShareLoading(false)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })

  const conversionRate = stats.invitesSent > 0
    ? Math.round((stats.invitesAccepted / stats.invitesSent) * 100)
    : 0

  return (
    <main className="bg-light min-h-screen">
      <div className="container py-6">
        <h1 className="text-3xl font-bold text-dark mb-2">Invita Amici</h1>
        <p className="text-gray text-sm mb-8">
          Per ogni amico che si registra e parcheggia, guadagnate entrambi 1&nbsp;€ di credito.
        </p>

        {/* Hero card */}
        <div
          className="rounded-2xl p-6 mb-6 text-white"
          style={{ background: 'linear-gradient(135deg, #2E86C1 0%, #1A5276 100%)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white bg-opacity-20 rounded-xl p-3">
              <Gift size={24} className="text-white" />
            </div>
            <div>
              <p className="text-sm opacity-80">Il tuo codice personale</p>
              <p className="text-2xl font-bold tracking-wider">{stats.code}</p>
            </div>
          </div>

          {/* Link copiabile */}
          <div className="bg-white bg-opacity-10 rounded-xl p-3 flex items-center justify-between gap-3 mb-4">
            <p className="text-sm opacity-90 truncate flex-1">{referralLink}</p>
            <button
              onClick={handleCopy}
              className="flex-shrink-0 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition"
              title="Copia link"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>

          <button
            onClick={handleShare}
            disabled={shareLoading}
            className="w-full bg-white text-primary font-bold rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-opacity-90 transition"
          >
            <Share2 size={20} />
            {shareLoading ? 'Condivisione…' : 'Condividi con un amico'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-primary">{stats.invitesSent}</p>
            <p className="text-xs text-gray mt-1">Inviti inviati</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-accent">{stats.invitesAccepted}</p>
            <p className="text-xs text-gray mt-1">Accettati</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-dark">{conversionRate}%</p>
            <p className="text-xs text-gray mt-1">Conversione</p>
          </div>
        </div>

        {/* Crediti disponibili */}
        <div className="card mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-accent bg-opacity-10 rounded-xl p-3">
              <Euro size={22} className="text-accent" />
            </div>
            <div>
              <p className="text-sm text-gray">Crediti disponibili</p>
              <p className="text-2xl font-bold text-accent">
                {stats.creditsAvailable.toFixed(2)} €
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray">Guadagnati totale</p>
            <p className="text-lg font-bold text-dark">{stats.creditsEarned.toFixed(2)} €</p>
          </div>
        </div>

        {/* Come funziona */}
        <div className="card mb-6">
          <h3 className="text-lg font-bold text-dark mb-4 flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Come funziona
          </h3>
          <div className="space-y-4">
            {[
              { step: '1', label: 'Condividi il tuo codice', desc: 'Invia il link o il codice a un amico tramite WhatsApp, SMS o email.' },
              { step: '2', label: "L'amico si registra", desc: "Usa il tuo codice durante la registrazione e ottiene 1 € di sconto sulla prima sessione." },
              { step: '3', label: 'Guadagnate entrambi', desc: 'Dopo la prima sessione completata, ricevi automaticamente 1 € di credito sul tuo account.' },
            ].map(({ step, label, desc }) => (
              <div key={step} className="flex items-start gap-4">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #2E86C1, #27AE60)' }}
                >
                  {step}
                </div>
                <div>
                  <p className="font-semibold text-dark text-sm">{label}</p>
                  <p className="text-gray text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Storico */}
        <div className="card">
          <h3 className="text-lg font-bold text-dark mb-4">Storico inviti</h3>
          {stats.referralHistory.length === 0 ? (
            <div className="text-center py-8">
              <Gift size={32} className="text-gray mx-auto mb-3" />
              <p className="text-gray text-sm">Nessun invito ancora inviato.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.referralHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-3 border-b border-light-secondary last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                      style={{ background: '#EBF5FB', color: '#2E86C1' }}
                    >
                      {entry.inviteeName[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-dark text-sm">{entry.inviteeName}</p>
                      <p className="text-xs text-gray">{formatDate(entry.acceptedAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {entry.status === 'completed' ? (
                      <span className="text-accent font-bold text-sm">+{entry.creditEarned.toFixed(2)} €</span>
                    ) : (
                      <span className="text-gray text-xs">In attesa</span>
                    )}
                    <p className="text-xs text-gray mt-0.5">
                      {entry.status === 'completed' ? 'Accreditato' : 'Deve parcheggiare'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
