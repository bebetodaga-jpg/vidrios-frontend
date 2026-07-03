import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSesion } from '@modules/auth/use-sesion';

/** Bloquea el acceso sin sesión: redirige al login conservando la intención de entrar. */
export function RutaProtegida({ children }: { children: ReactNode }): ReactNode {
  const { sesion } = useSesion();
  if (!sesion) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
