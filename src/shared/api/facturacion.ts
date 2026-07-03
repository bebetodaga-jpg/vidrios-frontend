import { pedirApi } from './cliente';

export type TipoComprobante = 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO';
export type EstadoComprobante = 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'ANULADO';

/** Vista del comprobante que devuelve el backend (montos como texto "0.00"). */
export interface Comprobante {
  id: string;
  tipo: TipoComprobante;
  numero: string;
  estado: EstadoComprobante;
  cliente: string;
  documento: string | null;
  gravada: string;
  igv: string;
  total: string;
  motivoRechazo: string | null;
  enlacePdf: string | null;
}

export interface ClienteComprobante {
  tipoDoc: 'DNI' | 'RUC' | 'SIN_DOCUMENTO';
  numeroDoc?: string;
  nombre: string;
}

export const emitirComprobante = (
  token: string,
  ventaId: string,
  tipo: 'BOLETA' | 'FACTURA',
  cliente: ClienteComprobante,
): Promise<Comprobante> => pedirApi('POST', '/facturacion/emitir', token, { ventaId, tipo, cliente });

export const listarComprobantes = (token: string): Promise<Comprobante[]> =>
  pedirApi('GET', '/facturacion/comprobantes', token);

export const obtenerComprobante = (token: string, id: string): Promise<Comprobante> =>
  pedirApi('GET', `/facturacion/comprobantes/${id}`, token);

export const anularComprobante = (token: string, id: string, motivo: string): Promise<Comprobante> =>
  pedirApi('POST', `/facturacion/comprobantes/${id}/anular`, token, { motivo });

export const reintentarComprobante = (token: string, id: string): Promise<{ ok: true }> =>
  pedirApi('POST', `/facturacion/comprobantes/${id}/reintentar`, token);

/** Solo desarrollo: simula la caída/recuperación del PSE (espejo del toggle del prototipo). */
export const simularPse = (token: string, caido: boolean): Promise<{ pseCaido: boolean }> =>
  pedirApi('POST', '/facturacion/_dev/pse', token, { caido });
