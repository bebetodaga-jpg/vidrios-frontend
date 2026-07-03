import { Familia, FilaCarga, UnidadVenta } from '@shared/api/catalogo';

/**
 * Mapeo del Excel del dueño (columnas en español, formato libre) a las filas que espera el
 * backend. Funciones puras: validan enums y precio en el cliente para marcar la celda en rojo
 * antes de enviar; las reglas de negocio (p. ej. crudo por pie²) las valida el backend por fila.
 */
export type FilaMapeada =
  | { readonly ok: true; readonly fila: FilaCarga }
  | { readonly ok: false; readonly error: { fila: number; codigo: string; mensaje: string } };

export type RegistroExcel = Record<string, unknown>;

function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Busca un valor por varios nombres posibles de columna (sin distinguir mayúsculas/acentos). */
function valorDe(registro: RegistroExcel, alias: string[]): string {
  const claves = new Map(Object.keys(registro).map((k) => [sinAcentos(k).toLowerCase().trim(), k]));
  for (const a of alias) {
    const clave = claves.get(sinAcentos(a).toLowerCase());
    if (clave !== undefined) {
      // Las celdas de Excel son string/number/boolean; cualquier otra cosa se ignora.
      const valor = registro[clave];
      if (typeof valor === 'string') {
        return valor.trim();
      }
      if (typeof valor === 'number' || typeof valor === 'boolean') {
        return String(valor);
      }
      return '';
    }
  }
  return '';
}

function mapearFamilia(texto: string): Familia | null {
  const t = texto.toLowerCase();
  if (t.includes('vidrio')) return 'VIDRIO';
  if (t.includes('perfil') || t.includes('aluminio')) return 'PERFIL';
  if (t.includes('accesorio')) return 'ACCESORIO';
  return null;
}

function mapearUnidad(texto: string): UnidadVenta | null {
  const t = texto.toLowerCase().replace('²', '2');
  if (t.includes('pie')) return 'PIE2';
  if (t.includes('6.40') || t.includes('6,40') || t.includes('640')) return 'BARRILLA_640';
  if (t.includes('barrilla') || t.includes('6.00') || t.includes('6,00') || t.includes('600')) return 'BARRILLA_600';
  if (t === 'm2' || t.startsWith('m2') || t.includes('metro')) return 'M2';
  if (t.includes('unidad') || t === 'und' || t === 'un' || t === 'unid') return 'UNIDAD';
  return null;
}

export function mapearFila(registro: RegistroExcel, fila: number): FilaMapeada {
  const codigo = valorDe(registro, ['codigo', 'código', 'cod']);
  const nombre = valorDe(registro, ['producto', 'nombre', 'descripcion', 'descripción']);
  const err = (mensaje: string): FilaMapeada => ({ ok: false, error: { fila, codigo, mensaje } });

  if (codigo.length < 3) return err('Falta el código (mínimo 3 caracteres).');
  if (nombre.length < 3) return err('Falta el nombre del producto.');

  const familia = mapearFamilia(valorDe(registro, ['familia']));
  if (!familia) return err('Familia no reconocida: use Vidrio, Perfil o Accesorio.');

  const subfamilia = valorDe(registro, ['subfamilia', 'sub familia', 'sub-familia']);
  if (subfamilia.length < 2) return err('Falta la subfamilia.');

  const unidadVenta = mapearUnidad(valorDe(registro, ['unidad', 'unidad de venta', 'um', 'unidad venta']));
  if (!unidadVenta) return err('Unidad no reconocida: use pie², m², barrilla o unidad.');

  const precioTexto = valorDe(registro, ['precio', 'precio venta', 'p. venta', 'precio unitario']).replace(',', '.');
  const precio = Number(precioTexto);
  if (!precioTexto || Number.isNaN(precio) || precio <= 0) return err('Falta el precio o no es válido.');

  const stockMinTexto = valorDe(registro, ['stock minimo', 'stock mínimo', 'minimo', 'stockmin', 'stock min']);
  const stockMinimo = stockMinTexto ? Math.max(0, Math.trunc(Number(stockMinTexto) || 0)) : 0;

  let grosorMm: number | undefined;
  if (familia === 'VIDRIO') {
    const grosorTexto = valorDe(registro, ['grosor', 'espesor', 'mm']);
    const grosor = Number(grosorTexto);
    if (!grosorTexto || Number.isNaN(grosor) || grosor <= 0) {
      return err('El vidrio requiere el grosor en mm.');
    }
    grosorMm = Math.trunc(grosor);
  }

  return {
    ok: true,
    fila: { fila, codigo, nombre, familia, subfamilia, unidadVenta, precioCentimos: Math.round(precio * 100), stockMinimo, grosorMm },
  };
}
