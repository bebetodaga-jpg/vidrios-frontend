import type { ReactNode } from 'react';
import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  DollarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  HomeOutlined,
  InboxOutlined,
  ScissorOutlined,
  ShopOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { Rol } from '@modules/auth/contexto';

export interface ItemNav {
  readonly clave: string;
  readonly etiqueta: string;
  readonly ruta: string;
  readonly icono: ReactNode;
  readonly roles: readonly Rol[];
  /** Módulos de campo: se operan con la PWA en obra (modo obra; offline). */
  readonly modoObra?: boolean;
  readonly sprint: number;
}

const TODOS: Rol[] = ['CAJERA', 'VENDEDORA', 'CORTADOR', 'AYUDANTE', 'MAESTRO', 'GERENTE'];

// Mapa de procesos → módulos del TDR. Cada uno se habilita en su sprint; aquí van las rutas.
export const NAVEGACION: readonly ItemNav[] = [
  { clave: 'inicio', etiqueta: 'Inicio', ruta: '/', icono: <HomeOutlined />, roles: TODOS, sprint: 0 },
  { clave: 'pos', etiqueta: 'Punto de venta', ruta: '/pos', icono: <ShopOutlined />, roles: ['CAJERA', 'VENDEDORA', 'GERENTE'], sprint: 2 },
  { clave: 'caja', etiqueta: 'Caja', ruta: '/caja', icono: <DollarOutlined />, roles: ['CAJERA', 'GERENTE'], sprint: 3 },
  { clave: 'facturacion', etiqueta: 'Facturación', ruta: '/facturacion', icono: <AuditOutlined />, roles: ['CAJERA', 'VENDEDORA', 'GERENTE'], sprint: 4 },
  { clave: 'catalogo', etiqueta: 'Catálogo', ruta: '/catalogo', icono: <AppstoreOutlined />, roles: ['GERENTE', 'VENDEDORA'], sprint: 1 },
  { clave: 'inventario', etiqueta: 'Inventario', ruta: '/inventario', icono: <InboxOutlined />, roles: ['GERENTE'], sprint: 1 },
  { clave: 'cotizaciones', etiqueta: 'Cotizaciones', ruta: '/cotizaciones', icono: <FileTextOutlined />, roles: ['VENDEDORA', 'GERENTE'], sprint: 6 },
  { clave: 'contratos', etiqueta: 'Contratos', ruta: '/contratos', icono: <FileDoneOutlined />, roles: ['VENDEDORA', 'GERENTE'], sprint: 7 },
  { clave: 'obras', etiqueta: 'Obras', ruta: '/obras', icono: <ToolOutlined />, roles: ['MAESTRO', 'AYUDANTE', 'GERENTE'], modoObra: true, sprint: 5 },
  { clave: 'produccion', etiqueta: 'Producción', ruta: '/produccion', icono: <ScissorOutlined />, roles: ['CORTADOR', 'GERENTE'], modoObra: true, sprint: 8 },
  { clave: 'personal', etiqueta: 'Personal', ruta: '/personal', icono: <TeamOutlined />, roles: ['MAESTRO', 'GERENTE'], sprint: 10 },
  { clave: 'reportes', etiqueta: 'Reportes', ruta: '/reportes', icono: <BarChartOutlined />, roles: ['GERENTE'], sprint: 11 },
];

export function navegacionPara(rol: Rol): ItemNav[] {
  return NAVEGACION.filter((item) => item.roles.includes(rol));
}

export function itemPorRuta(ruta: string): ItemNav | undefined {
  return NAVEGACION.find((item) => item.ruta === ruta);
}
