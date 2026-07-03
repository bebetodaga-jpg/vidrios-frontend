import { createContext } from 'react';

export type Rol = 'CAJERA' | 'VENDEDORA' | 'CORTADOR' | 'AYUDANTE' | 'MAESTRO' | 'GERENTE';

export interface Sesion {
  readonly token: string;
  readonly nombre: string;
  readonly rol: Rol;
}

export interface ContextoSesion {
  readonly sesion: Sesion | null;
  // Firmas de propiedad-función (no de método): seguras de desestructurar (no dependen de `this`).
  readonly iniciarSesion: (usuario: string, password: string) => Promise<void>;
  readonly cerrarSesion: () => void;
}

export const SesionContext = createContext<ContextoSesion | null>(null);

export const CLAVE_SESION = 'galaxi.sesion';
