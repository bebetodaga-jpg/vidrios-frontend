import type { ThemeConfig } from 'antd';
import { colores, fuentes } from './tokens';

/**
 * Tema Ant Design v5 de Vidrios Galaxi. Único lugar donde se configura la apariencia
 * global (decisión del sistema de diseño, Sprint 0 UX). Los componentes no fijan colores
 * sueltos: usan estos tokens o los de tokens.ts.
 */
export const temaGalaxi: ThemeConfig = {
  token: {
    colorPrimary: colores.cyan500,
    colorSuccess: colores.green600,
    colorWarning: colores.amber500,
    colorError: colores.red600,
    colorTextBase: colores.gray900,
    colorBgLayout: colores.gray100,
    fontFamily: fuentes.base,
    fontSize: 16,
    borderRadius: 8,
    controlHeight: 44, // target táctil mínimo en toda la app
  },
  components: {
    Table: { headerBg: colores.blue800, headerColor: colores.white, fontSize: 14 },
    Button: { fontWeight: 600 },
    Layout: { headerBg: colores.blue800, siderBg: colores.blue800 },
    Menu: { darkItemBg: colores.blue800, darkItemSelectedBg: colores.blue700 },
  },
};
