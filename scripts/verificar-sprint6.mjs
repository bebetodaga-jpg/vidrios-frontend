// Verifica el cotizador (Sprint 6 FE) vía el proxy /api: modelos, precio al instante, crear cotización.
const WEB = 'http://localhost:5173';
const api = async (m, ruta, token, body) => {
  const r = await fetch(WEB + '/api' + ruta, {
    method: m,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, json: await r.json().catch(() => ({})) };
};
const soles = (c) => 'S/ ' + (c / 100).toFixed(2);
const token = (await api('POST', '/auth/login', null, { usuario: 'gerente', password: 'galaxi123' })).json.token;

console.log('=== Modelos (proxy) ===');
const m = (await api('GET', '/cotizaciones/modelos', token)).json;
console.log(`  ${m.modelos.length} modelos, ${m.colores.length} colores`);

console.log('=== Precio al instante: pivotante 90×210 templado 10mm negro ===');
const it = (await api('POST', '/cotizaciones/cotizar-item', token, { vanoCodigo: 'V-01', modelo: 'pivotante', vidrioCodigo: '7750004', color: 'negro', anchoCm: 90, altoCm: 210, cantidad: 1 })).json;
console.log(`  ${soles(it.totalCentimos)} · paño ${it.despiece.panos[0].anchoCm}×${it.despiece.panos[0].altoCm} cm (desc. −12/−18)`);

console.log('=== Crear cotización 2 ítems ===');
const cot = (await api('POST', '/cotizaciones', token, { items: [
  { vanoCodigo: 'V-01', modelo: 'corrediza', vidrioCodigo: '7750001', color: 'natural', anchoCm: 150, altoCm: 120, cantidad: 1 },
  { vanoCodigo: 'V-02', modelo: 'fijo', vidrioCodigo: '7750006', color: 'bronce', anchoCm: 80, altoCm: 60, cantidad: 4 },
] })).json;
console.log(`  ${cot.numero} creada`);
const det = (await api('GET', `/cotizaciones/${cot.id}`, token)).json;
console.log(`  ${det.itemsDetalle.length} ítems · TOTAL ${soles(det.totalCentimos)}`);
