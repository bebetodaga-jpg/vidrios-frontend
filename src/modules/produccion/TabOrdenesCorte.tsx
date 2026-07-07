import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Select, Space, Table, Tag, Typography } from 'antd';
import { PrinterOutlined, ReloadOutlined, ScissorOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { CotizacionResumen, listarCotizaciones } from '@shared/api/cotizaciones';
import { OrdenCorte, detalleOrdenCorte, generarOrdenCorte, listarOrdenesCorte } from '@shared/api/produccion';
import { colores } from '@shared/tokens';
import { DiagramaLamina } from './DiagramaLamina';

const COLOR_ESTADO: Record<string, string> = { PENDIENTE: 'warning', LISTA: 'success', ERROR: 'error' };
const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function TabOrdenesCorte(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const puedeGenerar = sesion && ['CORTADOR', 'MAESTRO', 'GERENTE'].includes(sesion.rol);

  const [cotizaciones, setCotizaciones] = useState<CotizacionResumen[]>([]);
  const [cotizacionId, setCotizacionId] = useState<string>();
  const [ordenes, setOrdenes] = useState<OrdenCorte[]>([]);
  const [detalle, setDetalle] = useState<OrdenCorte | null>(null);
  const [generando, setGenerando] = useState(false);

  const cargar = useCallback(async () => {
    if (!sesion) return;
    try {
      setOrdenes(await listarOrdenesCorte(sesion.token));
      if (puedeGenerar) {
        const cots = await listarCotizaciones(sesion.token);
        setCotizaciones(cots.filter((c) => c.estado === 'ACEPTADA'));
      }
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudieron cargar las órdenes.');
    }
  }, [sesion, puedeGenerar, message]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function generar(): Promise<void> {
    if (!sesion || !cotizacionId) return;
    setGenerando(true);
    try {
      const { id, numero } = await generarOrdenCorte(sesion.token, cotizacionId);
      message.success(`${numero} encolada; el optimizador la calcula en segundos.`);
      let d = await detalleOrdenCorte(sesion.token, id);
      for (let i = 0; i < 10 && d.estado === 'PENDIENTE'; i++) {
        await dormir(800);
        d = await detalleOrdenCorte(sesion.token, id);
      }
      setDetalle(d);
      void cargar();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo generar la orden.');
    } finally {
      setGenerando(false);
    }
  }

  const columnas: ColumnsType<OrdenCorte> = [
    { title: 'Orden', dataIndex: 'numero', width: 110, render: (n: string) => <b className="mono">{n}</b> },
    { title: 'Cotización', dataIndex: 'cotizacionNumero', width: 140, render: (n: string) => <span className="mono">{n}</span> },
    { title: 'Estado', dataIndex: 'estado', width: 110, render: (e: string) => <Tag color={COLOR_ESTADO[e]}>{e}</Tag> },
    {
      title: '',
      render: (_: unknown, o: OrdenCorte) => (
        <Button size="small" disabled={o.estado !== 'LISTA'} onClick={() => { setDetalle(o); }}>
          Ver plan
        </Button>
      ),
    },
  ];

  return (
    <div>
      {puedeGenerar && (
        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            placeholder="Cotización aceptada…"
            style={{ width: 320 }}
            value={cotizacionId}
            onChange={(v) => { setCotizacionId(v); }}
            options={cotizaciones.map((c) => ({ label: `${c.numero} · ${c.cliente ?? 'sin cliente'}`, value: c.id }))}
          />
          <Button type="primary" icon={<ScissorOutlined />} loading={generando} disabled={!cotizacionId} onClick={() => void generar()}>
            Generar orden de corte
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => void cargar()} />
        </Space>
      )}

      <Table<OrdenCorte> rowKey="id" size="small" columns={columnas} dataSource={ordenes} pagination={{ pageSize: 8, hideOnSinglePage: true }} locale={{ emptyText: 'Sin órdenes de corte todavía.' }} />

      {detalle?.resultado && (
        <Card
          title={`Plan de corte ${detalle.numero}`}
          extra={<Button icon={<PrinterOutlined />} onClick={() => { window.print(); }}>Imprimir</Button>}
          style={{ marginTop: 14 }}
        >
          <div className="doc-imprimible">
            <Typography.Title level={5} style={{ color: colores.blue800, marginTop: 0 }}>
              {detalle.numero} · {detalle.cotizacionNumero}
            </Typography.Title>
            {detalle.resultado.vidrios.map((v) => (
              <div key={v.vidrioCodigo} style={{ marginBottom: 16 }}>
                <b>{v.vidrioNombre}</b>{' '}
                <Tag>{String(v.plan.planchasNuevas)} plancha(s) nueva(s)</Tag>
                {v.plan.retazosUsados.length > 0 && <Tag color="cyan">usa {String(v.plan.retazosUsados.length)} retazo(s)</Tag>}
                {v.retazosCreados.length > 0 && <Tag color="green">crea retazos: {v.retazosCreados.join(', ')}</Tag>}
                <Tag color="green">retazo reutilizable {String(v.plan.retazoUtilPct)}%</Tag>
                <Tag color={v.plan.mermaRealPct <= 5 ? 'green' : v.plan.mermaRealPct <= 15 ? 'orange' : 'red'}>merma real {String(v.plan.mermaRealPct)}%</Tag>
                <Space wrap align="start" style={{ marginTop: 8 }}>
                  {v.plan.laminas.map((l) => (
                    <DiagramaLamina key={l.laminaId} lamina={l} />
                  ))}
                </Space>
              </div>
            ))}
            <Typography.Title level={5} style={{ color: colores.blue800 }}>
              Barrillas de aluminio ({String(detalle.resultado.perfiles.totalBarras)} de 6.00 m · desperdicio {String(detalle.resultado.perfiles.desperdicioPct)}%)
            </Typography.Title>
            {detalle.resultado.perfiles.barras.map((b, i) => (
              <div key={i} className="mono" style={{ fontSize: 12, padding: '3px 0', borderBottom: '1px solid #F3F4F6' }}>
                Barrilla {String(i + 1)}: {b.piezas.map((p) => `${p.nombre} ${String(p.largoMm)}`).join(' | ')} → sobra {String(b.sobranteMm)} mm
              </div>
            ))}
          </div>
        </Card>
      )}
      {detalle?.estado === 'ERROR' && <Alert type="error" showIcon style={{ marginTop: 12 }} message={detalle.error} />}
    </div>
  );
}
