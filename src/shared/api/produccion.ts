import { pedirApi } from './cliente';

export interface Colocacion {
  etiqueta: string;
  x: number;
  y: number;
  anchoCm: number;
  altoCm: number;
  rotado: boolean;
}
export interface Sobrante {
  x: number;
  y: number;
  anchoCm: number;
  altoCm: number;
}
export interface PlanLamina {
  laminaId: string;
  origen: 'PLANCHA' | 'RETAZO';
  anchoCm: number;
  altoCm: number;
  colocaciones: Colocacion[];
  sobrantes: Sobrante[];
  usoPct: number;
}
export interface Plan2D {
  laminas: PlanLamina[];
  planchasNuevas: number;
  retazosUsados: string[];
  desperdicioPct: number;
  retazoUtilPct: number;
  mermaRealPct: number;
}
export interface PlanVidrio {
  vidrioCodigo: string;
  vidrioNombre: string;
  plan: Plan2D;
  retazosCreados: string[];
}
export interface BarraPlan {
  piezas: { nombre: string; largoCm: number }[];
  usadoCm: number;
  sobranteCm: number;
}
export interface ResultadoCorte {
  vidrios: PlanVidrio[];
  perfiles: { barras: BarraPlan[]; totalBarras: number; desperdicioPct: number };
}
export interface OrdenCorte {
  id: string;
  numero: string;
  cotizacionNumero: string;
  estado: 'PENDIENTE' | 'LISTA' | 'ERROR';
  resultado: ResultadoCorte | null;
  error: string | null;
  creadoEn: string;
}

export interface VidrioCubicado {
  codigo: string;
  nombre: string;
  m2: number;
  planchasEstimadas: number;
  stockPlanchas: number;
  faltantePlanchas: number;
}
export interface Cubicacion {
  vidrios: VidrioCubicado[];
  perfiles: { nombre: string; metrosLineales: number; barrillasEstimadas: number }[];
  accesorios: { nombre: string; cantidad: number }[];
}
export interface OrdenCompra {
  id: string;
  numero: string;
  estado: 'PENDIENTE' | 'RECIBIDA';
  items: { codigo: string; nombre: string; cantidad: number }[];
  creadoEn: string;
}

export type PlanCorte2D = Plan2D;
export interface PanoManual {
  etiqueta: string;
  anchoCm: number;
  altoCm: number;
  cantidad: number;
}
export interface EntradaCorteManual {
  vidrioCodigo: string;
  planchaAnchoCm: number;
  planchaAltoCm: number;
  usarRetazos: boolean;
  panos: PanoManual[];
}
export interface ResumenCorteManual {
  retazosUsados: string[];
  retazosCreados: string[];
  desperdicioPct: number;
  planchasNuevas: number;
}

/** Optimizador manual: calcula el acomodo geométrico (simulación, sin tocar inventario). */
export const calcularCorteManual = (token: string, entrada: EntradaCorteManual): Promise<PlanCorte2D> =>
  pedirApi('POST', '/produccion/corte-manual/calcular', token, entrada);

/** Confirma el corte manual: descuenta retazos usados y registra los sobrantes en inventario. */
export const confirmarCorteManual = (token: string, entrada: EntradaCorteManual): Promise<ResumenCorteManual> =>
  pedirApi('POST', '/produccion/corte-manual/confirmar', token, entrada);

export interface CorteVenta {
  id: string;
  ventaNumero: string;
  productoCodigo: string;
  productoNombre: string;
  anchoCm: number;
  altoCm: number;
  cantidad: number;
  estado: 'PENDIENTE' | 'CORTADO';
  creadoEn: string;
}

/** Cortes de mostrador: vidrio a medida vendido en el POS que llegó al taller automáticamente. */
export const listarCortesVenta = (token: string): Promise<CorteVenta[]> => pedirApi('GET', '/produccion/cortes-venta', token);

export const marcarCorteVentaCortado = (token: string, id: string): Promise<{ ok: true }> =>
  pedirApi('POST', `/produccion/cortes-venta/${id}/cortado`, token);

export const generarOrdenCorte = (token: string, cotizacionId: string): Promise<{ id: string; numero: string }> =>
  pedirApi('POST', '/produccion/ordenes-corte', token, { cotizacionId });

export const listarOrdenesCorte = (token: string): Promise<OrdenCorte[]> => pedirApi('GET', '/produccion/ordenes-corte', token);

export const detalleOrdenCorte = (token: string, id: string): Promise<OrdenCorte> => pedirApi('GET', `/produccion/ordenes-corte/${id}`, token);

export const obtenerCubicacion = (token: string, cotizacionId: string): Promise<Cubicacion> =>
  pedirApi('GET', `/produccion/cubicacion/${cotizacionId}`, token);

export const crearOrdenCompra = (token: string, items: { codigo: string; nombre: string; cantidad: number }[]): Promise<{ id: string; numero: string }> =>
  pedirApi('POST', '/produccion/ordenes-compra', token, { items });

export const listarOrdenesCompra = (token: string): Promise<OrdenCompra[]> => pedirApi('GET', '/produccion/ordenes-compra', token);

export const recibirOrdenCompra = (token: string, id: string, costos: { codigo: string; costoCentimos: number }[]): Promise<{ numero: string }> =>
  pedirApi('POST', `/produccion/ordenes-compra/${id}/recibir`, token, { costos });
