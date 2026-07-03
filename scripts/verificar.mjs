// Verificación de integración del Sprint 0 FE: la SPA se sirve y el proxy /api llega al backend vivo.
const WEB = 'http://localhost:5173';

const html = await (await fetch(WEB + '/')).text();
console.log('SPA index con #root:', /id="root"/.test(html) ? 'OK' : 'FALTA');

const login = await fetch(WEB + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ usuario: 'gerente', password: 'galaxi123' }),
});
const datos = await login.json();
console.log('Proxy /api → backend login:', login.ok ? `OK (rol ${datos.rol}, ${datos.nombre})` : 'FALLÓ');

const malo = await fetch(WEB + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ usuario: 'gerente', password: 'malo' }),
});
const errMalo = await malo.json();
console.log('Credenciales malas → mensaje en español:', `"${errMalo.message}"`);

const mani = await fetch(WEB + '/manifest.webmanifest');
console.log('PWA manifest.webmanifest:', mani.ok ? 'OK' : 'FALTA');

const svg = await fetch(WEB + '/logo-galaxi.svg');
console.log('Icono logo-galaxi.svg:', svg.ok ? 'OK' : 'FALTA');
