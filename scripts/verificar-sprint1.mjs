// Verifica el Sprint 1 FE↔BE a través del proxy /api del dev server (localhost:5173).
const WEB = 'http://localhost:5173';
const api = async (metodo, ruta, token, body) => {
  const r = await fetch(WEB + '/api' + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, json: await r.json().catch(() => ({})) };
};

const token = (await api('POST', '/auth/login', null, { usuario: 'gerente', password: 'galaxi123' })).json.token;

console.log('=== Catálogo: ahora incluye familia/stockMinimo/grosor ===');
const prods = (await api('GET', '/catalogo/productos?buscar=', token)).json;
const crudo = prods.find((p) => p.codigo === '7750001');
console.log(`  ${crudo.nombre}: familia=${crudo.familia}, unidad=${crudo.unidadVenta}, precio=${crudo.precio}, stockMin=${crudo.stockMinimo}`);

console.log('=== Inventario: GET /stock (semáforo) ===');
const stock = (await api('GET', '/inventario/stock', token)).json;
console.log(`  ${stock.length} productos con saldo; ej. 7750001 → ${stock.find((s) => s.codigo === '7750001')?.saldo}`);

console.log('=== Carga masiva: 1 fila válida + 1 con error de regla (crudo por m²) ===');
const reporte = (
  await api('POST', '/catalogo/productos/carga-masiva', token, {
    filas: [
      { fila: 2, codigo: '7750099', nombre: 'Vidrio reflejante verde 6 mm', familia: 'VIDRIO', subfamilia: 'Reflejante', unidadVenta: 'PIE2', precioCentimos: 720, stockMinimo: 4, grosorMm: 6 },
      { fila: 3, codigo: '7750098', nombre: 'Vidrio crudo MAL por m2', familia: 'VIDRIO', subfamilia: 'Crudo', unidadVenta: 'M2', precioCentimos: 5000, stockMinimo: 3, grosorMm: 6 },
    ],
  })
).json;
console.log(`  creados=${reporte.creados}, actualizados=${reporte.actualizados}, errores=${reporte.errores.length}`);
for (const e of reporte.errores) console.log(`    fila ${e.fila} (${e.codigo}): ${e.mensaje}`);

console.log('=== Re-ejecutar la misma carga: idempotente (actualiza, no duplica) ===');
const reporte2 = (
  await api('POST', '/catalogo/productos/carga-masiva', token, {
    filas: [{ fila: 2, codigo: '7750099', nombre: 'Vidrio reflejante verde 6 mm', familia: 'VIDRIO', subfamilia: 'Reflejante', unidadVenta: 'PIE2', precioCentimos: 800, stockMinimo: 4, grosorMm: 6 }],
  })
).json;
console.log(`  creados=${reporte2.creados}, actualizados=${reporte2.actualizados} (esperado: 0 creados, 1 actualizado)`);
