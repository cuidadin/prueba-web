import { useState, useEffect, useCallback } from 'react'
import Topbar from '../components/Topbar'
import Calendario, { MESES } from '../components/Calendario'
import EntradaModal from '../components/EntradaModal'
import { Toast, useToast } from '../components/Toast'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'

const TABS = [
  { id: 'calendario', label: 'Calendario' },
  { id: 'resumen', label: 'Mis horas' },
]

const YEARS = [2024, 2025, 2026, 2027]

export default function PortalDelegado() {
  const { user } = useAuth()
  const [tab, setTab] = useState('calendario')
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [entradas, setEntradas] = useState([])
  const [saldo, setSaldo] = useState({ saldo: 0, horas_mensuales: 0 })
  const [modal, setModal] = useState(null) // { fecha, entrada? }
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterMonth, setFilterMonth] = useState(-1)
  const [resumenData, setResumenData] = useState([])
  const { toast, show } = useToast()

  const loadEntradas = useCallback(async () => {
    const data = await api.getEntradas({ year: calYear, month: calMonth })
    setEntradas(data)
  }, [calYear, calMonth])

  const loadSaldo = useCallback(async () => {
    const data = await api.getSaldo(user.id)
    setSaldo(data)
  }, [user.id])

  const loadResumen = useCallback(async () => {
    const data = await api.getEntradas({ year: filterYear, month: filterMonth === -1 ? undefined : filterMonth })
    setResumenData(data)
  }, [filterYear, filterMonth])

  useEffect(() => { loadEntradas(); loadSaldo() }, [loadEntradas, loadSaldo])
  useEffect(() => { if (tab === 'resumen') loadResumen() }, [tab, loadResumen])

  function handlePrev() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  function handleNext() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  function handleDayClick(date, dayEntries) {
    if (dayEntries?.length === 1) {
      setModal({ fecha: date, entrada: dayEntries[0] })
    } else {
      setModal({ fecha: date, entrada: null })
    }
  }

  async function handleSave(data) {
    if (modal.entrada) {
      await api.updateEntrada(modal.entrada.id, data)
      show('Entrada actualizada')
    } else {
      await api.createEntrada({ ...data, fecha: modal.fecha })
      show('Entrada registrada')
    }
    await loadEntradas()
    await loadSaldo()
  }

  async function handleDelete() {
    await api.deleteEntrada(modal.entrada.id)
    show('Entrada eliminada')
    await loadEntradas()
    await loadSaldo()
  }

  const now = new Date()
  const usadasMes = entradas.filter(e => e.tipo === 'sindical').reduce((s, e) => s + e.horas, 0)
  const pct = saldo.horas_mensuales ? Math.min(100, Math.round(usadasMes / saldo.horas_mensuales * 100)) : 0

  return (
    <div>
      <Topbar tabs={TABS} activeTab={tab} onTabChange={setTab} />
      <div className="page">
        <div className="grid-4" style={{ marginBottom: 20 }}>
          <div className="metric">
            <div className="metric-label">Saldo acumulado</div>
            <div className="metric-value" style={{ color: 'var(--accent)' }}>{saldo.saldo}h</div>
            <div className="metric-sub">Horas disponibles totales</div>
          </div>
          <div className="metric">
            <div className="metric-label">Crédito mensual</div>
            <div className="metric-value">{saldo.horas_mensuales}h</div>
            <div className="metric-sub">Asignado por mes</div>
          </div>
          <div className="metric">
            <div className="metric-label">Usadas {MESES[calMonth]}</div>
            <div className="metric-value">{usadasMes}h</div>
            <div className="progress-bar">
              <div className={`progress-fill${pct > 80 ? ' warn' : ''}${pct >= 100 ? ' danger' : ''}`} style={{ width: pct + '%' }} />
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">Restantes mes actual</div>
            <div className="metric-value">{Math.max(0, saldo.horas_mensuales - usadasMes)}h</div>
            <div className="metric-sub">Sin contar acumulado</div>
          </div>
        </div>

        {tab === 'calendario' && (
          <div className="card">
            <Calendario
              year={calYear} month={calMonth} entradas={entradas}
              onPrev={handlePrev} onNext={handleNext}
              onDayClick={handleDayClick}
            />
          </div>
        )}

        {tab === 'resumen' && (
          <div className="card">
            <div className="row" style={{ marginBottom: 16 }}>
              <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} style={{ width: 'auto' }}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} style={{ width: 'auto' }}>
                <option value={-1}>Todos los meses</option>
                {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            {resumenData.length === 0 ? (
              <div className="empty"><div className="empty-icon">📋</div>Sin registros para este período</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Horas</th><th>Tipo</th><th>Descripción</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {resumenData.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: 12 }}>{e.fecha}</td>
                      <td><strong>{e.horas}h</strong></td>
                      <td><span className={`chip chip-${e.tipo}`}>{e.tipo}</span></td>
                      <td style={{ color: 'var(--text2)' }}>{e.descripcion || '—'}</td>
                      <td>
                        <button className="btn btn-sm btn-ghost" onClick={() => setModal({ fecha: e.fecha, entrada: e })}>Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {modal && (
        <EntradaModal
          fecha={modal.fecha}
          entrada={modal.entrada}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
      <Toast message={toast} />
    </div>
  )
}
