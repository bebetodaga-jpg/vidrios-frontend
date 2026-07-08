import { useCallback, useEffect, useState } from 'react';
import { App, Button, Input, Modal, Space, Switch, Table, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import {
  Comprobante,
  EstadoComprobante,
  anularComprobante,
  listarComprobantes,
  reintentarComprobante,
  simularPse,
} from '@shared/api/facturacion';
import { colores } from '@shared/tokens';

const COLOR_ESTADO: Record<EstadoComprobante, string> = {
  ACEPTADO: 'success',
  PENDIENTE: 'warning',
  RECHAZADO: 'error',
  ANULADO: 'default',
};

const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function PantallaFacturacion(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const esGerente = sesion?.rol === 'GERENTE';

  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [cargando, setCargando] = useState(false);
  const [pseCaido, setPseCaido] = useState(false);
  const [anulando, setAnulando] = useState<Comprobante | null>(null);
  const [motivo, setMotivo] = useState('');
  const [reenvio, setReenvio] = useState<Comprobante | null>(null);

  const cargar = useCallback(async () => {
    if (!sesion) return;
    setCargando(true);
    try {
      setComprobantes(await listarComprobantes(sesion.token));
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudieron cargar los comprobantes.');
    } finally {
      setCargando(false);
    }
  }, [sesion, message]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function cambiarPse(caido: boolean): Promise<void> {
    if (!sesion) return;
    try {
      await simularPse(sesion.token, caido);
      setPseCaido(caido);
      message.info(caido ? 'PSE simulado como CAÍDO: las nuevas emisiones quedarán en cola.' : 'PSE en línea.');
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo cambiar el estado del PSE.');
    }
  }

  async function reintentar(c: Comprobante): Promise<void> {
    if (!sesion) return;
    try {
      await reintentarComprobante(sesion.token, c.id);
      message.success('Reintento encolado.');
      await dormir(1500);
      void cargar();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo reintentar.');
    }
  }

  async function confirmarAnular(): Promise<void> {
    if (!sesion || !anulando) return;
    try {
      await anularComprobante(sesion.token, anulando.id, motivo.trim());
      message.success('Nota de crédito emitida; el comprobante quedó anulado.');
      setAnulando(null);
      setMotivo('');
      void cargar();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo anular.');
    }
  }

  const columnas: ColumnsType<Comprobante> = [
    { title: 'Comprobante', dataIndex: 'numero', width: 130, render: (n: string) => <b className="mono">{n}</b> },
    { title: 'Tipo', dataIndex: 'tipo', width: 120, render: (t: string) => t.replace('_', ' ') },
    { title: 'Cliente', dataIndex: 'cliente', render: (c: string, r: Comprobante) => (
        <span>
          {c}
          {r.documento && <span className="mono" style={{ color: colores.gray500 }}> · {r.documento}</span>}
        </span>
      ) },
    { title: 'Total', dataIndex: 'total', align: 'right', width: 100, render: (t: string) => <span className="mono">S/ {t}</span> },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 200,
      render: (e: EstadoComprobante, r: Comprobante) => (
        <span>
          <Tag color={COLOR_ESTADO[e]}>{e}</Tag>
          {r.motivoRechazo && <div style={{ fontSize: 11, color: colores.red600 }}>{r.motivoRechazo}</div>}
        </span>
      ),
    },
    {
      title: 'Acciones',
      width: 200,
      render: (_: unknown, c: Comprobante) => (
        <Space>
          {c.estado === 'ACEPTADO' && (
            <>
              <Button size="small" onClick={() => { setReenvio(c); }}>
                Reenviar
              </Button>
              {esGerente && c.tipo !== 'NOTA_CREDITO' && (
                <Button size="small" danger onClick={() => { setAnulando(c); }}>
                  Anular
                </Button>
              )}
            </>
          )}
          {c.estado === 'PENDIENTE' && (
            <Button size="small" type="primary" onClick={() => void reintentar(c)}>
              Reintentar
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Typography.Title level={3} style={{ color: colores.blue800, margin: 0 }}>
          Facturación
        </Typography.Title>
        <Space>
          {esGerente && (
            <Space>
              <span style={{ fontSize: 13 }}>Simular PSE caído</span>
              <Switch checked={pseCaido} onChange={(v) => void cambiarPse(v)} />
            </Space>
          )}
          <Button icon={<ReloadOutlined />} onClick={() => void cargar()}>
            Actualizar
          </Button>
        </Space>
      </Space>

      <Table<Comprobante>
        rowKey="id"
        size="small"
        loading={cargando}
        columns={columnas}
        dataSource={comprobantes}
        pagination={{ pageSize: 15, hideOnSinglePage: true }}
        locale={{ emptyText: 'Aún no hay comprobantes. Se emiten desde el POS al cobrar.' }}
      />

      <Modal
        title={`Anular ${anulando?.numero ?? ''}`}
        open={!!anulando}
        onCancel={() => { setAnulando(null); }}
        onOk={() => void confirmarAnular()}
        okText="Emitir nota de crédito"
        cancelText="Cancelar"
        okButtonProps={{ danger: true, disabled: motivo.trim().length < 3 }}
      >
        <Typography.Paragraph type="secondary">
          Se emitirá una nota de crédito que anula el comprobante ante SUNAT.
        </Typography.Paragraph>
        <Input.TextArea rows={3} placeholder="Motivo de la anulación (ej.: devolución del cliente)" value={motivo} onChange={(e) => { setMotivo(e.target.value); }} />
      </Modal>

      <Modal title={`Reenviar ${reenvio?.numero ?? ''}`} open={!!reenvio} onCancel={() => { setReenvio(null); }} footer={null}>
        <Typography.Paragraph>Enlace del PDF del comprobante:</Typography.Paragraph>
        <Input readOnly value={reenvio?.enlacePdf ?? ''} style={{ marginBottom: 12 }} />
        <Space>
          <Button
            type="primary"
            onClick={() => {
              window.open(`https://wa.me/?text=${encodeURIComponent('Su comprobante: ' + (reenvio?.enlacePdf ?? ''))}`, '_blank');
            }}
          >
            📱 WhatsApp
          </Button>
          <Button
            onClick={() => {
              window.location.href = `mailto:?subject=Comprobante ${reenvio?.numero ?? ''}&body=${encodeURIComponent(reenvio?.enlacePdf ?? '')}`;
            }}
          >
            ✉ Correo
          </Button>
        </Space>
      </Modal>
    </div>
  );
}
