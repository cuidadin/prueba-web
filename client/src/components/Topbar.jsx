import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ tabs, activeTab, onTabChange }) {
  const { user, logout } = useAuth()
  const nav = useNavigate()

  function handleLogout() {
    logout()
    nav('/login')
  }

  const initials = user?.nombre?.split(' ').map(w => w[0]).slice(0, 2).join('') || '?'

  return (
    <div className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div className="logo">
          <div className="logo-dot" />
          Bolsa Horas
        </div>
        {tabs && (
          <nav style={{ display: 'flex', gap: 2 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                style={{
                  border: 'none', background: 'none', padding: '6px 12px',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  borderRadius: 8,
                  color: activeTab === t.id ? 'var(--accent)' : 'var(--text2)',
                  background: activeTab === t.id ? 'var(--accent-light)' : 'transparent',
                  transition: 'all 0.15s'
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{user?.nombre}</span>
        <div className="avatar" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{initials}</div>
        <button className="btn btn-sm btn-ghost" onClick={handleLogout}>Salir</button>
      </div>
    </div>
  )
}
