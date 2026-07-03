import { ReactNode, useCallback, useMemo, useState } from 'react';
import { pedirApi } from '@shared/api/cliente';
import { CLAVE_SESION, Rol, Sesion, SesionContext } from './contexto';

interface RespuestaLogin {
  token: string;
  nombre: string;
  rol: Rol;
}

function leerSesionGuardada(): Sesion | null {
  const crudo = localStorage.getItem(CLAVE_SESION);
  if (!crudo) {
    return null;
  }
  try {
    return JSON.parse(crudo) as Sesion;
  } catch {
    return null;
  }
}

/** Mantiene la sesión (JWT + rol) y la persiste en el dispositivo para no re-loguear en cada arranque. */
export function SesionProvider({ children }: { children: ReactNode }): ReactNode {
  const [sesion, setSesion] = useState<Sesion | null>(leerSesionGuardada);

  const iniciarSesion = useCallback(async (usuario: string, password: string): Promise<void> => {
    const datos = await pedirApi<RespuestaLogin>('POST', '/auth/login', undefined, { usuario, password });
    const nueva: Sesion = { token: datos.token, nombre: datos.nombre, rol: datos.rol };
    localStorage.setItem(CLAVE_SESION, JSON.stringify(nueva));
    setSesion(nueva);
  }, []);

  const cerrarSesion = useCallback((): void => {
    localStorage.removeItem(CLAVE_SESION);
    setSesion(null);
  }, []);

  const valor = useMemo(() => ({ sesion, iniciarSesion, cerrarSesion }), [sesion, iniciarSesion, cerrarSesion]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}
