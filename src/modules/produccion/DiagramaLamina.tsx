import type { PlanLamina } from '@shared/api/produccion';
import { colores } from '@shared/tokens';

/**
 * Diagrama del plan de corte: la lámina dibujada a escala con cada paño numerado y acotado.
 * Imprimible para el taller. Se usa en las órdenes de corte y en el optimizador manual.
 */
export function DiagramaLamina({ lamina, ancho = 400 }: { lamina: PlanLamina; ancho?: number }): React.ReactNode {
  const margen = 10;
  const escala = (ancho - 2 * margen) / lamina.anchoMm;
  const alto = lamina.altoMm * escala;
  return (
    <svg width={ancho} height={alto + 22} style={{ display: 'block' }}>
      <rect
        x={margen}
        y={margen}
        width={lamina.anchoMm * escala}
        height={alto}
        fill={lamina.origen === 'RETAZO' ? '#D6F0FA' : '#F3F4F6'}
        stroke={colores.blue800}
        strokeWidth={2}
      />
      {/* Retazos reutilizables: lo que sobra pero se conserva (NO es merma). Verde punteado. */}
      {lamina.sobrantes.map((s, i) => (
        <g key={`r${String(i)}`}>
          <rect
            x={margen + s.x * escala}
            y={margen + s.y * escala}
            width={s.anchoMm * escala}
            height={s.altoMm * escala}
            fill={colores.green600}
            fillOpacity={0.1}
            stroke={colores.green600}
            strokeDasharray="4 3"
          />
          {s.anchoMm * escala > 46 && s.altoMm * escala > 16 && (
            <text
              x={margen + (s.x + s.anchoMm / 2) * escala}
              y={margen + (s.y + s.altoMm / 2) * escala}
              textAnchor="middle"
              fontSize={10}
              fill={colores.green600}
              className="mono"
            >
              retazo {String(s.anchoMm)}×{String(s.altoMm)}
            </text>
          )}
        </g>
      ))}
      {lamina.colocaciones.map((c, i) => (
        <g key={i}>
          <rect
            x={margen + c.x * escala}
            y={margen + c.y * escala}
            width={c.anchoMm * escala}
            height={c.altoMm * escala}
            fill="#0E9FD8"
            fillOpacity={0.35}
            stroke={colores.cyan600}
          />
          <text
            x={margen + (c.x + c.anchoMm / 2) * escala}
            y={margen + (c.y + c.altoMm / 2) * escala}
            textAnchor="middle"
            fontSize={11}
            fill={colores.gray900}
            className="mono"
          >
            {String(i + 1)}· {String(c.anchoMm)}×{String(c.altoMm)}
            {c.rotado ? ' ↻' : ''}
          </text>
        </g>
      ))}
      <text x={margen} y={alto + 20} fontSize={11} fill={colores.gray700} className="mono">
        {lamina.origen} {String(lamina.anchoMm)}×{String(lamina.altoMm)} mm · uso {String(lamina.usoPct)}%
      </text>
    </svg>
  );
}
