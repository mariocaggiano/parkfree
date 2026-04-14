import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LogOut, CreditCard, Edit2, Trash2, Plus } from 'lucide-react'
import { PaymentMethod } from '../types'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: 'pm1',
      userId: 'user1',
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
  ])

  const [showAddPayment, setShowAddPayment] = useState(false)

  const handleAddPaymentMethod = async () => {
    // Stripe tokenization: card data is handled securely by Stripe.js
    // Never store raw card numbers, CVV, or expiry in component state
    try {
      // In production: use Stripe Elements or redirect to Stripe Checkout
      // const { error, paymentMethod } = await stripe.createPaymentMethod({...})
      // Then call POST /api/payments/methods with paymentMethod.id

      // Demo: simulate adding a payment method
      const newPaymentMethod: PaymentMethod = {
        id: Date.now().toString(),
        userId: user?.uid || '',
        type: 'card',
        last4: '4242',
        brand: 'Visa',
        expiryMonth: 12,
        expiryYear: 2028,
        isDefault: paymentMethods.length === 0,
        createdAt: new Date().toISOString(),
      }

      setPaymentMethods([...paymentMethods, newPaymentMethod])
      setShowAddPayment(false)
    } catch (error) {
      console.error('Errore aggiunta metodo di pagamento:', error)
    }
  }

  const handleDeletePaymentMethod = (id: string) => {
    if (window.confirm('Vuoi eliminare questo metodo di pagamento?')) {
      setPaymentMethods(paymentMethods.filter((pm) => pm.id !== id))
    }
  }

  const handleSetDefault = (id: string) => {
    setPaymentMethods(
      paymentMethods.map((pm) => ({
        ...pm,
        isDefault: pm.id === id,
      }))
    )
  }

  const handleLogout = async () => {
    if (window.confirm('Vuoi disconnetterti?')) {
      await signOut()
      navigate('/login')
    }
  }

  return (
    <main className="bg-light min-h-screen">
      <div className="container py-6">
        {/* Header */}
        <h1 className="text-3xl font-bold text-dark mb-8">Profilo</h1>

        {/* User Info Card */}
        <div className="card mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-dark mb-1">
                {user?.displayName || 'Utente'}
              </h2>
              <p className="text-gray text-sm">{user?.email}</p>
              {user?.phoneNumber && (
                <p className="text-gray text-sm">{user.phoneNumber}</p>
              )}
            </div>
            <button className="btn btn-icon btn-secondary">
              <Edit2 size={20} />
            </button>
          </div>

          <div className="border-t border-light-secondary pt-6 flex gap-3">
            <button className="btn btn-secondary flex-1">Modifica Profilo</button>
            <button className="btn btn-secondary flex-1">Cambia Password</button>
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-dark flex items-center gap-2">
              <CreditCard size={24} />
              Metodi di Pagamento
            </h3>
            {!showAddPayment && (
              <button
                onClick={() => setShowAddPayment(true)}
                className="btn btn-accent btn-sm gap-1"
              >
                <Plus size={18} />
                Aggiungi
              </button>
            )}
          </div>

          {/* Add Payment Method - Stripe Secure Flow */}
          {showAddPayment && (
            <div className="card mb-6">
              <h4 className="font-bold text-dark mb-4">Aggiungi Carta di Credito</h4>
              <p className="text-gray text-sm mb-4">
                I dati della carta sono gestiti in modo sicuro da Stripe.
                ParkFree non memorizza mai i dati della tua carta.
              </p>

              {/* In produzione qui va il componente Stripe Elements:
                  <CardElement /> dal pacchetto @stripe/react-stripe-js */}
              <div className="form-input mb-4 p-4 bg-light rounded-lg text-center text-gray text-sm">
                Stripe Card Element (si attiva con le chiavi API configurate)
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddPayment(false)}
                  className="btn btn-secondary flex-1"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleAddPaymentMethod}
                  className="btn btn-primary flex-1"
                >
                  Aggiungi Carta
                </button>
              </div>
            </div>
          )}

          {/* Payment Methods List */}
          {paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div key={method.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <CreditCard size={24} className="text-primary" />
                      <div>
                        <h4 className="font-bold text-dark">
                          {method.brand} ••••{method.last4}
                        </h4>
                        <p className="text-gray text-xs">
                          Scadenza {method.expiryMonth}/{method.expiryYear}
                        </p>
                      </div>
                    </div>
                    {method.isDefault && (
                      <span className="badge badge-accent text-xs">Predefinito</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!method.isDefault && (
                      <button
                        onClick={() => handleSetDefault(method.id)}
                        className="btn btn-secondary btn-sm flex-1"
                      >
                        Imposta come Predefinito
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePaymentMethod(method.id)}
                      className="btn btn-icon btn-secondary"
                      title="Elimina"
                    >
                      <Trash2 size={20} className="text-error" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <CreditCard size={32} className="text-gray mx-auto mb-3" />
              <p className="text-gray text-sm">
                Nessun metodo di pagamento. Aggiungi una carta di credito.
              </p>
            </div>
          )}
        </div>

        {/* Settings Section */}
        <div className="card mb-8">
          <h3 className="text-xl font-bold text-dark mb-4">Impostazioni</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 hover:bg-light rounded-lg transition">
              <p className="font-semibold text-dark">Notifiche</p>
              <p className="text-gray text-xs">Gestisci le preferenze di notifica</p>
            </button>
            <button className="w-full text-left p-3 hover:bg-light rounded-lg transition">
              <p className="font-semibold text-dark">Privacy e Sicurezza</p>
              <p className="text-gray text-xs">Controlla come vengono utilizzati i tuoi dati</p>
            </button>
            <button className="w-full text-left p-3 hover:bg-light rounded-lg transition">
              <p className="font-semibold text-dark">Aiuto e Supporto</p>
              <p className="text-gray text-xs">Contatta il nostro team di supporto</p>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card border-2 border-error border-opacity-20 bg-error bg-opacity-5 mb-8">
          <h3 className="text-lg font-bold text-error mb-4">Zone Pericolose</h3>
          <button
            onClick={handleLogout}
            className="w-full btn btn-secondary gap-2 text-error border-error border-opacity-20 hover:bg-error hover:bg-opacity-10"
          >
            <LogOut size={20} />
            Disconnetti
          </button>
        </div>

        {/* App Info */}
        <div className="text-center text-gray text-xs pb-8">
          <p>ParkFree v1.0.0</p>
          <p className="mt-2">Fatto con ❤️ in Italia</p>
        </div>
      </div>
    </main>
  )
}
