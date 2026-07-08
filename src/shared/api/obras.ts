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
  anchoMm: number;
  altoMm: number;
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
  medidaActual: { anchoMm: number; altoMm: number } | null;
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
  medidas: { id: string; tipo: 'INICIAL' | 'REMETREO'; anchoMm: number; altoMm: number }[];
}

/** Lista base de tipos (respaldo offline); la completa el backend con los tipos ya usados. */
export const TIPOS_TRABAJO = [
  'Ventana corrediza (serie)',
  'Mampara (serie)',
  'Vitrovén',
  'Guillotina',
  'Pivotante',
  'Spider',
  'Paño fijo',
  'Ventana SERIE 25',
];

/** Tipos de trabajo para selección rápida: base + todos los escritos a mano en vanos. */
export const listarTiposTrabajo = (token: string): Promise<string[]> => pedirApi('GET', '/obras/tipos-trabajo', token);

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
): Promise<{ vanos: number; medidas: number }> =>
  pedirApi('POST', '/obras/sincronizar', token, {
    ambienteId,
    // Solo los campos del DTO: los vanos del almacén offline traen extras (obraId/ambienteId)
    // que el backend rechaza por whitelist estricta.
    vanos: vanos.map((v) => ({
      id: v.id,
      codigo: v.codigo,
      nombre: v.nombre,
      tipo: v.tipo,
      cantidad: v.cantidad,
      tieneDetalle: v.tieneDetalle,
      ...(v.fotoUrl !== undefined && { fotoUrl: v.fotoUrl }),
      medidas: v.medidas.map((m) => ({ id: m.id, tipo: m.tipo, anchoMm: m.anchoMm, altoMm: m.altoMm })),
    })),
  });

export const registrarMedida = (
  token: string,
  vanoId: string,
  anchoMm: number,
  altoMm: number,
): Promise<{ tipo: string }> => pedirApi('POST', `/obras/vanos/${vanoId}/medidas`, token, { anchoMm, altoMm });

export const avanzarEstadoObra = (token: string, obraId: string, estado: EstadoObra): Promise<{ estado: EstadoObra }> =>
  pedirApi('POST', `/obras/${obraId}/estado`, token, { estado });
