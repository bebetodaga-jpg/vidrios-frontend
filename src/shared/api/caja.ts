import { pedirApi } from './cliente';
import type { MetodoPago } from './ventas';

export type MetodoCaja = 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';

export interface EstadoCaja {
  abierta: boolean;
  sesionId?: string;
  montoInicialCentimos?: number;
  abiertaEn?: string;
}

export interface MovimientoCaja {
  creadoEn: string;
  tipo: 'VENTA' | 'INGRESO' | 'EGRESO' | 'COBRO_CREDITO';
  metodo: MetodoPago;
  concepto: string;
  montoCentimos: number;
}

export type EstadoDiferencia = 'CUADRA' | 'DIFERENCIA_MENOR' | 'REVISAR';

export interface FilaCierre {
  metodo: MetodoCaja;
  esperadoCentimos: number;
  declaradoCentimos: number;
  diferenciaCentimos: number;
  estado: EstadoDiferencia;
}

export interface ReporteCierre {
  sesion: { id: string };
  filas: FilaCierre[];
}

export interface CuentaPorCobrar {
  id: string;
  cliente: string;
  numeroVenta: string;
  saldoCentimos: number;
  venceEn: string;
  estado: 'VIGENTE' | 'POR_VENCER' | 'VENCIDO';
}

export const estadoCaja = (token: string): Promise<EstadoCaja> => pedirApi('GET', '/caja/actual', token);

export const abrirCaja = (token: string, montoInicialCentimos: number): Promise<{ sesionId: string }> =>
  pedirApi('POST', '/caja/abrir', token, { montoInicialCentimos });

export const movimientosCaja = (token: string): Promise<MovimientoCaja[]> =>
  pedirApi('GET', '/caja/actual/movimientos', token);

export const registrarMovimientoCaja = (
  token: string,
  datos: { tipo: 'INGRESO' | 'EGRESO'; metodo: MetodoCaja; concepto: string; montoCentimos: number },
): Promise<{ ok: true }> => pedirApi('POST', '/caja/movimientos', token, datos);

export const cerrarCaja = (
  token: string,
  declarado: { efectivoCentimos: number; tarjetaCentimos: number; yapeCentimos: number },
): Promise<{ sesionId: string; mensaje: string }> => pedirApi('POST', '/caja/cerrar', token, declarado);

export const reporteCierre = (token: string, sesionId: string): Promise<ReporteCierre> =>
  pedirApi('GET', `/caja/cierres/${sesionId}/reporte`, token);

export const cuentasPorCobrar = (token: string): Promise<CuentaPorCobrar[]> =>
  pedirApi('GET', '/caja/cuentas-por-cobrar', token);

export const registrarCobro = (
  token: string,
  cuentaId: string,
  montoCentimos: number,
  metodo: MetodoCaja,
): Promise<{ saldoRestanteCentimos: number }> =>
  pedirApi('POST', `/caja/cuentas-por-cobrar/${cuentaId}/cobros`, token, { montoCentimos, metodo });
