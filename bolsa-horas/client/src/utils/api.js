const BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    return
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Error del servidor')
  return data
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  // Usuarios
  getUsuarios: () => request('/usuarios'),
  createUsuario: (data) => request('/usuarios', { method: 'POST', body: JSON.stringify(data) }),
  updateUsuario: (id, data) => request(`/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleUsuario: (id) => request(`/usuarios/${id}/toggle`, { method: 'PATCH' }),

  // Configuracion
  getConfig: () => request('/configuracion'),
  setConfig: (data) => request('/configuracion', { method: 'PUT', body: JSON.stringify(data) }),

  // Entradas
  getEntradas: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== null)))
    return request(`/entradas?${q}`)
  },
  getSaldo: (userId) => request(`/entradas/saldo/${userId}`),
  createEntrada: (data) => request('/entradas', { method: 'POST', body: JSON.stringify(data) }),
  updateEntrada: (id, data) => request(`/entradas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEntrada: (id) => request(`/entradas/${id}`, { method: 'DELETE' }),

  exportUrl: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v]) => v !== undefined && v !== null && v !== '-1')))
    return `${BASE}/entradas/export?${q}&token=${getToken()}`
  }
}
