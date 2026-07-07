import type { MetodoPago } from '@shared/api/ventas';
import type { UnidadVenta } from '@shared/api/catalogo';

export interface ItemCarrito {
  key: string;
  codigo: string;
  nombre: string;
  unidadVenta: UnidadVenta;
  precioCentimos: number; // unitario (por pie²/m²/barrilla/unidad)
  cantidad: number;
  anchoMm?: number;
  altoMm?: number;
}

export interface VentaEnEspera {
  ref: string;
  hora: string;
  carrito: ItemCarrito[];
}

export interface DatosTicket {
  ventaId: string;
  numero: string;
  totalCentimos: number;
  metodoPago: MetodoPago;
  recibidoCentimos?: number;
  items: ItemCarrito[];
  cajera: string;
}
