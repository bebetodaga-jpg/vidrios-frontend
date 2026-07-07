import { pedirApi } from './cliente';

export type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';

export interface ItemVenta {
  codigo: string;
  cantidad: number;
  anchoMm?: number;
  altoMm?: number;
}

export interface ComandoVenta {
  items: ItemVenta[];
  metodoPago: MetodoPago;
  descuentoPct?: number;
  clienteId?: string;
}

export interface VentaConfirmada {
  id: string;
  numero: string;
  totalCentimos: number;
}

export function confirmarVenta(token: string, comando: ComandoVenta): Promise<VentaConfirmada> {
  return pedirApi('POST', '/ventas', token, comando);
}
