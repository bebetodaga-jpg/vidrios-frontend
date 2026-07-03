import type { UnidadVenta } from '@shared/api/catalogo';

/**
 * Cálculo de importe del POS — espejo EXACTO del backend (venta.calculos.ts) para mostrar el
 * precio en vivo. El backend recalcula y manda el total autoritativo al confirmar; aquí solo se
 * muestra. Crudo/catedral/espejo por pie², templado por m² (regla del dueño).
 */
const CM2_POR_PIE2 = 929.0304;
const CM2_POR_M2 = 10_000;

export function esPorArea(unidad: UnidadVenta): boolean {
  return unidad === 'PIE2' || unidad === 'M2';
}

export function areaEnUnidad(unidad: UnidadVenta, anchoCm: number, altoCm: number): number {
  const cm2 = anchoCm * altoCm;
  return unidad === 'PIE2' ? cm2 / CM2_POR_PIE2 : cm2 / CM2_POR_M2;
}

export function importeCentimos(
  unidad: UnidadVenta,
  precioCentimos: number,
  cantidad: number,
  anchoCm?: number,
  altoCm?: number,
): number {
  if (esPorArea(unidad)) {
    if (!anchoCm || !altoCm) {
      return 0;
    }
    return Math.round(precioCentimos * areaEnUnidad(unidad, anchoCm, altoCm) * cantidad);
  }
  return precioCentimos * cantidad;
}
