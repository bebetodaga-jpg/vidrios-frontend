import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { EstadoCaja, MetodoCaja, MovimientoCaja, abrirCaja, movimientosCaja, registrarMovimientoCaja } from '@shared/api/caja';
import { aCentimos, soles } from '@shared/formato';
import { colores } from '@shared/tokens';

const COLOR_TIPO: Record<string, string> = { VENTA: 'green', INGRESO: 'blue', EGRESO: 'red', COBRO_CREDITO: 'cyan' };

interface CamposMov {
  tipo: 'INGRESO' | 'EGRESO';
  metodo: MetodoCaja;
  concepto: string;
  montoSoles: number;
}

export function TabCajaDia({ caja, onCambio }: { caja: EstadoCaja | null; onCambio: () => void }): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const esGerente = sesion?.rol === 'GERENTE';
  const puedeAbrir = sesion?.rol === 'CAJERA' || esGerente;

  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [montoApertura, setMontoApertura] = useState(300);
  const [abriendo, setAbriendo] = useState(false);
  const [modalMov, setModalMov] = useState(false);
  const [form] = Form.useForm<CamposMov>();

  const cargarMovs = useCallback(async () => {
    if (!sesion || !caja?.abierta) {
      setMovimientos([]);
      return;
    }
    try {
      setMovimientos(await movimientosCaja(sesion.token));
    } catch {
      /* sin movimientos */
    }
  }, [sesion, caja]);

  useEffect(() => {
    void cargarMovs();
  }, [cargarMovs]);

  async function abrir(): Promise<void> {
    if (!sesion) return;
    setAbriendo(true);
    try {
      await abrirCaja(sesion.token, aCentimos(montoApertura));
      message.success('Caja abierta.');
      onCambio();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo abrir la caja.');
    } finally {
      setAbriendo(false);
    }
  }

  async function guardarMov(v: CamposMov): Promise<void> {
    if (!sesion) return;
    try {
      await registrarMovimientoCaja(sesion.token, { tipo: v.tipo, metodo: v.metodo, concepto: v.concepto.trim(), montoCentimos: aCentimos(v.montoSoles) });
      message.success('Movimiento registrado.');
      form.resetFields();
      setModalMov(false);
      void cargarMovs();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo registrar el movimiento.');
    }
  }

  if (!caja?.abierta) {
    return (
      <Card style={{ maxWidth: 420, margin: '20px auto', textAlign: 'center' }}>
        <Typography.Title level={4}>Caja cerrada</Typography.Title>
        {puedeAbrir ? (
          <>
            <div style={{ marginBottom: 8 }}>Monto inicial en caja (S/)</div>
            <InputNumber min={0} step={10} value={montoApertura} onChange={(v) => { setMontoApertura(v ?? 0); }} size="large" style={{ width: '100%', marginBottom: 12 }} />
            <Button type="primary" block size="large" loading={abriendo} onClick={() => void abrir()}>
              Abrir caja
            </Button>
          </>
        ) : (
          <Typography.Paragraph type="secondary">Pídale a la cajera que abra la caja.</Typography.Paragraph>
        )}
      </Card>
    );
  }

  const sum = (m: MetodoCaja): number => movimientos.filter((x) => x.metodo === m).reduce((s, x) => s + x.montoCentimos, 0);
  const esperadoEfectivo = (caja.montoInicialCentimos ?? 0) + sum('EFECTIVO');

  const columnas: ColumnsType<MovimientoCaja> = [
    { title: 'Hora', dataIndex: 'creadoEn', width: 80, render: (f: string) => dayjs(f).format('HH:mm') },
    { title: 'Tipo', dataIndex: 'tipo', width: 130, render: (t: string) => <Tag color={COLOR_TIPO[t]}>{t.replace('_', ' ')}</Tag> },
    { title: 'Concepto', dataIndex: 'concepto' },
    { title: 'Método', dataIndex: 'metodo', width: 110, render: (m: string) => m.replace('_', '/') },
    {
      title: 'Monto',
      dataIndex: 'montoCentimos',
      align: 'right',
      width: 110,
      render: (c: number) => (
        <b className="mono" style={{ color: c < 0 ? colores.red600 : undefined }}>
          {soles(c)}
        </b>
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 12, justifyContent: 'space-between', width: '100%' }}>
        <span>
          <Tag color="green">CAJA ABIERTA</Tag>
          Apertura <b className="mono">{soles(caja.montoInicialCentimos ?? 0)}</b>
          {caja.abiertaEn && <> · desde {dayjs(caja.abiertaEn).format('HH:mm')}</>}
        </span>
        <Space>
          <Button onClick={() => { form.setFieldValue('tipo', 'INGRESO'); setModalMov(true); }}>+ Ingreso</Button>
          <Button danger onClick={() => { form.setFieldValue('tipo', 'EGRESO'); setModalMov(true); }}>− Egreso</Button>
        </Space>
      </Space>

      {esGerente ? (
        <Row gutter={12} style={{ marginBottom: 12 }}>
          <Col span={8}><Card size="small"><Statistic title="Efectivo esperado" value={soles(esperadoEfectivo)} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="Tarjeta" value={soles(sum('TARJETA'))} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="Yape/Plin" value={soles(sum('YAPE_PLIN'))} /></Card></Col>
        </Row>
      ) : (
        <Alert type="info" showIcon style={{ marginBottom: 12 }} message="🔒 Cierre ciego: los totales esperados se revelan al gerente después de su declaración." />
      )}

      <Table<MovimientoCaja> rowKey={(r) => r.creadoEn + r.concepto} size="small" columns={columnas} dataSource={movimientos} pagination={false} locale={{ emptyText: 'Sin movimientos todavía.' }} />

      <Modal title="Registrar movimiento de caja" open={modalMov} onCancel={() => { setModalMov(false); }} onOk={() => { form.submit(); }} okText="Registrar" cancelText="Cancelar" destroyOnHidden>
        <Form<CamposMov> form={form} layout="vertical" onFinish={(v) => void guardarMov(v)} initialValues={{ tipo: 'INGRESO', metodo: 'EFECTIVO' }}>
          <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
            <Select options={[{ label: 'Ingreso', value: 'INGRESO' }, { label: 'Egreso / gasto', value: 'EGRESO' }]} />
          </Form.Item>
          <Form.Item name="metodo" label="Método" rules={[{ required: true }]}>
            <Select options={[{ label: 'Efectivo', value: 'EFECTIVO' }, { label: 'Tarjeta', value: 'TARJETA' }, { label: 'Yape/Plin', value: 'YAPE_PLIN' }]} />
          </Form.Item>
          <Form.Item name="concepto" label="Concepto" rules={[{ required: true, min: 3, message: 'Indique el concepto.' }]}>
            <Input placeholder="Ej.: Compra de silicona en ferretería" />
          </Form.Item>
          <Form.Item name="montoSoles" label="Monto (S/)" rules={[{ required: true, type: 'number', min: 0.1 }]}>
            <InputNumber min={0.1} step={0.5} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
