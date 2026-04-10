import { useState, useEffect, useCallback } from 'react'
import Topbar from '../components/Topbar'
import Calendario, { MESES } from '../components/Calendario'
import EntradaModal from '../components/EntradaModal'
import { Modal } from '../components/Modal'
import { Toast, useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'

const TABS = [
  { id: 'horas', label: 'Horas solicitadas' },
  { id: 'delegados', label: 'Estado delegados' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'config', label: 'Configuración' },
]
const YEARS = [2024, 2025, 2026, 2027]

function UserModal({ usuario, onSave, onClose }) {
  const [nombre, setNombre] = useState(usuario?.nombre || '')
  const [email, setEmail] = useState(usuario?.email || '')
  const [pass, setPass] = useState('')
  const [rol, setRol] = useState(usuario?.rol || 'delegado')
  const [horas, setHoras] = useState(usuario?.horas_mensuales || 20)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!nombre || !email || (!usuario && !pass)) { alert('Nombre, email y contraseña son obligatorios'); return }
    setLoading(true)
    try {
      await onSave({ nombre, email, password: pass || undefined, rol, horas_mensuales: rol === 'delegado' || rol === 'admin' ? Number(horas) : 0 })
      onClose()
    } catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  return (
    <Modal title={usuario ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose}>
      <div className="form-group">
        <label>Nombre completo</label>
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre Apellido" />
      </div>
      <div className="form-group">
        <label>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@empresa.com" />
      </div>
      <div className="form-group">
        <label>{usuario ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña'}</label>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Rol</label>
        <select value={rol} onChange={e => setRol(e.target.value)}>
          <option value="delegado">Delegado</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <div className="form-group">
        <label>Horas mensuales asignadas</label>
        <input type="number" min="0" max="500" value={horas} onChange={e => setHoras(e.target.value)} />
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Aplica tanto a delegados como a administradores con crédito sindical</div>
      </div>
      <div className="modal-actions">
        <button className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  )
}

function ConfigPanel({ onSaved }) {
  const [config, setConfig] = useState({})
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [horasExtra, setHorasExtra] = useState({})
  const { toast, show } = useToast()

  useEffect(() => {
    Promise.all([api.getConfig(), api.getUsuarios()]).then(([cfg, us]) => {
      setConfig(cfg)
      setUsuarios(us.filter(u => u.activo))
      setLoading(false)
    })
  }, [])

  async function handleSaveUser(id, horas) {
    setSaving(true)
    try {
      await api.updateUsuario(id, { horas_mensuales: Number(horas) })
      show('Horas actualizadas')
      if (onSaved) onSaved()
    } finally { setSaving(false) }
  }

  if (loading) return <div className="empty">Cargando...</div>

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ fontWeight: 600, marginBottom: 16 }}>Crédito mensual por delegado / admin</div>
        <table>
          <thead><tr><th>Nombre</th><th>Rol</th><th>Horas/mes actuales</th><th>Nueva asignación</th><th></th></tr></thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar">{u.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
                    {u.nombre}
                  </div>
                </td>
                <td><span className={`chip chip-${u.rol}`}>{u.rol}</span></td>
                <td><strong>{u.horas_mensuales}h</strong></td>
                <td>
                  <input
                    type="number" min="0" max="500" style={{ width: 80 }}
                    placeholder={u.horas_mensuales}
                    value={horasExtra[u.id] ?? ''}
                    onChange={e => setHorasExtra(prev => ({ ...prev, [u.id]: e.target.value }))}
                  />
                </td>
                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!horasExtra[u.id] || saving}
                    onClick={() => handleSaveUser(u.id, horasExtra[u.id])}
                  >
                    Actualizar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Toast message={toast} />
    </div>
  )
}

export default function PortalAdmin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('horas')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterMonth, setFilterMonth] = useState(-1)
  const [filterUser, setFilterUser] = useState('')
  const [entradas, setEntradas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [saldos, setSaldos] = useState({})
  const [editEntrada, setEditEntrada] = useState(null)
  const [userModal, setUserModal] = useState(null) // null | 'new' | {user}
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calEntradas, setCalEntradas] = useState([])
  const [calUser, setCalUser] = useState('')
  const [calModal, setCalModal] = useState(null)
  const { toast, show } = useToast()

  const loadUsuarios = useCallback(async () => {
    const data = await api.getUsuarios()
    setUsuarios(data)
    // Load saldos for all delegados/admins with hours
    const withHours = data.filter(u => u.horas_mensuales > 0 && u.activo)
    const saldoResults = await Promise.all(withHours.map(u => api.getSaldo(u.id).then(s => [u.id, s])))
    setSaldos(Object.fromEntries(saldoResults))
  }, [])

  const loadEntradas = useCallback(async () => {
    const data = await api.getEntradas({
      year: filterYear,
      month: filterMonth === -1 ? undefined : filterMonth,
      usuario_id: filterUser || undefined
    })
    setEntradas(data)
  }, [filterYear, filterMonth, filterUser])

  const loadCalEntradas = useCallback(async () => {
    const data = await api.getEntradas({
      year: calYear, month: calMonth,
      usuario_id: calUser || undefined
    })
    setCalEntradas(data)
  }, [calYear, calMonth, calUser])

  useEffect(() => { loadUsuarios() }, [loadUsuarios])
  useEffect(() => { if (tab === 'horas' || tab === 'delegados') loadEntradas() }, [tab, loadEntradas])
  useEffect(() => { if (tab === 'calendario') loadCalEntradas() }, [tab, loadCalEntradas])

  async function handleSaveEntrada(data) {
    if (editEntrada?.id) {
      await api.updateEntrada(editEntrada.id, data)
      show('Entrada actualizada')
    } else {
      await api.createEntrada(data)
      show('Entrada registrada')
    }
    loadEntradas(); loadCalEntradas(); loadUsuarios()
  }

  async function handleDeleteEntrada() {
    await api.deleteEntrada(editEntrada.id)
    show('Entrada eliminada')
    setEditEntrada(null); loadEntradas(); loadCalEntradas(); loadUsuarios()
  }

  async function handleSaveUser(data) {
    if (userModal?.id) {
      await api.updateUsuario(userModal.id, data)
      show('Usuario actualizado')
    } else {
      await api.createUsuario(data)
      show('Usuario creado')
    }
    loadUsuarios()
  }

  async function toggleUser(id) {
    await api.toggleUsuario(id)
    loadUsuarios()
  }

  const now = new Date()
  const totalSindicalesMes = entradas.filter(e => e.tipo === 'sindical').reduce((s, e) => s + e.horas, 0)
  const delegadosActivos = usuarios.filter(u => u.activo && u.horas_mensuales > 0)

  function exportCsv() {
    const url = api.exportUrl({
      year: filterYear,
      month: filterMonth === -1 ? undefined : filterMonth,
      usuario_id: filterUser || undefined
    })
    window.open(url, '_blank')
  }

  return (
    <div>
      <Topbar tabs={TABS} activeTab={tab} onTabChange={setTab} />
      <div className="page">

        {/* Metrics always visible */}
        <div className="grid-4" style={{ marginBottom: 20 }}>
          <div className="metric">
            <div className="metric-label">Delegados activos</div>
            <div className="metric-value">{delegadosActivos.length}</div>
            <div className="metric-sub">Con crédito asignado</div>
          </div>
          <div className="metric">
            <div className="metric-label">Pool mensual total</div>
            <div className="metric-value" style={{ color: 'var(--accent)' }}>
              {delegadosActivos.reduce((s, u) => s + u.horas_mensuales, 0)}h
            </div>
            <div className="metric-sub">Suma de créditos</div>
          </div>
          <div className="metric">
            <div className="metric-label">H. sindicales {MESES[now.getMonth()]}</div>
            <div className="metric-value">{totalSindicalesMes}h</div>
            <div className="metric-sub">Filtro actual</div>
          </div>
          <div className="metric">
            <div className="metric-label">Total entradas</div>
            <div className="metric-value">{entradas.length}</div>
            <div className="metric-sub">Filtro actual</div>
          </div>
        </div>

        {/* HORAS SOLICITADAS */}
        {tab === 'horas' && (
          <div className="card">
            <div className="row" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} style={{ width: 'auto' }}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} style={{ width: 'auto' }}>
                <option value={-1}>Todos los meses</option>
                {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ width: 'auto' }}>
                <option value="">Todos los delegados</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
              <div style={{ flex: 1 }} />
              <button className="btn btn-sm btn-primary" onClick={exportCsv}>Exportar Excel/CSV</button>
              <button className="btn btn-sm" onClick={() => setEditEntrada({})}>+ Añadir entrada</button>
            </div>
            {entradas.length === 0 ? (
              <div className="empty"><div className="empty-icon">📋</div>Sin registros para los filtros seleccionados</div>
            ) : (
              <table>
                <thead><tr><th>Delegado</th><th>Fecha</th><th>Horas</th><th>Tipo</th><th>Descripción</th><th></th></tr></thead>
                <tbody>
                  {entradas.map(e => (
                    <tr key={e.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar">{(e.usuario_nombre || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
                          {e.usuario_nombre}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{e.fecha}</td>
                      <td><strong>{e.horas}h</strong></td>
                      <td><span className={`chip chip-${e.tipo}`}>{e.tipo}</span></td>
                      <td style={{ color: 'var(--text2)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.descripcion || '—'}</td>
                      <td><button className="btn btn-sm btn-ghost" onClick={() => setEditEntrada(e)}>Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ESTADO DELEGADOS */}
        {tab === 'delegados' && (
          <div className="card">
            <table>
              <thead><tr><th>Delegado</th><th>Rol</th><th>Crédito/mes</th><th>Saldo acumulado</th><th>Usadas este mes</th><th>Estado</th></tr></thead>
              <tbody>
                {usuarios.map(u => {
                  const s = saldos[u.id] || { saldo: 0, horas_mensuales: u.horas_mensuales }
                  const usadasMes = entradas.filter(e => e.usuario_id === u.id && e.tipo === 'sindical').reduce((sum, e) => sum + e.horas, 0)
                  const pct = u.horas_mensuales ? Math.min(100, Math.round(usadasMes / u.horas_mensuales * 100)) : 0
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar">{u.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
                          <div>
                            <div>{u.nombre}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`chip chip-${u.rol}`}>{u.rol}</span></td>
                      <td>{u.horas_mensuales}h</td>
                      <td><span style={{ fontWeight: 600, color: 'var(--accent)' }}>{s.saldo}h</span></td>
                      <td>
                        <div>{usadasMes}h</div>
                        <div className="progress-bar" style={{ width: 100 }}>
                          <div className={`progress-fill${pct > 80 ? ' warn' : ''}${pct >= 100 ? ' danger' : ''}`} style={{ width: pct + '%' }} />
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: u.activo ? 'var(--green-light)' : 'var(--red-light)', color: u.activo ? 'var(--green)' : 'var(--red)' }}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* CALENDARIO */}
        {tab === 'calendario' && (
          <div className="card">
            <div className="row" style={{ marginBottom: 16 }}>
              <select value={calUser} onChange={e => setCalUser(e.target.value)} style={{ width: 'auto' }}>
                <option value="">Todos los delegados</option>
                {usuarios.filter(u => u.activo).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </select>
            </div>
            <Calendario
              year={calYear} month={calMonth} entradas={calEntradas}
              onPrev={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
              onNext={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
              onDayClick={(date, dayEntries) => setCalModal({ fecha: date, entrada: dayEntries?.[0] || null })}
            />
          </div>
        )}

        {/* USUARIOS */}
        {tab === 'usuarios' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setUserModal('new')}>+ Nuevo usuario</button>
            </div>
            <table>
              <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Horas/mes</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar">{u.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
                        {u.nombre}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text2)', fontSize: 12 }}>{u.email}</td>
                    <td><span className={`chip chip-${u.rol}`}>{u.rol}</span></td>
                    <td>{u.horas_mensuales}h</td>
                    <td>
                      <button
                        className="btn btn-sm"
                        style={{ background: u.activo ? 'var(--red-light)' : 'var(--green-light)', color: u.activo ? 'var(--red)' : 'var(--green)', borderColor: 'transparent' }}
                        onClick={() => toggleUser(u.id)}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                    <td><button className="btn btn-sm btn-ghost" onClick={() => setUserModal(u)}>Editar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CONFIGURACIÓN */}
        {tab === 'config' && <ConfigPanel onSaved={loadUsuarios} />}
      </div>

      {/* Modals */}
      {editEntrada !== null && (
        <EntradaModal
          fecha={editEntrada.fecha}
          entrada={editEntrada.id ? editEntrada : null}
          adminMode={true}
          usuarios={usuarios}
          onSave={handleSaveEntrada}
          onDelete={handleDeleteEntrada}
          onClose={() => setEditEntrada(null)}
        />
      )}
      {calModal && (
        <EntradaModal
          fecha={calModal.fecha}
          entrada={calModal.entrada}
          adminMode={true}
          usuarios={usuarios}
          onSave={async (data) => { await handleSaveEntrada({ ...data, usuario_id: calModal.entrada?.usuario_id || data.usuario_id }); setCalModal(null) }}
          onDelete={async () => { await api.deleteEntrada(calModal.entrada.id); show('Eliminado'); setCalModal(null); loadCalEntradas() }}
          onClose={() => setCalModal(null)}
        />
      )}
      {userModal && (
        <UserModal
          usuario={userModal === 'new' ? null : userModal}
          onSave={handleSaveUser}
          onClose={() => setUserModal(null)}
        />
      )}
      <Toast message={toast} />
    </div>
  )
}
