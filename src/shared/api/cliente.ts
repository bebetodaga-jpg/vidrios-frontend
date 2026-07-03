/**
 * Cliente HTTP del backend. Centraliza el JWT, el prefijo /api y el formato de error
 * del backend ({ codigo, mensaje } en español listo para mostrar).
 */
export class ErrorApi extends Error {
  constructor(
    readonly codigo: string,
    mensaje: string,
    readonly status: number,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

type Metodo = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface CuerpoError {
  codigo?: string;
  mensaje?: string;
  message?: string | string[];
}

export async function pedirApi<T>(metodo: Metodo, ruta: string, token?: string, cuerpo?: unknown): Promise<T> {
  const respuesta = await fetch(`/api${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

  const datos: unknown = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    const e = datos as CuerpoError;
    const mensaje = e.mensaje ?? (Array.isArray(e.message) ? e.message.join(', ') : e.message) ?? 'Ocurrió un error.';
    throw new ErrorApi(e.codigo ?? 'ERROR', mensaje, respuesta.status);
  }

  return datos as T;
}
