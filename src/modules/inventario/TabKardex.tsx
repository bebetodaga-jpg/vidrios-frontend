import { useCallback, useEffect, useState } from 'react';
import { App, Button, Form, InputNumber, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { ProductoCatalogo, buscarProductos } from '@shared/api/catalogo';
import { FilaKardex, TipoMovimiento, consultarKardex, registrarMovimiento } from '@shared/api/inventario';
import { aCentimos, soles } from '@shared/formato';

const COLOR_TIPO: Record<TipoMovimiento, string> = { ENTRADA: 'success', SALIDA: 'error', AJUSTE: 'blue' };

interface CamposMovimiento {
  tipo: TipoMovimiento;
  cantidad: number;
  costoSoles?: number; // opcional: las salidas no llevan costo
  referencia: string;
}

export function TabKardex(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const esGerente = sesion?.rol === 'GERENTE';

  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [codigo, setCodigo] = useState<string | undefined>();
  const [movimientos, setMovimientos] = useState<FilaKardex[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form] = Form.useForm<CamposMovimiento>();

  useEffect(() => {
    if (sesion) {
      void buscarProductos(sesion.token, '').then(setProductos);
    }
  }, [sesion]);

  const cargarKardex = useCallback(
    async (cod: string): Promise<void> => {
      if (!sesion) {
        return;
      }
      setCargando(true);
      try {
        setMovimientos(await consultarKardex(sesion.token, cod));
      } catch (e) {
        message.error(e instanceof ErrorApi ? e.message : 'No se pudo cargar el kárdex.');
      } finally {
        setCargando(false);
      }
    },
    [sesion, message],
  );

  function elegir(cod: string): void {
    setCodigo(cod);
    void cargarKardex(cod);
  }

  async function guardarMovimiento(valores: CamposMovimiento): Promise<void> {
    if (!sesion || !codigo) {
      return;
    }
    setGuardando(true);
    try {
      await registrarMovimiento(sesion.token, {
        codigoProducto: codigo,
        tipo: valores.tipo,
        cantidad: valores.cantidad,
        costoCentimos: valores.tipo === 'SALIDA' ? 0 : aCentimos(valores.costoSoles ?? 0),
        referencia: valores.referencia.trim(),
      });
      message.success('Movimiento registrado.');
      form.resetFields();
      setModal(false);
      void cargarKardex(codigo);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo registrar el movimiento.');
    } finally {
      setGuardando(false);
    }
  }

  const columnas: ColumnsType<FilaKardex> = [
    { title: 'Fecha', dataIndex: 'fecha', width: 150, render: (f: string) => dayjs(f).format('DD/MM/YYYY HH:mm') },
    { title: 'Documento', dataIndex: 'referencia' },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      width: 110,
      render: (t: TipoMovimiento) => <Tag color={COLOR_TIPO[t]}>{t}</Tag>,
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      align: 'right',
      width: 100,
      render: (c: number) => (
        <span className="mono" style={{ color: c < 0 ? '#C53030' : undefined }}>
          {c > 0 ? '+' : ''}
          {c}
        </span>
      ),
    },
    { title: 'Costo unit.', dataIndex: 'costoCentimos', align: 'right', width: 110, render: (c: number) => <span className="mono">{soles(c)}</span> },
    { title: 'Saldo', dataIndex: 'saldo', align: 'right', width: 90, render: (s: number) => <b className="mono">{s}</b> },
    {
      title: 'Saldo valorizado',
      dataIndex: 'saldoValorizadoCentimos',
      align: 'right',
      width: 140,
      render: (c: number) => <span className="mono">{soles(c)}</span>,
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          showSearch
          placeholder="Elija un producto…"
          style={{ width: 380, maxWidth: '100%' }}
          value={codigo}
          onChange={elegir}
          optionFilterProp="label"
          options={productos.map((p) => ({ label: `${p.codigo} — ${p.nombre}`, value: p.codigo }))}
        />
        {esGerente && codigo && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setModal(true); }}>
            Registrar movimiento
          </Button>
        )}
      </Space>

      {codigo ? (
        <Table<FilaKardex>
          rowKey={(r) => r.fecha + r.referencia}
          size="small"
          loading={cargando}
          columns={columnas}
          dataSource={movimientos}
          pagination={false}
        />
      ) : (
        <Typography.Paragraph type="secondary">Elija un producto para ver su kárdex valorizado.</Typography.Paragraph>
      )}

      <Modal
        title="Registrar movimiento de inventario"
        open={modal}
        onCancel={() => { setModal(false); }}
        onOk={() => { form.submit(); }}
        confirmLoading={guardando}
        okText="Registrar"
        cancelText="Cancelar"
        destroyOnHidden
      >
        <Form<CamposMovimiento> form={form} layout="vertical" onFinish={(v) => void guardarMovimiento(v)} initialValues={{ tipo: 'ENTRADA' }}>
          <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Entrada (compra)', value: 'ENTRADA' },
                { label: 'Salida', value: 'SALIDA' },
                { label: 'Ajuste (merma, conteo)', value: 'AJUSTE' },
              ]}
            />
          </Form.Item>
          <Form.Item name="cantidad" label="Cantidad (negativa para merma en ajuste)" rules={[{ required: true, type: 'number' }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="costoSoles" label="Costo unitario (S/) — para entradas/ajustes">
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="referencia" label="Documento de referencia" rules={[{ required: true, min: 3, message: 'Indique el documento.' }]}>
            <Input placeholder="Ej.: Compra OC-0012 (Corrales)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
