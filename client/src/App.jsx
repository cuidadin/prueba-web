import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import PortalDelegado from './pages/PortalDelegado'
import PortalAdmin from './pages/PortalAdmin'

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text3)' }}>Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.rol !== role) return <Navigate to={user.rol === 'admin' ? '/admin' : '/delegado'} replace />
  return children
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.rol === 'admin' ? '/admin' : '/delegado'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/delegado" element={
            <PrivateRoute>
              <PortalDelegado />
            </PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute role="admin">
              <PortalAdmin />
            </PrivateRoute>
          } />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
