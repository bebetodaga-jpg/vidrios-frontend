import { pedirApi } from './cliente';

export type EstadoObra = 'MEDICION' | 'REMETREO' | 'CORTE' | 'FABRICACION' | 'INSTALACION' | 'ENTREGADA';

export const ORDEN_ESTADOS_OBRA: EstadoObra[] = ['MEDICION', 'REMETREO', 'CORTE', 'FABRICACION', 'INSTALACION', 'ENTREGADA'];

export interface ObraResumen {
  id: string;
  codigo: string;
  cliente: string;
  direccion: string;
  estado: EstadoObra;
  vanos: number;
  creadoEn: string;
}

export interface MedidaVista {
  id: string;
  tipo: string;
  anchoCm: number;
  altoCm: number;
  autor: string;
  creadoEn: string;
}

export interface VanoVista {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  cantidad: number;
  tieneDetalle: boolean;
  fotoUrl: string | null;
  medidaActual: { anchoCm: number; altoCm: number } | null;
  medidas: MedidaVista[];
}

export interface AmbienteVista {
  id: string;
  nombre: string;
  vanos: VanoVista[];
}

export interface ObraDetalle {
  id: string;
  codigo: string;
  cliente: string;
  direccion: string;
  estado: EstadoObra;
  ambientes: AmbienteVista[];
}

export interface VanoSync {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  cantidad: number;
  tieneDetalle: boolean;
  fotoUrl?: string;
  medidas: { id: string; tipo: 'INICIAL' | 'REMETREO'; anchoCm: number; altoCm: number }[];
}

export const TIPOS_TRABAJO = [
  'Ventana corrediza (serie)',
  'Mampara (serie)',
  'Vitrovén',
  'Guillotina',
  'Pivotante',
  'Spider',
  'Paño fijo',
  'Otro',
];

export const crearClienteObra = (
  token: string,
  datos: { tipoDoc: 'DNI' | 'RUC' | 'SIN_DOCUMENTO'; numeroDoc?: string; nombre: string; telefono?: string },
): Promise<{ id: string }> => pedirApi('POST', '/clientes', token, datos);

export const listarObras = (token: string): Promise<ObraResumen[]> => pedirApi('GET', '/obras', token);

export const crearObra = (token: string, clienteId: string, direccion: string): Promise<{ id: string; codigo: string }> =>
  pedirApi('POST', '/obras', token, { clienteId, direccion });

export const detalleObra = (token: string, id: string): Promise<ObraDetalle> => pedirApi('GET', `/obras/${id}`, token);

export const agregarAmbiente = (token: string, obraId: string, nombre: string): Promise<{ id: string }> =>
  pedirApi('POST', `/obras/${obraId}/ambientes`, token, { nombre });

export const sincronizarLote = (
  token: string,
  ambienteId: string,
  vanos: VanoSync[],
): Promise<{ vanos: number; medidas: number }> => pedirApi('POST', '/obras/sincronizar', token, { ambienteId, vanos });

export const registrarMedida = (
  token: string,
  vanoId: string,
  anchoCm: number,
  altoCm: number,
): Promise<{ tipo: string }> => pedirApi('POST', `/obras/vanos/${vanoId}/medidas`, token, { anchoCm, altoCm });

export const avanzarEstadoObra = (token: string, obraId: string, estado: EstadoObra): Promise<{ estado: EstadoObra }> =>
  pedirApi('POST', `/obras/${obraId}/estado`, token, { estado });
