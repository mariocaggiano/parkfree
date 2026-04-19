import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/auth'
import { ConfirmationResult } from 'firebase/auth'
import { Mail, Lock, Smartphone, Globe } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signInWithEmail, signInWithGoogle } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Phone OTP state
  const [showPhone, setShowPhone] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [otpSent, setOtpSent] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmail(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Errore durante il login')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Errore durante il login con Google')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      setError('Inserisci il numero di telefono')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await authService.signInWithPhone(phoneNumber.trim())
      setConfirmationResult(result)
      setOtpSent(true)
    } catch (err: any) {
      setError(err.message || 'Errore invio SMS')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!confirmationResult || !otp.trim()) {
      setError('Inserisci il codice OTP ricevuto')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authService.verifyPhoneOTP(confirmationResult, otp.trim())
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Codice OTP non valido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
            <div className="text-2xl font-bold text-primary">P</div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">ParkFree</h1>
          <p className="text-white text-opacity-90">Parcheggia facilmente</p>
        </div>

        <div className="space-y-4">
          {/* Error banner */}
          {error && (
            <div className="bg-error bg-opacity-10 border border-error rounded-lg p-4">
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          {/* Email Login */}
          <form onSubmit={handleEmailLogin} className="card">
            <h2 className="text-xl font-bold mb-4 text-dark">Accedi con Email</h2>

            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-3.5 text-gray" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tuo@email.com"
                  className="form-input pl-10"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3.5 text-gray" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pl-10"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn btn-secondary w-full gap-2"
          >
            <Globe size={20} />
            Accedi con Google
          </button>

          {/* Phone OTP */}
          <button
            onClick={() => { setShowPhone(!showPhone); setError('') }}
            className="btn btn-outline w-full gap-2"
          >
            <Smartphone size={20} />
            {showPhone ? 'Nascondi' : 'Accedi con Telefono'}
          </button>

          {showPhone && (
            <div className="card">
              {!otpSent ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Numero di Telefono</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+39 XXX XXXXXXX"
                      className="form-input"
                    />
                  </div>
                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="btn btn-primary w-full"
                  >
                    {loading ? 'Invio SMS...' : 'Invia Codice OTP'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray mb-4">
                    SMS inviato a {phoneNumber}. Inserisci il codice ricevuto.
                  </p>
                  <div className="form-group">
                    <label className="form-label">Codice OTP</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="000000"
                      className="form-input text-center text-2xl tracking-widest"
                      maxLength={6}
                    />
                  </div>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    className="btn btn-primary w-full"
                  >
                    {loading ? 'Verifica...' : 'Verifica OTP'}
                  </button>
                  <button
                    onClick={() => { setOtpSent(false); setOtp('') }}
                    className="btn btn-ghost w-full mt-2 text-sm"
                  >
                    Cambia numero
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-white text-opacity-90">
            Non hai un account?{' '}
            <Link to="/register" className="text-white font-semibold underline hover:no-underline">
              Registrati
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center text-white text-opacity-75 text-xs">
          <p>Accedendo accetti i nostri Termini e la Privacy Policy</p>
        </div>
      </div>

      {/* Recaptcha container for phone auth */}
      <div id="recaptcha-container"></div>
    </div>
  )
}
