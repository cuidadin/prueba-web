import { useState } from 'react'
import { Modal } from './Modal'

export default function EntradaModal({ fecha, entrada, onSave, onClose, onDelete, adminMode, usuarios }) {
  const [horas, setHoras] = useState(entrada?.horas || 1)
  const [tipo, setTipo] = useState(entrada?.tipo || 'sindical')
  const [desc, setDesc] = useState(entrada?.descripcion || '')
  const [fechaEdit, setFechaEdit] = useState(entrada?.fecha || fecha || '')
  const [userId, setUserId] = useState(entrada?.usuario_id || '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      await onSave({ fecha: fechaEdit, horas: parseFloat(horas), tipo, descripcion: desc, usuario_id: adminMode ? userId : undefined })
      onClose()
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar esta entrada?')) return
    await onDelete()
    onClose()
  }

  return (
    <Modal title={entrada ? 'Editar entrada' : `Nueva entrada${fecha ? ' — ' + fecha : ''}`} onClose={onClose}>
      {adminMode && usuarios && (
        <div className="form-group">
          <label>Delegado</label>
          <select value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {usuarios.filter(u => u.activo).map(u => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </div>
      )}
      {(adminMode || !fecha) && (
        <div className="form-group">
          <label>Fecha</label>
          <input type="date" value={fechaEdit} onChange={e => setFechaEdit(e.target.value)} />
        </div>
      )}
      <div className="form-group">
        <label>Tipo de hora</label>
        <select value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="sindical">Sindical — descuenta de la bolsa</option>
          <option value="empresa">Empresa — no descuenta</option>
          <option value="compensacion">Compensación — no descuenta</option>
        </select>
      </div>
      <div className="form-group">
        <label>Número de horas</label>
        <input type="number" min="0.5" max="24" step="0.5" value={horas} onChange={e => setHoras(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Descripción (opcional)</label>
        <textarea rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Reunión, motivo, detalles..." />
      </div>
      <div className="modal-actions">
        {entrada && (
          <button className="btn btn-danger btn-sm" onClick={handleDelete} style={{ marginRight: 'auto' }}>
            Eliminar
          </button>
        )}
        <button className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  )
}
