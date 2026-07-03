import { pedirApi } from './cliente';

export type Familia = 'VIDRIO' | 'PERFIL' | 'ACCESORIO';
export type UnidadVenta = 'PIE2' | 'M2' | 'BARRILLA_600' | 'BARRILLA_640' | 'UNIDAD';

export interface ProductoCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  familia: Familia;
  subfamilia: string;
  unidadVenta: UnidadVenta;
  precioCentimos: number;
  precio: string;
  stockMinimo: number;
  grosorMm: number | null;
}

export const ETIQUETA_FAMILIA: Record<Familia, string> = {
  VIDRIO: 'Vidrio',
  PERFIL: 'Perfil aluminio',
  ACCESORIO: 'Accesorio',
};

export const ETIQUETA_UNIDAD: Record<UnidadVenta, string> = {
  PIE2: 'pie²',
  M2: 'm²',
  BARRILLA_600: 'barrilla 6.00 m',
  BARRILLA_640: 'barrilla 6.40 m',
  UNIDAD: 'unidad',
};

/** Subfamilias sugeridas por familia (decisión del dueño, Sprint 1). */
export const SUBFAMILIAS: Record<Familia, string[]> = {
  VIDRIO: ['Crudo', 'Templado', 'Catedral', 'Espejo', 'Laminado', 'Reflejante'],
  PERFIL: ['Serie 20', 'Serie 25', 'Serie 42', 'Tubulares'],
  ACCESORIO: ['Garruchas', 'Cerraduras', 'Selladores', 'Felpas y tornillería'],
};

export function buscarProductos(token: string, texto: string): Promise<ProductoCatalogo[]> {
  return pedirApi<ProductoCatalogo[]>('GET', `/catalogo/productos?buscar=${encodeURIComponent(texto)}`, token);
}

export interface DatosNuevoProducto {
  codigo: string;
  nombre: string;
  familia: Familia;
  subfamilia: string;
  unidadVenta: UnidadVenta;
  precioCentimos: number;
  stockMinimo: number;
  grosorMm?: number;
}

export function crearProducto(token: string, datos: DatosNuevoProducto): Promise<{ id: string; codigo: string }> {
  return pedirApi('POST', '/catalogo/productos', token, datos);
}

export function actualizarPrecio(token: string, codigo: string, precioCentimos: number): Promise<{ precio: string }> {
  return pedirApi('PATCH', `/catalogo/productos/${codigo}/precio`, token, { precioCentimos });
}

export interface FilaCarga extends DatosNuevoProducto {
  fila: number;
}

export interface ReporteCarga {
  creados: number;
  actualizados: number;
  errores: { fila: number; codigo: string; mensaje: string }[];
}

export function cargaMasiva(token: string, filas: FilaCarga[]): Promise<ReporteCarga> {
  return pedirApi('POST', '/catalogo/productos/carga-masiva', token, { filas });
}
