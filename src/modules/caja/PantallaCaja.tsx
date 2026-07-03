import { useCallback, useEffect, useState } from 'react';
import { Tabs, Typography } from 'antd';
import { useSesion } from '@modules/auth/use-sesion';
import { EstadoCaja, estadoCaja } from '@shared/api/caja';
import { colores } from '@shared/tokens';
import { TabCajaDia } from './TabCajaDia';
import { TabCierre } from './TabCierre';
import { TabCuentas } from './TabCuentas';

export function PantallaCaja(): React.ReactNode {
  const { sesion } = useSesion();
  const [caja, setCaja] = useState<EstadoCaja | null>(null);

  const cargar = useCallback(async () => {
    if (!sesion) return;
    try {
      setCaja(await estadoCaja(sesion.token));
    } catch {
      setCaja({ abierta: false });
    }
  }, [sesion]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ color: colores.blue800, marginTop: 0 }}>
        Caja
      </Typography.Title>
      <Tabs
        defaultActiveKey="dia"
        items={[
          { key: 'dia', label: '💵 Caja del día', children: <TabCajaDia caja={caja} onCambio={() => void cargar()} /> },
          { key: 'cierre', label: '🔒 Cierre de caja', children: <TabCierre caja={caja} onCerrada={() => void cargar()} /> },
          { key: 'cuentas', label: '📒 Cuentas por cobrar', children: <TabCuentas /> },
        ]}
      />
    </div>
  );
}
