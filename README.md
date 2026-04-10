# Bolsa de Horas Sindicales

Aplicación web completa para la gestión del crédito horario sindical de delegados.

## Estructura del proyecto

```
bolsa-horas/
├── server/          # Backend Node.js + Express + SQLite
│   ├── index.js     # Servidor principal (API REST)
│   ├── scripts/
│   │   └── init-db.js  # Inicialización de la base de datos
│   └── package.json
├── client/          # Frontend React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── PortalDelegado.jsx
│   │   │   └── PortalAdmin.jsx
│   │   ├── components/
│   │   │   ├── Topbar.jsx
│   │   │   ├── Calendario.jsx
│   │   │   ├── EntradaModal.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── Toast.jsx
│   │   ├── hooks/
│   │   │   └── useAuth.jsx
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## Instalación y arranque en local (desarrollo)

### Requisitos previos
- Node.js 18 o superior
- npm 9 o superior

### 1. Instalar dependencias del servidor

```bash
cd server
npm install
```

### 2. Inicializar la base de datos

```bash
node scripts/init-db.js
```

Esto crea `bolsa_horas.db` con datos de demo:
- **Admin:** admin@empresa.com / admin123
- **Delegado demo:** maria@empresa.com / pass123

### 3. Arrancar el servidor (API)

```bash
npm run dev
# Servidor en http://localhost:3001
```

### 4. Instalar dependencias del cliente (en otra terminal)

```bash
cd client
npm install
```

### 5. Arrancar el cliente (React)

```bash
npm run dev
# Frontend en http://localhost:5173
```

Abre http://localhost:5173 en el navegador.

---

## Despliegue en producción

### Opción A — Servidor único (recomendado)

El servidor Express sirve el frontend compilado. Solo necesitas un proceso.

```bash
# 1. Compilar el frontend
cd client
npm install
npm run build

# 2. Arrancar el servidor en modo producción
cd ../server
npm install
NODE_ENV=production PORT=3000 node index.js
```

Abre http://tu-servidor:3000

### Opción B — Con PM2 (proceso persistente)

```bash
npm install -g pm2

cd server
NODE_ENV=production PORT=3000 pm2 start index.js --name bolsa-horas

# Para que arranque al reiniciar el servidor:
pm2 startup
pm2 save
```

### Opción C — Con Nginx como proxy inverso

Instala Nginx y crea `/etc/nginx/sites-available/bolsa-horas`:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/bolsa-horas /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Para HTTPS gratuito con Let's Encrypt:
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d tu-dominio.com
```

---

## Variables de entorno (servidor)

Crea un archivo `.env` en la carpeta `server/` o pásalas al proceso:

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `3001` | Puerto del servidor |
| `JWT_SECRET` | `bolsa-horas-secret-2024-change-in-production` | Secreto para tokens JWT. **¡Cámbialo en producción!** |
| `DB_PATH` | `./bolsa_horas.db` | Ruta al archivo SQLite |
| `NODE_ENV` | `development` | `production` para servir el frontend |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Origen permitido para CORS (en dev) |

Ejemplo de `.env` para producción:
```
PORT=3000
NODE_ENV=production
JWT_SECRET=un-secreto-largo-y-aleatorio-aqui-min-32-chars
DB_PATH=/var/data/bolsa_horas.db
```

---

## Funcionalidades

### Portal Delegado
- **Calendario interactivo**: registra horas por día con un clic
- **Tipos de hora**:
  - `Sindical` → descuenta de la bolsa
  - `Empresa` → no descuenta (con campo descripción)
  - `Compensación` → no descuenta
- **Métricas**: saldo acumulado, crédito mensual, horas usadas, horas restantes
- **El saldo no caduca**: las horas sobrantes de un mes pasan al siguiente
- **Resumen**: tabla filtrable por año y mes

### Portal Administrador
- **Horas solicitadas**: tabla con filtros por año, mes y delegado + exportar a CSV/Excel
- **Estado delegados**: saldo acumulado y uso mensual de todos
- **Calendario global**: vista de horas de todos o un delegado concreto
- **Usuarios**: crear, editar, activar/desactivar cualquier usuario
- **Configuración**: modificar las horas mensuales asignadas a cada delegado/admin
- **Los administradores también tienen crédito horario** configurable

### Seguridad
- Contraseñas hasheadas con bcrypt
- Autenticación JWT con expiración de 8 horas
- Los delegados solo ven y editan sus propias entradas
- Solo los administradores pueden crear usuarios

---

## Backup de la base de datos

La base de datos es un único archivo SQLite. Para hacer backup:

```bash
# Copia simple
cp bolsa_horas.db bolsa_horas_backup_$(date +%Y%m%d).db

# Con cron (backup diario a las 2am)
0 2 * * * cp /ruta/bolsa_horas.db /backups/bolsa_horas_$(date +\%Y\%m\%d).db
```

---

## Exportación a Excel

El botón "Exportar Excel/CSV" descarga un archivo `.csv` compatible con Excel, LibreOffice y Google Sheets. Incluye BOM UTF-8 para que los caracteres especiales (tildes, ñ) se muestren correctamente.

Columnas exportadas: Delegado, Fecha, Horas, Tipo, Descripción.

Se respetan los filtros activos (año, mes, delegado).
