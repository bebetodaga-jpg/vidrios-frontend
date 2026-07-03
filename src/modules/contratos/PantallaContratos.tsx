import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Col, InputNumber, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { FilePdfOutlined, FileDoneOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { CotizacionResumen, listarCotizaciones } from '@shared/api/cotizaciones';
import {
  ContratoDetalle,
  ContratoResumen,
  crearContrato,
  detalleContrato,
  firmarContrato,
  listarContratos,
  pagarContrato,
} from '@shared/api/contratos';
import { aCentimos, soles } from '@shared/formato';
import { colores } from '@shared/tokens';
import { FirmaCanvas } from './FirmaCanvas';
import { ModalPdfContrato } from './ModalPdfContrato';

type MetodoPago = 'EFECTIVO' | 'TARJETA' | 'YAPE_PLIN';

export function PantallaContratos(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();

  const [cotizaciones, setCotizaciones] = useState<CotizacionResumen[]>([]);
  const [cotizacionId, setCotizacionId] = useState<string>();
  const [adelantoPct, setAdelantoPct] = useState(60);
  const [creando, setCreando] = useState(false);
  const [contratos, setContratos] = useState<ContratoResumen[]>([]);
  const [detalle, setDetalle] = useState<ContratoDetalle | null>(null);
  const [montoPago, setMontoPago] = useState<number>();
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [pagando, setPagando] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [pdf, setPdf] = useState(false);

  const cargar = useCallback(async () => {
    if (!sesion) return;
    try {
      const [cots, lista] = await Promise.all([listarCotizaciones(sesion.token), listarContratos(sesion.token)]);
      setCotizaciones(cots.filter((c) => c.estado === 'ACEPTADA'));
      setContratos(lista);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudieron cargar los contratos.');
    }
  }, [sesion, message]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrir = useCallback(
    async (id: string) => {
      if (!sesion) return;
      try {
        const d = await detalleContrato(sesion.token, id);
        setDetalle(d);
        setMontoPago(d.pagadoCentimos === 0 ? d.adelantoCentimos / 100 : undefined);
      } catch (e) {
        message.error(e instanceof ErrorApi ? e.message : 'No se pudo abrir el contrato.');
      }
    },
    [sesion, message],
  );

  async function generar(): Promise<void> {
    if (!sesion || !cotizacionId) return;
    setCreando(true);
    try {
      const { id, numero } = await crearContrato(sesion.token, cotizacionId, adelantoPct);
      message.success(`Contrato ${numero} generado.`);
      setCotizacionId(undefined);
      await cargar();
      await abrir(id);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo generar el contrato.');
    } finally {
      setCreando(false);
    }
  }

  async function pagar(): Promise<void> {
    if (!sesion || !detalle || !montoPago) return;
    setPagando(true);
    try {
      await pagarContrato(sesion.token, detalle.id, aCentimos(montoPago), metodo);
      message.success('Pago registrado: entra a la caja del día.');
      setMontoPago(undefined);
      await cargar();
      await abrir(detalle.id);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo registrar el pago.');
    } finally {
      setPagando(false);
    }
  }

  async function firmar(dataUrl: string): Promise<void> {
    if (!sesion || !detalle) return;
    setFirmando(true);
    try {
      await firmarContrato(sesion.token, detalle.id, dataUrl);
      message.success('Firma guardada en el contrato.');
      await cargar();
      await abrir(detalle.id);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo guardar la firma.');
    } finally {
      setFirmando(false);
    }
  }

  const columnas: ColumnsType<ContratoResumen> = [
    { title: 'Contrato', dataIndex: 'numero', width: 130, render: (n: string) => <b className="mono">{n}</b> },
    { title: 'Cliente', dataIndex: 'cliente', render: (c: string | null) => c ?? '—' },
    { title: 'Total', dataIndex: 'totalCentimos', align: 'right', width: 110, render: (c: number) => <span className="mono">{soles(c)}</span> },
    { title: 'Pagado', dataIndex: 'pagadoCentimos', align: 'right', width: 110, render: (c: number) => <span className="mono" style={{ color: colores.green600 }}>{soles(c)}</span> },
    { title: 'Saldo', dataIndex: 'saldoPendienteCentimos', align: 'right', width: 110, render: (c: number) => <span className="mono" style={{ color: c > 0 ? colores.amber500 : colores.green600 }}>{soles(c)}</span> },
    { title: 'Firma', dataIndex: 'tieneFirma', width: 110, render: (f: boolean) => (f ? <Tag color="success">FIRMADO ✓</Tag> : <Tag color="warning">SIN FIRMA</Tag>) },
    { title: '', width: 90, render: (_: unknown, c: ContratoResumen) => <Button size="small" onClick={() => void abrir(c.id)}>Abrir</Button> },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ color: colores.blue800, marginTop: 0 }}>
        Contratos
      </Typography.Title>

      <Card size="small" title="Generar contrato desde la cotización aceptada" style={{ marginBottom: 14 }}>
        <Space wrap>
          <Select
            placeholder="Cotización aceptada…"
            style={{ width: 320 }}
            value={cotizacionId}
            onChange={(v) => { setCotizacionId(v); }}
            options={cotizaciones.map((c) => ({ label: `${c.numero} · ${c.cliente ?? 'sin cliente'} · ${soles(c.totalCentimos)}`, value: c.id }))}
          />
          <span>
            Adelanto (%):{' '}
            <InputNumber min={0} max={100} value={adelantoPct} onChange={(v) => { setAdelantoPct(v ?? 60); }} style={{ width: 90 }} />
          </span>
          <Button type="primary" icon={<FileDoneOutlined />} loading={creando} disabled={!cotizacionId} onClick={() => void generar()}>
            Generar contrato
          </Button>
        </Space>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '6px 0 0' }}>
          El contrato solo nace de una cotización ACEPTADA; el adelanto por defecto es 60%.
        </Typography.Paragraph>
      </Card>

      <Table<ContratoResumen> rowKey="id" size="small" columns={columnas} dataSource={contratos} pagination={{ pageSize: 8, hideOnSinglePage: true }} locale={{ emptyText: 'Sin contratos todavía.' }} />

      {detalle && (
        <Card
          title={
            <Space>
              {detalle.numero} · {detalle.cliente ?? 'sin cliente'}
              {detalle.tieneFirma ? <Tag color="success">FIRMADO ✓</Tag> : <Tag color="warning">SIN FIRMA</Tag>}
            </Space>
          }
          extra={<Button icon={<FilePdfOutlined />} onClick={() => { setPdf(true); }}>Ver contrato PDF</Button>}
          style={{ marginTop: 14 }}
        >
          <Row gutter={[10, 10]}>
            <Col xs={12} md={6}><Card size="small"><Statistic title="TOTAL (inc. IGV)" value={soles(detalle.totalCentimos)} valueStyle={{ color: colores.blue800, fontFamily: 'Consolas, monospace' }} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Adelanto programado" value={soles(detalle.adelantoCentimos)} valueStyle={{ color: colores.blue800, fontFamily: 'Consolas, monospace' }} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Pagado" value={soles(detalle.pagadoCentimos)} valueStyle={{ color: colores.green600, fontFamily: 'Consolas, monospace' }} /></Card></Col>
            <Col xs={12} md={6}><Card size="small"><Statistic title="Saldo pendiente" value={soles(detalle.saldoPendienteCentimos)} valueStyle={{ color: colores.amber500, fontFamily: 'Consolas, monospace' }} /></Card></Col>
          </Row>

          <Space wrap style={{ marginTop: 12 }}>
            <span>Registrar pago (S/):</span>
            <InputNumber min={0.1} step={0.5} value={montoPago} onChange={(v) => { setMontoPago(v ?? undefined); }} style={{ width: 130 }} />
            <Select<MetodoPago>
              value={metodo}
              onChange={(v) => { setMetodo(v); }}
              style={{ width: 140 }}
              options={[
                { label: 'Efectivo', value: 'EFECTIVO' },
                { label: 'Tarjeta', value: 'TARJETA' },
                { label: 'Yape/Plin', value: 'YAPE_PLIN' },
              ]}
            />
            <Button loading={pagando} disabled={!montoPago || detalle.saldoPendienteCentimos === 0} onClick={() => void pagar()}>
              Registrar — entra a la caja del día
            </Button>
          </Space>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '6px 0 12px' }}>
            El pago nunca puede superar el saldo; cada cobro se registra como ingreso en la caja del día.
          </Typography.Paragraph>

          {!detalle.tieneFirma && (
            <>
              <Typography.Text strong style={{ color: colores.blue800 }}>
                Firma del cliente (en el celular)
              </Typography.Text>
              <div style={{ marginTop: 6 }}>
                <FirmaCanvas guardando={firmando} onGuardar={(d) => void firmar(d)} />
              </div>
            </>
          )}
        </Card>
      )}

      {pdf && <ModalPdfContrato contrato={detalle} onCerrar={() => { setPdf(false); }} />}
    </div>
  );
}
