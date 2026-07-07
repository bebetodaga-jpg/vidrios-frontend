import { useCallback, useEffect, useState } from 'react';
import { App, Badge, Button, Empty, Space, Table, Tag } from 'antd';
import { CheckOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { CorteVenta, listarCortesVenta, marcarCorteVentaCortado } from '@shared/api/produccion';
import { colores } from '@shared/tokens';

/**
 * Cola de cortes que llegan del POS: todo vidrio a medida vendido en ventas aparece aquí
 * automáticamente (evento `venta.confirmada`), listo para que el taller lo corte.
 */
export function TabCortesVenta(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const [cortes, setCortes] = useState<CorteVenta[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!sesion) return;
    setCargando(true);
    try {
      setCortes(await listarCortesVenta(sesion.token));
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudieron cargar los cortes de venta.');
    } finally {
      setCargando(false);
    }
  }, [sesion, message]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function marcar(id: string): Promise<void> {
    if (!sesion) return;
    try {
      await marcarCorteVentaCortado(sesion.token, id);
      message.success('Marcado como cortado.');
      setCortes((c) => c.filter((x) => x.id !== id));
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo marcar el corte.');
    }
  }

  const columnas: ColumnsType<CorteVenta> = [
    { title: 'Venta', dataIndex: 'ventaNumero', width: 150, render: (n: string) => <span className="mono">{n}</span> },
    {
      title: 'Vidrio',
      render: (_: unknown, c: CorteVenta) => (
        <div>
          <b>{c.productoNombre}</b>
          <div className="mono" style={{ fontSize: 12, color: colores.gray700 }}>{c.productoCodigo}</div>
        </div>
      ),
    },
    {
      title: 'Medida',
      width: 150,
      align: 'center',
      render: (_: unknown, c: CorteVenta) => (
        <b className="mono">{c.anchoMm} × {c.altoMm} mm</b>
      ),
    },
    { title: 'Cant.', dataIndex: 'cantidad', width: 80, align: 'center', render: (n: number) => <Tag>{n}</Tag> },
    {
      title: 'Recibido',
      dataIndex: 'creadoEn',
      width: 150,
      render: (f: string) => <span style={{ fontSize: 12, color: colores.gray700 }}>{new Date(f).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>,
    },
    {
      title: '',
      width: 140,
      render: (_: unknown, c: CorteVenta) => (
        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => void marcar(c.id)}>
          Cortado
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Badge count={cortes.length} showZero color={colores.blue800}>
          <span style={{ paddingRight: 8, fontWeight: 600 }}>Pendientes de cortar</span>
        </Badge>
        <Button icon={<ReloadOutlined />} loading={cargando} onClick={() => void cargar()}>
          Actualizar
        </Button>
      </Space>
      <Table<CorteVenta>
        rowKey="id"
        size="small"
        columns={columnas}
        dataSource={cortes}
        pagination={{ pageSize: 12, hideOnSinglePage: true }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin vidrios pendientes. Las ventas de vidrio a medida aparecen aquí solas." /> }}
      />
    </div>
  );
}
