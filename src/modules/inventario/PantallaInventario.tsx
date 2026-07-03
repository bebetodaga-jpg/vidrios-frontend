import { Tabs, Typography } from 'antd';
import { colores } from '@shared/tokens';
import { TabKardex } from './TabKardex';
import { TabCargaExcel } from './TabCargaExcel';

export function PantallaInventario(): React.ReactNode {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ color: colores.blue800, marginTop: 0 }}>
        Inventario
      </Typography.Title>
      <Tabs
        defaultActiveKey="kardex"
        items={[
          { key: 'kardex', label: '📋 Kárdex', children: <TabKardex /> },
          { key: 'carga', label: '📥 Carga desde Excel', children: <TabCargaExcel /> },
        ]}
      />
    </div>
  );
}
