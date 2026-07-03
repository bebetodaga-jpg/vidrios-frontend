import { pedirApi } from './cliente';

export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

export interface FilaKardex {
  fecha: string;
  tipo: TipoMovimiento;
  referencia: string;
  cantidad: number;
  costoCentimos: number;
  saldo: number;
  costoPromedioCentimos: number;
  saldoValorizadoCentimos: number;
}

export interface SaldoStock {
  codigo: string;
  saldo: number;
}

export function consultarKardex(token: string, codigo: string): Promise<FilaKardex[]> {
  return pedirApi<FilaKardex[]>('GET', `/inventario/kardex/${codigo}`, token);
}

export function consultarStock(token: string): Promise<SaldoStock[]> {
  return pedirApi<SaldoStock[]>('GET', '/inventario/stock', token);
}

export interface NuevoMovimiento {
  codigoProducto: string;
  tipo: TipoMovimiento;
  cantidad: number;
  costoCentimos: number;
  referencia: string;
}

export function registrarMovimiento(token: string, datos: NuevoMovimiento): Promise<{ saldo: number }> {
  return pedirApi('POST', '/inventario/movimientos', token, datos);
}
