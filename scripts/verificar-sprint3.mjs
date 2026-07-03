// Verifica el módulo de caja (Sprint 3 FE) vía el proxy /api: día → cierre ciego → reporte gerente.
const WEB = 'http://localhost:5173';
const api = async (metodo, ruta, token, body) => {
  const r = await fetch(WEB + '/api' + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };
};
const soles = (c) => 'S/ ' + (c / 100).toFixed(2);

const gerente = (await api('POST', '/auth/login', null, { usuario: 'gerente', password: 'galaxi123' })).json.token;
const rosa = (await api('POST', '/auth/login', null, { usuario: 'rosa', password: 'galaxi123' })).json.token;

console.log('=== Asegurar caja abierta ===');
let estado = (await api('GET', '/caja/actual', gerente)).json;
if (!estado.abierta) {
  await api('POST', '/caja/abrir', rosa, { montoInicialCentimos: 30000 });
  estado = (await api('GET', '/caja/actual', gerente)).json;
}
console.log(`  abierta=${estado.abierta}, apertura=${soles(estado.montoInicialCentimos)}`);

console.log('=== Movimientos del día (GET /caja/actual/movimientos) ===');
const movs = (await api('GET', '/caja/actual/movimientos', gerente)).json;
console.log(`  ${movs.length} movimientos; ej.: ${movs.slice(0, 3).map((m) => `${m.tipo} ${soles(m.montoCentimos)}`).join(' · ')}`);

console.log('=== Egreso de la cajera (S/ 12) ===');
await api('POST', '/caja/movimientos', rosa, { tipo: 'EGRESO', metodo: 'EFECTIVO', concepto: 'Compra de silicona', montoCentimos: 1200 });
console.log('  registrado');

console.log('=== Cierre ciego: Rosa declara (efectivo contado, tarjeta, yape) ===');
const sumEf = movs.filter((m) => m.metodo === 'EFECTIVO').reduce((s, m) => s + m.montoCentimos, 0) + estado.montoInicialCentimos - 1200;
const cierre = await api('POST', '/caja/cerrar', rosa, { efectivoCentimos: sumEf - 300, tarjetaCentimos: 0, yapeCentimos: 700 });
console.log(`  ${cierre.json.mensaje} (declaró S/ 3 menos a propósito)`);

console.log('=== Reporte del gerente (semáforo ±S/5) ===');
const rep = await api('GET', `/caja/cierres/${cierre.json.sesionId}/reporte`, gerente);
for (const f of rep.json.filas) console.log(`  ${f.metodo}: esperado ${soles(f.esperadoCentimos)} · declarado ${soles(f.declaradoCentimos)} · dif ${soles(f.diferenciaCentimos)} → ${f.estado}`);

console.log('=== La cajera NO puede ver el reporte ===');
const intento = await api('GET', `/caja/cierres/${cierre.json.sesionId}/reporte`, rosa);
console.log(`  HTTP ${intento.status} (esperado 403)`);
