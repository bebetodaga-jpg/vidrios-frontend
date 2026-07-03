/**
 * Tokens primitivos del sistema de diseño "Galaxia" (ver gestion-proyecto/ux-ui/sprint-0/sistema-de-diseno.md).
 * Para estilos propios fuera de Ant Design. AntD se configura en theme.ts a partir de estos valores.
 */
export const colores = {
  blue900: '#102A43',
  blue800: '#16335B', // marca / barras
  blue700: '#1E4976',
  blue600: '#2E6DA4',
  cyan500: '#0E9FD8', // acción primaria
  cyan600: '#0B85B5',
  cyan100: '#D6F0FA',
  green600: '#1E7A4F',
  amber500: '#D97706',
  red600: '#C53030',
  gray900: '#111827',
  gray700: '#374151',
  gray500: '#6B7280',
  gray300: '#D1D5DB',
  gray100: '#F3F4F6',
  white: '#FFFFFF',
} as const;

export const fuentes = {
  base: "'Segoe UI', Roboto, system-ui, sans-serif",
  mono: "Consolas, 'Roboto Mono', monospace", // dinero y medidas
} as const;

/** Tamaños de target táctil: tienda 44px, obra 48px (guantes). */
export const target = { tienda: 44, obra: 48 } as const;

/** font.size.display: total del POS y precio del cotizador — legible a 2 m. */
export const tamanoDisplay = 44;
