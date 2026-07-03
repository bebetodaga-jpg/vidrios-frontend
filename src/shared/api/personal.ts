import { pedirApi } from './cliente';

export type Especialidad = 'MAESTRO_OBRA' | 'CORTADOR' | 'INSTALADOR' | 'AYUDANTE';
export type TipoPagoPersonal = 'ADELANTO' | 'PAGO' | 'DESTAJO';

export const ETIQUETA_ESPECIALIDAD: Record<Especialidad, string> = {
  MAESTRO_OBRA: 'Maestro de obra',
  CORTADOR: 'Cortador',
  INSTALADOR: 'Instalador',
  AYUDANTE: 'Ayudante',
};

export const ETIQUETA_TIPO_PAGO: Record<TipoPagoPersonal, string> = {
  ADELANTO: 'Adelanto',
  PAGO: 'Pago',
  DESTAJO: 'Destajo',
};

export interface PersonaTaller {
  id: string;
  nombre: string;
  dni: string;
  telefono: string | null;
  especialidad: Especialidad;
  hayActividad: boolean;
  creadoEn: string;
}

export interface IntegranteCuadrilla {
  personalId: string;
  nombre: string;
  especialidad: Especialidad;
  rol: Especialidad;
}

export interface CuadrillaVista {
  id: string;
  nombre: string;
  obraId: string;
  obraCodigo: string;
  integrantes: IntegranteCuadrilla[];
}

export interface PagoPersonalVista {
  id: string;
  tipo: TipoPagoPersonal;
  concepto: string;
  montoCentimos: number;
  obraId: string | null;
  creadoEn: string;
}

export interface ResumenPagosPersonal {
  totalCentimos: number;
  adelantosCentimos: number;
  pagosCentimos: number;
  destajosCentimos: number;
  cantidadPagos: number;
}

export const registrarPersona = (
  token: string,
  datos: { nombre: string; dni: string; especialidad: Especialidad; telefono?: string },
): Promise<{ id: string }> => pedirApi('POST', '/personal', token, datos);

export const listarPersonal = (token: string, buscar?: string): Promise<PersonaTaller[]> =>
  pedirApi('GET', `/personal${buscar ? `?buscar=${encodeURIComponent(buscar)}` : ''}`, token);

export const crearCuadrilla = (token: string, obraId: string, nombre: string): Promise<{ id: string }> =>
  pedirApi('POST', '/personal/cuadrillas', token, { obraId, nombre });

export const listarCuadrillas = (token: string, obraId?: string): Promise<CuadrillaVista[]> =>
  pedirApi('GET', `/personal/cuadrillas${obraId ? `?obraId=${obraId}` : ''}`, token);

export const asignarCuadrilla = (token: string, cuadrillaId: string, personalId: string, rol: Especialidad): Promise<{ ok: true }> =>
  pedirApi('POST', `/personal/cuadrillas/${cuadrillaId}/asignaciones`, token, { personalId, rol });

export const quitarDeCuadrilla = (token: string, cuadrillaId: string, personalId: string): Promise<{ ok: true }> =>
  pedirApi('DELETE', `/personal/cuadrillas/${cuadrillaId}/asignaciones/${personalId}`, token);

export const registrarPagoPersonal = (
  token: string,
  personalId: string,
  datos: { tipo: TipoPagoPersonal; concepto: string; montoCentimos: number; obraId?: string },
): Promise<{ id: string }> => pedirApi('POST', `/personal/${personalId}/pagos`, token, datos);

export const pagosDePersona = (token: string, personalId: string): Promise<{ pagos: PagoPersonalVista[]; resumen: ResumenPagosPersonal }> =>
  pedirApi('GET', `/personal/${personalId}/pagos`, token);
