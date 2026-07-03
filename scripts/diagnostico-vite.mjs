// Diagnóstico: ¿el dev server sirve y transforma los módulos sin error?
const BASE = 'http://localhost:5173';
const rutas = [
  '/',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/modules/catalogo/PantallaCatalogo.tsx',
  '/src/modules/inicio/PantallaInicio.tsx',
  '/src/modules/reportes/PantallaReportes.tsx',
  '/src/modules/personal/PantallaPersonal.tsx',
  '/src/modules/cotizaciones/PantallaCotizador.tsx',
  '/src/shared/layout/navegacion.tsx',
  '/api/auth/login',
];

for (const ruta of rutas) {
  try {
    const res = await fetch(BASE + ruta, { method: ruta.startsWith('/api') ? 'POST' : 'GET' });
    const cuerpo = await res.text();
    let nota = '';
    if (res.status >= 400 && !ruta.startsWith('/api')) {
      nota = ' >>> ' + cuerpo.slice(0, 400).replace(/\n/g, ' | ');
    }
    if (ruta === '/' && !cuerpo.includes('main.tsx')) {
      nota = ' >>> index.html NO referencia main.tsx: ' + cuerpo.slice(0, 200).replace(/\n/g, ' | ');
    }
    console.log(`${String(res.status)} ${ruta}${nota}`);
  } catch (e) {
    console.log(`ERROR ${ruta}: ${e.message}`);
  }
}
