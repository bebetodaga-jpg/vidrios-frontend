import type { VanoSync } from '@shared/api/obras';

/**
 * Cola OFFLINE de vanos medidos en campo (offline-first). Se guardan en el dispositivo apenas
 * se miden y se sincronizan después; si no hay señal, esperan aquí sin perderse.
 */
const CLAVE = 'galaxi.medidas.pendientes';

export interface VanoPendiente extends VanoSync {
  ambienteId: string;
  obraId: string;
}

function leerTodo(): VanoPendiente[] {
  const crudo = localStorage.getItem(CLAVE);
  if (!crudo) {
    return [];
  }
  try {
    return JSON.parse(crudo) as VanoPendiente[];
  } catch {
    return [];
  }
}

function escribir(lista: VanoPendiente[]): void {
  localStorage.setItem(CLAVE, JSON.stringify(lista));
}

export function guardarPendiente(vano: VanoPendiente): void {
  const lista = leerTodo();
  const sinEste = lista.filter((v) => v.id !== vano.id);
  escribir([...sinEste, vano]);
}

export function pendientesDeAmbiente(ambienteId: string): VanoPendiente[] {
  return leerTodo().filter((v) => v.ambienteId === ambienteId);
}

export function pendientesDeObra(obraId: string): VanoPendiente[] {
  return leerTodo().filter((v) => v.obraId === obraId);
}

export function totalPendientes(): number {
  return leerTodo().length;
}

/** Agrupa los pendientes por ambiente para enviarlos en lotes. */
export function pendientesPorAmbiente(): Map<string, VanoPendiente[]> {
  const mapa = new Map<string, VanoPendiente[]>();
  for (const v of leerTodo()) {
    const grupo = mapa.get(v.ambienteId) ?? [];
    grupo.push(v);
    mapa.set(v.ambienteId, grupo);
  }
  return mapa;
}

export function quitarPendientes(ids: string[]): void {
  const aQuitar = new Set(ids);
  escribir(leerTodo().filter((v) => !aQuitar.has(v.id)));
}
