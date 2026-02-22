# Spanish Starter Pack — Setup Guide (Supabase)

## Estructura de archivos

```
/
├── index.html              ← Homepage
├── lessons.html            ← Lista de lecciones
├── lesson.html             ← Plantilla dinámica de lecciones
├── contact.html            ← Formulario de contacto
├── admin.html              ← Panel de admin (protegido con Google OAuth)
│
├── styles.css              ← Sistema de diseño + dark mode
├── components.js           ← Navbar, footer, theme toggle compartidos
├── supabase-service.js     ← Toda la lógica de backend
│
├── 1-Basic-intro.html      ← Lecciones estáticas existentes (siguen igual)
├── 2-Conjugations.html
├── 3-Basic-sentence-structures.html
├── 4-Spanish-pronuntiation.html
└── Imperfecto-vs-simple.html
```

---

## Setup de Supabase (~15 minutos)

### 1. Crear proyecto
- Ve a https://supabase.com → New project
- Nombre: `spanish-starter-pack`
- Elige la región más cercana

### 2. Crear las tablas
- En el sidebar: **SQL Editor → New query**
- Copia el bloque SQL completo del inicio de `supabase-service.js`
  (entre los comentarios de apertura y cierre)
- Ejecuta con Run

### 3. Activar Google OAuth
- **Authentication → Providers → Google** → activar
- Necesitas credenciales de Google Cloud Console:
  - https://console.cloud.google.com → APIs & Services → Credentials
  - Crear OAuth 2.0 Client ID (Web application)
  - Redirect URI: `https://TU-PROJECT.supabase.co/auth/v1/callback`
  - Copia Client ID y Secret → pégalos en Supabase

### 4. Copiar credenciales
- **Project Settings → API**
- Copia "Project URL" y "anon public key"
- En `supabase-service.js`, reemplaza:

```js
const SUPABASE_URL = 'https://TU-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'TU-ANON-KEY';
const ADMIN_EMAILS = ['tu-email@gmail.com'];
```

- En el mismo archivo, busca `'jmteach15@gmail.com'` en las RLS policies del SQL y reemplázalo con tu email

### 5. Configurar redirect en Supabase Auth
- **Authentication → URL Configuration**
- Site URL: `https://tu-dominio.com`
- Redirect URLs: `https://tu-dominio.com/admin.html`

---

## Usar el Admin Panel

1. Abre `/admin.html` → "Continuar con Google"
2. Supabase redirige a Google y vuelve automáticamente

**Crear lecciones:**
- Escribe en Markdown con preview en tiempo real
- El slug se genera automáticamente
- Puedes guardar como borrador o publicar directamente

**Comentarios:**
- Los comentarios de los estudiantes requieren aprobación
- El badge en el menú muestra cuántos están pendientes

**Analytics:**
- Las visitas se guardan automáticamente (rate limited: 1 por sesión/10min)
- Ver gráfica de visitas por día y lecciones más populares

---

## Markdown cheatsheet

```
**negrita**    *cursiva*    ~~tachado~~
## Título      ### Subtítulo
- lista        > cita/ejemplo
`código`       ---  (línea divisoria)

| Col 1 | Col 2 |
|-------|-------|
| dato  | dato  |
```

---

## Dark Mode

- Automático: respeta `prefers-color-scheme` del OS
- Manual: botón 🌙/☀️ en el navbar
- Persiste en `localStorage`

---

## Agregar navbar a páginas existentes

Reemplaza el navbar hardcodeado en cada HTML por:

```html
<body data-page="home">  <!-- o: lessons, contact -->
  <!-- contenido -->
  <script src="supabase-service.js"></script>
  <script src="components.js"></script>
</body>
```

---

## Deploy (opciones gratuitas)

| Plataforma | Método |
|------------|--------|
| Netlify | Arrastra la carpeta a netlify.com/drop |
| GitHub Pages | Push al repo → Settings → Pages |
| Vercel | Conecta el repo o usa `vercel deploy` |

Después del deploy: actualiza Site URL en Supabase Auth con tu dominio real.
