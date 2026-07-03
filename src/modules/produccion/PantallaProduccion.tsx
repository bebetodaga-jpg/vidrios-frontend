import { Tabs, Typography } from 'antd';
import { colores } from '@shared/tokens';
import { TabOrdenesCorte } from './TabOrdenesCorte';
import { TabCortesVenta } from './TabCortesVenta';
import { TabCorteManual } from './TabCorteManual';
import { TabCubicacion } from './TabCubicacion';

export function PantallaProduccion(): React.ReactNode {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ color: colores.blue800, marginTop: 0 }}>
        Producción
      </Typography.Title>
      <Tabs
        defaultActiveKey="cortes"
        items={[
          { key: 'mostrador', label: '🪟 Cortes de mostrador', children: <TabCortesVenta /> },
          { key: 'cortes', label: '✂️ Órdenes de corte', children: <TabOrdenesCorte /> },
          { key: 'manual', label: '📐 Optimizador manual', children: <TabCorteManual /> },
          { key: 'cubicacion', label: '📦 Cubicación y compras', children: <TabCubicacion /> },
        ]}
      />
    </div>
  );
}
