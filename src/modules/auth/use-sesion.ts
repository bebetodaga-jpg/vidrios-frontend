import { useContext } from 'react';
import { ContextoSesion, SesionContext } from './contexto';

/**
 * Acceso a la sesión actual. Lleva prefijo `use` por exigencia del idioma de React
 * (reglas de hooks), aunque el dominio del proyecto va en español.
 */
export function useSesion(): ContextoSesion {
  const contexto = useContext(SesionContext);
  if (!contexto) {
    throw new Error('useSesion debe usarse dentro de <SesionProvider>.');
  }
  return contexto;
}
