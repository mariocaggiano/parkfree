import { useState } from 'react'
import { Trash2, Plus, Edit2 } from 'lucide-react'
import { Vehicle } from '../types'
import { formatPlate } from '../utils/formatters'

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    {
      id: '1',
      userId: 'user1',
      licensePlate: 'MI 123AB',
      alias: 'La mia auto',
      defaultBadge: 'standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ])

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    licensePlate: '',
    alias: '',
    defaultBadge: 'residenti',
  })

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.licensePlate.trim()) {
      alert('Inserisci la targa')
      return
    }

    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      userId: '',
      licensePlate: formData.licensePlate,
      alias: formData.alias || undefined,
      defaultBadge: formData.defaultBadge,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setVehicles([...vehicles, newVehicle])
    setFormData({ licensePlate: '', alias: '', defaultBadge: 'residenti' })
    setShowAddForm(false)
  }

  const handleUpdateVehicle = (e: React.FormEvent, id: string) => {
    e.preventDefault()

    setVehicles(
      vehicles.map((v) =>
        v.id === id
          ? {
              ...v,
              licensePlate: formData.licensePlate,
              alias: formData.alias || undefined,
              defaultBadge: formData.defaultBadge,
              updatedAt: new Date().toISOString(),
            }
          : v
      )
    )

    setEditingId(null)
    setFormData({ licensePlate: '', alias: '', defaultBadge: 'residenti' })
  }

  const handleDeleteVehicle = (id: string) => {
    if (window.confirm('Vuoi eliminare questo veicolo?')) {
      setVehicles(vehicles.filter((v) => v.id !== id))
    }
  }

  const handleEditClick = (vehicle: Vehicle) => {
    setEditingId(vehicle.id)
    setFormData({
      licensePlate: vehicle.licensePlate,
      alias: vehicle.alias || '',
      defaultBadge: vehicle.defaultBadge,
    })
  }

  return (
    <main className="bg-light min-h-screen">
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-dark">I Miei Veicoli</h1>
            <p className="text-gray text-sm mt-1">
              Gestisci i tuoi veicoli per il parcheggio
            </p>
          </div>
          {!showAddForm && editingId === null && (
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-accent gap-2"
            >
              <Plus size={20} />
              Aggiungi
            </button>
          )}
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingId) && (
          <form
            onSubmit={(e) =>
              editingId
                ? handleUpdateVehicle(e, editingId)
                : handleAddVehicle(e)
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
                    setFormData({
                      ...formData,
                      licensePlate: e.target.value.toUpperCase(),
                    })
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
                  onChange={(e) =>
                    setFormData({ ...formData, alias: e.target.value })
                  }
                  placeholder="Es. Macchina principale"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo di Badge</label>
                <select
                  value={formData.defaultBadge}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultBadge: e.target.value })
                  }
                  className="form-select"
                >
                  <option value="residenti">Residenti</option>
                  <option value="non_residenti">Non Residenti</option>
                  <option value="ospiti">Ospiti</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setEditingId(null)
                  setFormData({ licensePlate: '', alias: '', defaultBadge: 'residenti' })
                }}
                className="btn btn-secondary flex-1"
              >
                Annulla
              </button>
              <button type="submit" className="btn btn-primary flex-1">
                {editingId ? 'Salva Modifiche' : 'Aggiungi Veicolo'}
              </button>
            </div>
          </form>
        )}

        {/* Vehicles List */}
        {vehicles.length > 0 ? (
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-dark">
                      {formatPlate(vehicle.licensePlate)}
                    </h3>
                    {vehicle.alias && (
                      <p className="text-gray text-sm">{vehicle.alias}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="badge badge-primary text-xs">
                        {vehicle.defaultBadge}
                      </span>
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
            <h3 className="text-lg font-semibold text-dark mb-2">
              Nessun veicolo
            </h3>
            <p className="text-gray text-sm mb-6">
              Aggiungi il tuo primo veicolo per iniziare a parcheggiare
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn btn-primary gap-2"
            >
              <Plus size={20} />
              Aggiungi Veicolo
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
