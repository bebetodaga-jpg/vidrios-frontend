import { pedirApi } from './cliente';

export interface ContratoResumen {
  id: string;
  numero: string;
  estado: 'VIGENTE' | 'ANULADO';
  cliente: string | null;
  totalCentimos: number;
  adelantoCentimos: number;
  pagadoCentimos: number;
  saldoPendienteCentimos: number;
  tieneFirma: boolean;
  creadoEn: string;
}

export interface ContratoDetalle extends ContratoResumen {
  cotizacionNumero: string;
  saldoCentimos: number;
  firmaDataUrl: string | null;
}

export const crearContrato = (
  token: string,
  cotizacionId: string,
  adelantoPct?: number,
  firmaDataUrl?: string,
): Promise<{ id: string; numero: string }> => pedirApi('POST', '/contratos', token, { cotizacionId, adelantoPct, firmaDataUrl });

export const listarContratos = (token: string): Promise<ContratoResumen[]> => pedirApi('GET', '/contratos', token);

export const detalleContrato = (token: string, id: string): Promise<ContratoDetalle> => pedirApi('GET', `/contratos/${id}`, token);

export const pagarContrato = (
  token: string,
  id: string,
  montoCentimos: number,
  metodo: 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN',
): Promise<{ pagadoCentimos: number; saldoPendienteCentimos: number }> =>
  pedirApi('POST', `/contratos/${id}/pagos`, token, { montoCentimos, metodo });

export const firmarContrato = (token: string, id: string, dataUrl: string): Promise<{ ok: true }> =>
  pedirApi('POST', `/contratos/${id}/firma`, token, { dataUrl });
