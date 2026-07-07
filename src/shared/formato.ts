/** Formato de dinero del sistema: céntimos → "S/ 1,250.50" (precios siempre inc. IGV). */
export function soles(centimos: number): string {
  return 'S/ ' + (centimos / 100).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Soles (texto/numero) → céntimos enteros, para enviar al backend. */
export function aCentimos(soles: number): number {
  return Math.round(soles * 100);
}

/** Medida en MILÍMETROS ENTEROS (la unidad mínima del taller); null/indefinido → 0. */
export function aMmEntero(valor: number | null | undefined): number {
  return Math.round(valor ?? 0);
}
