// Verifica facturación (Sprint 4 FE) vía el proxy /api: venta → emitir boleta → contingencia → anular.
const WEB = 'http://localhost:5173';
const api = async (metodo, ruta, token, body) => {
  const r = await fetch(WEB + '/api' + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };
};
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const esperar = async (token, id) => {
  let c = (await api('GET', `/facturacion/comprobantes/${id}`, token)).json;
  for (let i = 0; i < 8 && c.estado === 'PENDIENTE'; i++) {
    await dormir(800);
    c = (await api('GET', `/facturacion/comprobantes/${id}`, token)).json;
  }
  return c;
};

const gerente = (await api('POST', '/auth/login', null, { usuario: 'gerente', password: 'galaxi123' })).json.token;

// Asegurar caja abierta + crear una venta para facturar.
if (!(await api('GET', '/caja/actual', gerente)).json.abierta) await api('POST', '/caja/abrir', gerente, { montoInicialCentimos: 30000 });
const venta = (await api('POST', '/ventas', gerente, { items: [{ codigo: '7752001', cantidad: 2 }], metodoPago: 'EFECTIVO' })).json;
console.log(`Venta ${venta.numero} (S/ ${(venta.totalCentimos / 100).toFixed(2)})`);

console.log('=== 1. Emitir BOLETA desde el POS (público general) → ACEPTADO ===');
let b = (await api('POST', '/facturacion/emitir', gerente, { ventaId: venta.id, tipo: 'BOLETA', cliente: { tipoDoc: 'SIN_DOCUMENTO', nombre: 'Público general' } })).json;
b = await esperar(gerente, b.id);
console.log(`  ${b.numero} ${b.estado} · gravada ${b.gravada} + IGV ${b.igv} = ${b.total} · PDF ${b.enlacePdf ? 'sí' : 'no'}`);

console.log('=== 2. Contingencia: PSE caído → nueva venta+boleta queda PENDIENTE ===');
await api('POST', '/facturacion/_dev/pse', gerente, { caido: true });
const venta2 = (await api('POST', '/ventas', gerente, { items: [{ codigo: '7752001', cantidad: 1 }], metodoPago: 'EFECTIVO' })).json;
let b2 = (await api('POST', '/facturacion/emitir', gerente, { ventaId: venta2.id, tipo: 'BOLETA', cliente: { tipoDoc: 'SIN_DOCUMENTO', nombre: 'Público general' } })).json;
b2 = await esperar(gerente, b2.id);
console.log(`  ${b2.numero} ${b2.estado} (la venta no se detuvo)`);
console.log('  → PSE se recupera y se reintenta...');
await api('POST', '/facturacion/_dev/pse', gerente, { caido: false });
await api('POST', `/facturacion/comprobantes/${b2.id}/reintentar`, gerente);
b2 = await esperar(gerente, b2.id);
console.log(`  ${b2.numero} ahora ${b2.estado}`);

console.log('=== 3. Anular la boleta 1 (nota de crédito, gerente) ===');
const nc = (await api('POST', `/facturacion/comprobantes/${b.id}/anular`, gerente, { motivo: 'Devolución del cliente' })).json;
const bFinal = (await api('GET', `/facturacion/comprobantes/${b.id}`, gerente)).json;
console.log(`  Nota de crédito ${nc.numero} emitida; ${b.numero} → ${bFinal.estado}`);

console.log('=== 4. Listado de comprobantes ===');
const lista = (await api('GET', '/facturacion/comprobantes', gerente)).json;
for (const c of lista.slice(0, 5)) console.log(`  ${c.numero.padEnd(13)} ${c.tipo.padEnd(13)} ${c.estado.padEnd(10)} S/ ${c.total}`);
