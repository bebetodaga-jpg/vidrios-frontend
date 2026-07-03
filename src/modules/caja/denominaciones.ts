/** Denominaciones del sol para el conteo físico del cierre ciego (mayor a menor). */
export const DENOMINACIONES = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1] as const;

export function etiquetaDenominacion(d: number): string {
  return d >= 1 ? `S/ ${String(d)}` : `${String(d * 100)} cts`;
}

/** Conteo de piezas por denominación (puede faltar una clave → undefined). */
export type ConteoCaja = Record<number, number | undefined>;

/** Suma el efectivo contado (en céntimos) a partir del número de piezas por denominación. */
export function totalContadoCentimos(conteo: ConteoCaja): number {
  return DENOMINACIONES.reduce((suma, d) => suma + Math.round(d * 100) * (conteo[d] ?? 0), 0);
}
