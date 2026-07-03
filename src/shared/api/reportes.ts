import { pedirApi } from './cliente';

export interface DiaVentas {
  fecha: string; // YYYY-MM-DD
  ventasCentimos: number;
  tickets: number;
}

export interface MargenObra {
  obraCodigo: string;
  cliente: string;
  contratadoCentimos: number;
  costosPersonalCentimos: number;
  margenCentimos: number;
  margenPct: number;
}

export interface PanelGerencial {
  ventasHoy: DiaVentas;
  ventasMes: { ventasCentimos: number; tickets: number };
  serie: DiaVentas[];
  porCobrar: { totalCentimos: number; cuentas: number; vencidasCentimos: number; vencidas: number };
  desperdicioPromedioPct: number;
  rankingProductos: { nombre: string; importeCentimos: number; unidades: number }[];
  rankingVendedores: { nombre: string; importeCentimos: number; tickets: number }[];
  margenObras: MargenObra[];
}

export interface Alertas {
  stockMinimo: { codigo: string; nombre: string; saldo: number; minimo: number }[];
  pagosVencidos: { cliente: string; numeroVenta: string; saldoCentimos: number; venceEn: string }[];
  obrasAtrasadas: { codigo: string; cliente: string; estado: string; dias: number }[];
}

export const panelGerencial = (token: string): Promise<PanelGerencial> => pedirApi('GET', '/reportes/panel', token);

export const alertasGerencia = (token: string): Promise<Alertas> => pedirApi('GET', '/reportes/alertas', token);
