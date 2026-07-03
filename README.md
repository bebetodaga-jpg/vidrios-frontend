# Vidrios Galaxi — Web (PWA)

Frontend del Sprint 0. Stack: **React 18 + TypeScript strict + Vite + Ant Design v5 + PWA (Workbox)**.
Sigue el [sistema de diseño](../gestion-proyecto/ux-ui/sprint-0/sistema-de-diseno.md) (tema Galaxi, modo tienda/obra)
y los [estándares de código](../gestion-proyecto/tech-lead/sprint-0/estandares-de-codigo.md).

## Arranque

```bash
npm install
npm run dev      # http://localhost:5173 (proxy /api → backend en :3000)
```

Requiere el **backend corriendo** (`../backend`: `docker compose up -d postgres redis` + `npm run start:dev`).
Usuarios de prueba: `gerente`, `rosa` (cajera), `carlos` (vendedor)… contraseña `galaxi123`.

```bash
npm run build    # tsc + vite build (genera el service worker PWA)
npm run lint     # ESLint strict (sin any, hooks, etc.)
npm run preview  # sirve el build de producción
```

## Estructura (espejo de los módulos del backend)

```
src/
├── shared/
│   ├── theme.ts          tema Ant Design (tokens Galaxi)
│   ├── tokens.ts         paleta/fuentes primitivas para estilos propios
│   ├── api/cliente.ts    fetch con JWT + ErrorApi (mensajes en español del backend)
│   └── layout/           LayoutPrincipal (responsivo), RutaProtegida, navegacion por rol
├── modules/
│   ├── auth/             contexto de sesión, SesionProvider, useSesion, PantallaLogin
│   └── inicio/           PantallaInicio (accesos por rol) + PantallaModulo (placeholders)
├── App.tsx               rutas
└── main.tsx              ConfigProvider (tema + locale es_ES) + SesionProvider
```

## Qué entrega el Sprint 0

- **PWA instalable** (manifest + service worker Workbox, shell offline). Iconos en `public/logo-galaxi*.svg`.
- **Login con JWT**: la sesión (token + rol) se persiste en el dispositivo; rutas protegidas.
- **Navegación por rol**: cada usuario ve solo sus módulos (cajera→POS/Caja, gerente→todo…); base del control por área del Sprint 10.
- **Layout responsivo**: menú lateral en PC de tienda; cajón (drawer) y header con hamburguesa en móvil/obra; etiqueta "Modo obra" en módulos de campo.
- **Tema Galaxi** aplicado (azul #16335B + celeste #0E9FD8) con locale español.

Las pantallas de cada módulo (catálogo, POS, caja…) son placeholders que muestran su sprint; la ruta y el permiso ya quedan cableados y se reemplazan en el sprint correspondiente.

> Nota técnica: el bundle de Sprint 0 incluye todo Ant Design (~710 KB). Se aplicará code-splitting por ruta (`React.lazy`) cuando entren los módulos pesados (Sprint 1+).
