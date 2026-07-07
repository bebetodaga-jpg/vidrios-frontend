import type { UnidadVenta } from '@shared/api/catalogo';

/**
 * Cálculo de importe del POS — espejo EXACTO del backend (venta.calculos.ts) para mostrar el
 * precio en vivo. El backend recalcula y manda el total autoritativo al confirmar; aquí solo se
 * muestra. Crudo/catedral/espejo por pie², templado por m² (regla del dueño).
 */
const MM2_POR_PIE2 = 92_903.04; // 1 pie = 304.8 mm
const MM2_POR_M2 = 1_000_000;

export function esPorArea(unidad: UnidadVenta): boolean {
  return unidad === 'PIE2' || unidad === 'M2';
}

export function areaEnUnidad(unidad: UnidadVenta, anchoMm: number, altoMm: number): number {
  const mm2 = anchoMm * altoMm;
  return unidad === 'PIE2' ? mm2 / MM2_POR_PIE2 : mm2 / MM2_POR_M2;
}

export function importeCentimos(
  unidad: UnidadVenta,
  precioCentimos: number,
  cantidad: number,
  anchoMm?: number,
  altoMm?: number,
): number {
  if (esPorArea(unidad)) {
    if (!anchoMm || !altoMm) {
      return 0;
    }
    return Math.round(precioCentimos * areaEnUnidad(unidad, anchoMm, altoMm) * cantidad);
  }
  return precioCentimos * cantidad;
}
