const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'bolsa_horas.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('admin','delegado')),
    horas_mensuales INTEGER DEFAULT 0,
    activo INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entradas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    horas REAL NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('sindical','empresa','compensacion')),
    descripcion TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
  );
`);

// Seed admin user
const adminHash = bcrypt.hashSync('admin123', 10);
const adminExists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('admin@empresa.com');
if (!adminExists) {
  db.prepare(`INSERT INTO usuarios (nombre, email, password_hash, rol, horas_mensuales) VALUES (?, ?, ?, ?, ?)`)
    .run('Administrador', 'admin@empresa.com', adminHash, 'admin', 20);
}

// Seed demo delegates
const demos = [
  { nombre: 'María García', email: 'maria@empresa.com', horas: 20 },
  { nombre: 'Carlos López', email: 'carlos@empresa.com', horas: 15 },
  { nombre: 'Ana Martínez', email: 'ana@empresa.com', horas: 20 },
];
const passHash = bcrypt.hashSync('pass123', 10);
for (const d of demos) {
  const exists = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(d.email);
  if (!exists) {
    db.prepare(`INSERT INTO usuarios (nombre, email, password_hash, rol, horas_mensuales) VALUES (?, ?, ?, ?, ?)`)
      .run(d.nombre, d.email, passHash, 'delegado', d.horas);
  }
}

// Seed some entries
const maria = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('maria@empresa.com');
const carlos = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('carlos@empresa.com');
const ana = db.prepare('SELECT id FROM usuarios WHERE email = ?').get('ana@empresa.com');

const entryExists = db.prepare('SELECT id FROM entradas LIMIT 1').get();
if (!entryExists) {
  const insertEntry = db.prepare(`INSERT INTO entradas (usuario_id, fecha, horas, tipo, descripcion) VALUES (?, ?, ?, ?, ?)`);
  insertEntry.run(maria.id, '2026-03-15', 3, 'sindical', 'Reunión comité empresa');
  insertEntry.run(maria.id, '2026-03-20', 2, 'empresa', 'Reunión con RRHH sobre convenio');
  insertEntry.run(carlos.id, '2026-03-10', 4, 'sindical', 'Negociación colectiva');
  insertEntry.run(ana.id, '2026-03-22', 2, 'compensacion', '');
  insertEntry.run(maria.id, '2026-04-02', 5, 'sindical', 'Asamblea general');
  insertEntry.run(carlos.id, '2026-04-05', 3, 'empresa', 'Mesa de negociación');
}

console.log('✅ Base de datos inicializada correctamente');
console.log('   Admin: admin@empresa.com / admin123');
console.log('   Delegado demo: maria@empresa.com / pass123');
db.close();
