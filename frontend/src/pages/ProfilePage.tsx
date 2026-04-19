import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LogOut, Edit2, Save, X, Loader, User, MapPin, CreditCard } from 'lucide-react'
import { profileService, UserProfile } from '../services/firestore'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    displayName: '',
    city: '',
    phoneNumber: '',
  })

  useEffect(() => {
    if (!user) return
    setLoading(true)
    profileService
      .get()
      .then((p) => {
        if (p) {
          setProfile(p)
          setFormData({
            displayName: p.displayName || '',
            city: p.city || '',
            phoneNumber: p.phoneNumber || '',
          })
        } else {
          // Prima volta: crea profilo da Firebase Auth
          const initial = {
            displayName: user.displayName || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
          }
          profileService.createOrUpdate(initial).then(() =>
            profileService.get().then(setProfile)
          )
          setFormData({
            displayName: user.displayName || '',
            city: '',
            phoneNumber: user.phoneNumber || '',
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      await profileService.createOrUpdate({
        displayName: formData.displayName,
        city: formData.city,
        phoneNumber: formData.phoneNumber,
        email: user?.email || '',
      })
      setProfile((prev) =>
        prev
          ? { ...prev, ...formData, updatedAt: new Date().toISOString() }
          : null
      )
      setEditing(false)
    } catch (err) {
      console.error(err)
      alert('Errore durante il salvataggio del profilo')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Vuoi disconnetterti?')) {
      await signOut()
      navigate('/login')
    }
  }

  if (loading) {
    return (
      <main className="bg-light min-h-screen flex items-center justify-center">
        <Loader size={32} className="animate-spin text-primary" />
      </main>
    )
  }

  const displayName = profile?.displayName || user?.displayName || 'Utente'
  const email = user?.email || ''
  const phone = profile?.phoneNumber || user?.phoneNumber || ''
  const city = profile?.city || ''

  return (
    <main className="bg-light min-h-screen">
      <div className="container py-6">
        <h1 className="text-3xl font-bold text-dark mb-8">Profilo</h1>

        {/* User Info Card */}
        <div className="card mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                <User size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-dark">{displayName}</h2>
                <p className="text-gray text-sm">{email}</p>
              </div>
            </div>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="btn btn-icon btn-secondary"
              >
                <Edit2 size={20} />
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4 border-t border-light-secondary pt-4">
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  className="form-input"
                  placeholder="Il tuo nome"
                />
              </div>
              <div className="form-group">
                <label className="form-label flex items-center gap-1">
                  <MapPin size={14} /> Città
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="form-input"
                  placeholder="Es. Milano"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telefono</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  className="form-input"
                  placeholder="+39 123 456 7890"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="btn btn-secondary flex-1 gap-2"
                >
                  <X size={18} /> Annulla
                </button>
                <button
                  onClick={handleSave}
                  className="btn btn-primary flex-1 gap-2"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Save size={18} /> Salva
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-light-secondary pt-4 space-y-2">
              {phone && (
                <p className="text-gray text-sm flex items-center gap-2">
                  <span className="font-semibold text-dark">📱</span> {phone}
                </p>
              )}
              {city && (
                <p className="text-gray text-sm flex items-center gap-2">
                  <MapPin size={14} /> {city}
                </p>
              )}
              {profile?.referralCode && (
                <p className="text-gray text-sm">
                  Codice referral:{' '}
                  <span className="font-bold text-primary">{profile.referralCode}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Pagamenti placeholder */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={20} className="text-primary" />
            <h3 className="text-lg font-bold text-dark">Metodi di Pagamento</h3>
          </div>
          <div className="flex items-center gap-2 p-3 bg-light-secondary rounded-lg">
            <CreditCard size={18} className="text-gray flex-shrink-0" />
            <p className="text-gray text-sm">
              I pagamenti con carta saranno disponibili a breve. Usa il wallet ParkFree per
              pagare i parcheggi.
            </p>
          </div>
        </div>

        {/* Impostazioni */}
        <div className="card mb-6">
          <h3 className="text-lg font-bold text-dark mb-4">Impostazioni</h3>
          <div className="space-y-1">
            {[
              { label: 'Notifiche', desc: 'Gestisci le preferenze di notifica' },
              { label: 'Privacy e Sicurezza', desc: 'Controlla come vengono utilizzati i tuoi dati' },
              { label: 'Aiuto e Supporto', desc: 'Contatta il nostro team di supporto' },
            ].map((item) => (
              <button
                key={item.label}
                className="w-full text-left p-3 hover:bg-light rounded-lg transition"
              >
                <p className="font-semibold text-dark">{item.label}</p>
                <p className="text-gray text-xs">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div className="card border-2 border-error border-opacity-20 mb-8">
          <button
            onClick={handleLogout}
            className="w-full btn btn-secondary gap-2 text-error"
          >
            <LogOut size={20} /> Disconnetti
          </button>
        </div>

        <div className="text-center text-gray text-xs pb-8">
          <p>ParkFree v1.0.0</p>
          <p className="mt-1">Fatto con ❤️ in Italia</p>
        </div>
      </div>
    </main>
  )
}
