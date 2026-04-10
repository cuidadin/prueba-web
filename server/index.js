const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'bolsa-horas-secret-2024-change-in-production';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'bolsa_horas.db');

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
}

let db;
function getDb() {
  if (!db) db = new Database(DB_PATH);
  return db;
}

// ── Auth middleware ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}
function adminOnly(req, res, next) {
  if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  next();
}

// ── Auth routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = getDb().prepare('SELECT * FROM usuarios WHERE email = ? AND activo = 1').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = jwt.sign({ id: user.id, rol: user.rol, nombre: user.nombre, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, horas_mensuales: user.horas_mensuales } });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = getDb().prepare('SELECT id, nombre, email, rol, horas_mensuales, activo FROM usuarios WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ── Usuarios routes ──────────────────────────────────────────────────────────
app.get('/api/usuarios', auth, adminOnly, (req, res) => {
  const users = getDb().prepare('SELECT id, nombre, email, rol, horas_mensuales, activo, created_at FROM usuarios ORDER BY nombre').all();
  res.json(users);
});

app.post('/api/usuarios', auth, adminOnly, (req, res) => {
  const { nombre, email, password, rol, horas_mensuales } = req.body;
  if (!nombre || !email || !password || !rol) return res.status(400).json({ error: 'Faltan campos' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = getDb().prepare(
      'INSERT INTO usuarios (nombre, email, password_hash, rol, horas_mensuales) VALUES (?, ?, ?, ?, ?)'
    ).run(nombre, email, hash, rol, horas_mensuales || 0);
    res.json({ id: result.lastInsertRowid, nombre, email, rol, horas_mensuales, activo: 1 });
  } catch (e) {
    res.status(400).json({ error: 'El email ya existe' });
  }
});

app.put('/api/usuarios/:id', auth, adminOnly, (req, res) => {
  const { nombre, email, password, rol, horas_mensuales, activo } = req.body;
  const db = getDb();
  const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  const hash = password ? bcrypt.hashSync(password, 10) : user.password_hash;
  db.prepare(
    'UPDATE usuarios SET nombre=?, email=?, password_hash=?, rol=?, horas_mensuales=?, activo=? WHERE id=?'
  ).run(nombre ?? user.nombre, email ?? user.email, hash, rol ?? user.rol, horas_mensuales ?? user.horas_mensuales, activo ?? user.activo, req.params.id);
  res.json({ ok: true });
});

app.patch('/api/usuarios/:id/toggle', auth, adminOnly, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT activo FROM usuarios WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('UPDATE usuarios SET activo = ? WHERE id = ?').run(user.activo ? 0 : 1, req.params.id);
  res.json({ activo: !user.activo });
});

// ── Configuración (bolsa total) ───────────────────────────────────────────────
app.get('/api/configuracion', auth, (req, res) => {
  const rows = getDb().prepare('SELECT clave, valor FROM configuracion').all();
  const cfg = {};
  rows.forEach(r => cfg[r.clave] = r.valor);
  res.json(cfg);
});

app.put('/api/configuracion', auth, adminOnly, (req, res) => {
  const db = getDb();
  const upsert = db.prepare('INSERT OR REPLACE INTO configuracion (clave, valor) VALUES (?, ?)');
  for (const [k, v] of Object.entries(req.body)) {
    upsert.run(k, String(v));
  }
  res.json({ ok: true });
});

// ── Entradas routes ──────────────────────────────────────────────────────────
app.get('/api/entradas', auth, (req, res) => {
  const { year, month, usuario_id } = req.query;
  let sql = `SELECT e.*, u.nombre as usuario_nombre FROM entradas e JOIN usuarios u ON e.usuario_id = u.id WHERE 1=1`;
  const params = [];

  // Delegados only see their own
  if (req.user.rol !== 'admin') {
    sql += ' AND e.usuario_id = ?';
    params.push(req.user.id);
  } else if (usuario_id) {
    sql += ' AND e.usuario_id = ?';
    params.push(usuario_id);
  }

  if (year) {
    sql += ` AND strftime('%Y', e.fecha) = ?`;
    params.push(String(year));
  }
  if (month && month !== '-1') {
    sql += ` AND strftime('%m', e.fecha) = ?`;
    params.push(String(month).padStart(2, '0'));
  }
  sql += ' ORDER BY e.fecha DESC';
  res.json(getDb().prepare(sql).all(...params));
});

app.get('/api/entradas/saldo/:userId', auth, (req, res) => {
  const targetId = req.params.userId;
  // Delegados can only see their own
  if (req.user.rol !== 'admin' && req.user.id !== parseInt(targetId)) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const user = getDb().prepare('SELECT * FROM usuarios WHERE id = ?').get(targetId);
  if (!user) return res.status(404).json({ error: 'No encontrado' });

  const now = new Date();
  let saldo = 0;
  const startYear = 2024;

  for (let y = startYear; y <= now.getFullYear(); y++) {
    for (let m = 0; m <= 11; m++) {
      if (new Date(y, m, 1) > now) break;
      saldo += user.horas_mensuales;
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      const usado = getDb().prepare(
        `SELECT COALESCE(SUM(horas),0) as total FROM entradas WHERE usuario_id=? AND tipo='sindical' AND strftime('%Y-%m', fecha)=?`
      ).get(targetId, key);
      saldo -= usado.total;
      if (saldo < 0) saldo = 0;
    }
  }
  res.json({ saldo, horas_mensuales: user.horas_mensuales });
});

app.post('/api/entradas', auth, (req, res) => {
  const { fecha, horas, tipo, descripcion } = req.body;
  if (!fecha || !horas || !tipo) return res.status(400).json({ error: 'Faltan campos' });
  // Admins can post for any user, delegados only for themselves
  const usuario_id = req.user.rol === 'admin' && req.body.usuario_id ? req.body.usuario_id : req.user.id;
  const result = getDb().prepare(
    'INSERT INTO entradas (usuario_id, fecha, horas, tipo, descripcion) VALUES (?, ?, ?, ?, ?)'
  ).run(usuario_id, fecha, horas, tipo, descripcion || '');
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/entradas/:id', auth, (req, res) => {
  const db = getDb();
  const entry = db.prepare('SELECT * FROM entradas WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'No encontrada' });
  if (req.user.rol !== 'admin' && entry.usuario_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  const { fecha, horas, tipo, descripcion } = req.body;
  db.prepare(
    'UPDATE entradas SET fecha=?, horas=?, tipo=?, descripcion=?, updated_at=datetime("now") WHERE id=?'
  ).run(fecha ?? entry.fecha, horas ?? entry.horas, tipo ?? entry.tipo, descripcion ?? entry.descripcion, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/entradas/:id', auth, (req, res) => {
  const db = getDb();
  const entry = db.prepare('SELECT * FROM entradas WHERE id = ?').get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'No encontrada' });
  if (req.user.rol !== 'admin' && entry.usuario_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  db.prepare('DELETE FROM entradas WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Export CSV
app.get('/api/entradas/export', auth, adminOnly, (req, res) => {
  const { year, month, usuario_id } = req.query;
  let sql = `SELECT e.*, u.nombre as usuario_nombre FROM entradas e JOIN usuarios u ON e.usuario_id = u.id WHERE 1=1`;
  const params = [];
  if (usuario_id) { sql += ' AND e.usuario_id = ?'; params.push(usuario_id); }
  if (year) { sql += ` AND strftime('%Y', e.fecha) = ?`; params.push(year); }
  if (month && month !== '-1') { sql += ` AND strftime('%m', e.fecha) = ?`; params.push(String(month).padStart(2, '0')); }
  sql += ' ORDER BY e.fecha ASC';
  const rows = getDb().prepare(sql).all(...params);
  let csv = '\uFEFFDelegado,Fecha,Horas,Tipo,Descripcion\n';
  rows.forEach(r => {
    csv += `"${r.usuario_nombre}","${r.fecha}",${r.horas},"${r.tipo}","${(r.descripcion || '').replace(/"/g, '""')}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bolsa_horas_${year || 'all'}.csv"`);
  res.send(csv);
});

// Catch-all for React in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => console.log(`✅ Servidor en http://localhost:${PORT}`));
