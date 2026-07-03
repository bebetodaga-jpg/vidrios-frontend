// Verifica el POS (Sprint 2 FE) a través del proxy /api: estado de caja, abrir, vender por unidad y por m².
const WEB = 'http://localhost:5173';
const api = async (metodo, ruta, token, body) => {
  const r = await fetch(WEB + '/api' + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, json: await r.json().catch(() => ({})) };
};
const soles = (c) => 'S/ ' + (c / 100).toFixed(2);

const token = (await api('POST', '/auth/login', null, { usuario: 'gerente', password: 'galaxi123' })).json.token;

console.log('=== Estado de caja (GET /caja/actual) ===');
let estado = (await api('GET', '/caja/actual', token)).json;
console.log(`  abierta=${estado.abierta}`);
if (!estado.abierta) {
  await api('POST', '/caja/abrir', token, { montoInicialCentimos: 30000 });
  estado = (await api('GET', '/caja/actual', token)).json;
  console.log(`  → caja abierta con S/ 300. abierta=${estado.abierta}`);
}

console.log('=== Venta: 4 garruchas (unidad) + templado 100×100 cm (m²) en efectivo ===');
const venta = await api('POST', '/ventas', token, {
  items: [
    { codigo: '7752001', cantidad: 4 },
    { codigo: '7750003', cantidad: 1, anchoCm: 100, altoCm: 100 },
  ],
  metodoPago: 'EFECTIVO',
});
console.log(`  ${venta.json.numero} → total ${soles(venta.json.totalCentimos)} (esperado S/ 134.00 = 4×3.50 + 1 m²×120)`);

console.log('=== Descuento 10% (gerente) en una venta de 2 garruchas ===');
const conDesc = await api('POST', '/ventas', token, {
  items: [{ codigo: '7752001', cantidad: 2 }],
  metodoPago: 'YAPE_PLIN',
  descuentoPct: 10,
});
console.log(`  ${conDesc.json.numero} → total ${soles(conDesc.json.totalCentimos)} (esperado S/ 6.30 = 7.00 − 10%)`);
