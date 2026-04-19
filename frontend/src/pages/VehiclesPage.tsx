import { useState, useEffect } from 'react'
import { Trash2, Plus, Edit2, Loader } from 'lucide-react'
import { Vehicle } from '../types'
import { formatPlate } from '../utils/formatters'
import { vehiclesService } from '../services/firestore'
import { useAuth } from '../hooks/useAuth'

export default function VehiclesPage() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    licensePlate: '',
    alias: '',
    defaultBadge: 'residenti',
    color: '',
  })

  useEffect(() => {
    if (!user) return
    setLoading(true)
    vehiclesService
      .getAll()
      .then(setVehicles)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  const resetForm = () => {
    setFormData({ licensePlate: '', alias: '', defaultBadge: 'residenti', color: '' })
    setShowAddForm(false)
    setEditingId(null)
  }

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.licensePlate.trim()) return
    setSaving(true)
    try {
      const newVehicle = await vehiclesService.add({
        licensePlate: formData.licensePlate.toUpperCase(),
        alias: formData.alias || undefined,
        defaultBadge: formData.defaultBadge,
        color: formData.color || undefined,
      })
      setVehicles((prev) => [...prev, newVehicle])
      resetForm()
    } catch (err) {
      console.error(err)
      alert('Errore durante il salvataggio del veicolo')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateVehicle = async (e: React.FormEvent, id: string) => {
    e.preventDefault()
    setSaving(true)
    try {
      await vehiclesService.update(id, {
        licensePlate: formData.licensePlate.toUpperCase(),
        alias: formData.alias || undefined,
        defaultBadge: formData.defaultBadge,
        color: formData.color || undefined,
      })
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === id
            ? {
                ...v,
                licensePlate: formData.licensePlate.toUpperCase(),
                alias: formData.alias || undefined,
                defaultBadge: formData.defaultBadge,
                color: formData.color || undefined,
                updatedAt: new Date().toISOString(),
              }
            : v
        )
      )
      resetForm()
    } catch (err) {
      console.error(err)
      alert("Errore durante l'aggiornamento del veicolo")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm('Vuoi eliminare questo veicolo?')) return
    try {
      await vehiclesService.delete(id)
      setVehicles((prev) => prev.filter((v) => v.id !== id))
    } catch (err) {
      console.error(err)
      alert("Errore durante l'eliminazione del veicolo")
    }
  }

  const handleEditClick = (vehicle: Vehicle) => {
    setEditingId(vehicle.id)
    setFormData({
      licensePlate: vehicle.licensePlate,
      alias: vehicle.alias || '',
      defaultBadge: vehicle.defaultBadge,
      color: vehicle.color || '',
    })
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-dark">I Miei Veicoli</h1>
            <p className="text-gray text-sm mt-1">Gestisci i tuoi veicoli per il parcheggio</p>
          </div>
          {!showAddForm && editingId === null && (
            <button onClick={() => setShowAddForm(true)} className="btn btn-accent gap-2">
              <Plus size={20} /> Aggiungi
            </button>
          )}
        </div>

        {(showAddForm || editingId) && (
          <form
            onSubmit={(e) =>
              editingId ? handleUpdateVehicle(e, editingId) : handleAddVehicle(e)
            }
            className="card mb-8"
          >
            <h2 className="text-xl font-bold mb-4 text-dark">
              {editingId ? 'Modifica Veicolo' : 'Aggiungi Nuovo Veicolo'}
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="form-group">
                <label className="form-label">Targa *</label>
                <input
                  type="text"
                  value={formData.licensePlate}
                  onChange={(e) =>
                    setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })
                  }
                  placeholder="AA123BB"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Soprannome (Opzionale)</label>
                <input
                  type="text"
                  value={formData.alias}
                  onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                  placeholder="Es. Macchina principale"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Colore (Opzionale)</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="Es. Blu metallizzato"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo di Badge</label>
                <select
                  value={formData.defaultBadge}
                  onChange={(e) => setFormData({ ...formData, defaultBadge: e.target.value })}
                  className="form-select"
                >
                  <option value="residenti">Residenti</option>
                  <option value="non_residenti">Non Residenti</option>
                  <option value="ospiti">Ospiti</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={resetForm} className="btn btn-secondary flex-1">
                Annulla
              </button>
              <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
                {saving ? (
                  <Loader size={18} className="animate-spin" />
                ) : editingId ? (
                  'Salva Modifiche'
                ) : (
                  'Aggiungi Veicolo'
                )}
              </button>
            </div>
          </form>
        )}

        {vehicles.length > 0 ? (
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-dark">
                      {formatPlate(vehicle.licensePlate)}
                    </h3>
                    {vehicle.alias && <p className="text-gray text-sm">{vehicle.alias}</p>}
                    {vehicle.color && <p className="text-gray text-xs">{vehicle.color}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="badge badge-primary text-xs">{vehicle.defaultBadge}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEditClick(vehicle)}
                      className="btn btn-icon btn-secondary"
                      title="Modifica"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(vehicle.id)}
                      className="btn btn-icon btn-secondary"
                      title="Elimina"
                    >
                      <Trash2 size={20} className="text-error" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="text-gray-light mb-3 text-4xl">🚗</div>
            <h3 className="text-lg font-semibold text-dark mb-2">Nessun veicolo</h3>
            <p className="text-gray text-sm mb-6">
              Aggiungi il tuo primo veicolo per iniziare a parcheggiare
            </p>
            <button onClick={() => setShowAddForm(true)} className="btn btn-primary gap-2">
              <Plus size={20} /> Aggiungi Veicolo
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
