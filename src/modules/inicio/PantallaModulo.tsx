import { useLocation } from 'react-router-dom';
import { Empty, Typography } from 'antd';
import { itemPorRuta } from '@shared/layout/navegacion';
import { colores } from '@shared/tokens';

/**
 * Placeholder de los módulos aún no construidos en el frontend. Cada uno se reemplaza
 * por su pantalla real en su sprint (la ruta y el permiso por rol ya quedan cableados).
 */
export function PantallaModulo(): React.ReactNode {
  const ubicacion = useLocation();
  const item = itemPorRuta(ubicacion.pathname);

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', textAlign: 'center' }}>
      <Typography.Title level={3} style={{ color: colores.blue800 }}>
        {item?.etiqueta ?? 'Módulo'}
      </Typography.Title>
      <Empty
        description={
          <span>
            Pantalla en construcción — se entrega en el <b>Sprint {item?.sprint ?? '—'}</b>.
            <br />
            La ruta y el acceso por rol ya están listos desde el Sprint 0.
          </span>
        }
      />
    </div>
  );
}
