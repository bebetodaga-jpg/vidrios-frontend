import { pedirApi } from './cliente';

export interface ModeloCotizacion {
  clave: string;
  nombre: string;
  soloTemplado: boolean;
  solo10mm: boolean;
  descuentoFabricacion: string;
}
export interface ColorAluminio {
  clave: string;
  nombre: string;
  factor: number;
}
export interface PerfilDespiece {
  nombre: string;
  cantidad: number;
  largoCm: number;
}
export interface PanoDespiece {
  cantidad: number;
  anchoCm: number;
  altoCm: number;
}
export interface Despiece {
  perfiles: PerfilDespiece[];
  panos: PanoDespiece[];
  accesoriosExtra: { nombre: string; cantidad: number; precioCentimos: number }[];
}
export interface ItemCotizado {
  despiece: Despiece;
  metrosLinealesAluminio: number;
  m2Vidrio: number;
  unitCentimos: number;
  totalCentimos: number;
  vidrioNombre: string;
}
export interface ConfigItem {
  vanoCodigo: string;
  modelo: string;
  vidrioCodigo: string;
  color: string;
  anchoCm: number;
  altoCm: number;
  cantidad: number;
}
export interface ItemPersistido extends Omit<ConfigItem, 'modelo'> {
  modelo: string;
  vidrioNombre: string;
  unitCentimos: number;
  totalCentimos: number;
  despiece: Despiece;
}
export interface CotizacionResumen {
  id: string;
  numero: string;
  estado: 'BORRADOR' | 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA';
  cliente: string | null;
  totalCentimos: number;
  items: number;
  creadoEn: string;
}
export interface CotizacionDetalle extends CotizacionResumen {
  itemsDetalle: ItemPersistido[];
}

export const listarModelos = (token: string): Promise<{ modelos: ModeloCotizacion[]; colores: ColorAluminio[] }> =>
  pedirApi('GET', '/cotizaciones/modelos', token);

export const cotizarItem = (token: string, config: ConfigItem): Promise<ItemCotizado> =>
  pedirApi('POST', '/cotizaciones/cotizar-item', token, config);

export const crearCotizacion = (token: string, items: ConfigItem[], clienteId?: string, obraId?: string): Promise<{ id: string; numero: string }> =>
  pedirApi('POST', '/cotizaciones', token, { items, clienteId, obraId });

export const listarCotizaciones = (token: string): Promise<CotizacionResumen[]> => pedirApi('GET', '/cotizaciones', token);

export const detalleCotizacion = (token: string, id: string): Promise<CotizacionDetalle> => pedirApi('GET', `/cotizaciones/${id}`, token);

export const cambiarEstadoCotizacion = (token: string, id: string, estado: 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA'): Promise<{ ok: true }> =>
  pedirApi('POST', `/cotizaciones/${id}/estado`, token, { estado });
