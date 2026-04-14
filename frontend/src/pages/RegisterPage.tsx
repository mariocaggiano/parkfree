import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { User, Mail, Lock, Phone } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signUpWithEmail } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    agreeTerms: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.name.trim()) {
      setError('Inserisci il tuo nome')
      return
    }

    if (!formData.email.includes('@')) {
      setError('Inserisci un email valida')
      return
    }

    if (formData.password.length < 6) {
      setError('La password deve essere almeno 6 caratteri')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Le password non corrispondono')
      return
    }

    if (!formData.agreeTerms) {
      setError('Devi accettare i Termini di Servizio')
      return
    }

    setLoading(true)

    try {
      await signUpWithEmail(
        formData.email,
        formData.password,
        formData.name
      )
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
            <div className="text-2xl font-bold text-accent">P</div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Registrati</h1>
          <p className="text-white text-opacity-90">Crea il tuo account ParkFree</p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="bg-error bg-opacity-10 border border-error rounded-lg p-4">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          {/* Name */}
          <div className="form-group">
            <label className="form-label">Nome Completo</label>
            <div className="relative">
              <User
                size={18}
                className="absolute left-3 top-3.5 text-gray"
              />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Mario Rossi"
                className="form-input pl-10"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-3.5 text-gray"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tuo@email.com"
                className="form-input pl-10"
                required
              />
            </div>
          </div>

          {/* Phone (Optional) */}
          <div className="form-group">
            <label className="form-label">Numero di Telefono (Opzionale)</label>
            <div className="relative">
              <Phone
                size={18}
                className="absolute left-3 top-3.5 text-gray"
              />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+39 XXX XXXXXXX"
                className="form-input pl-10"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-3.5 text-gray"
              />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="form-input pl-10"
                required
              />
            </div>
            <p className="form-help">Almeno 6 caratteri</p>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label">Conferma Password</label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-3.5 text-gray"
              />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="form-input pl-10"
                required
              />
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3 mb-6">
            <input
              type="checkbox"
              name="agreeTerms"
              id="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleChange}
              className="form-checkbox mt-1"
              required
            />
            <label htmlFor="agreeTerms" className="text-sm text-gray cursor-pointer">
              Accetto i{' '}
              <a href="#" className="text-primary font-semibold">
                Termini di Servizio
              </a>{' '}
              e l'
              <a href="#" className="text-primary font-semibold">
                Informativa sulla Privacy
              </a>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-accent w-full gap-2"
          >
            {loading ? 'Registrazione in corso...' : 'Crea Account'}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-white text-opacity-90">
            Hai già un account?{' '}
            <Link
              to="/login"
              className="text-white font-semibold underline hover:no-underline"
            >
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
