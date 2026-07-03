import { useCallback, useEffect, useState } from 'react';
import { App, Button, InputNumber, Modal, Select, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { CuentaPorCobrar, MetodoCaja, cuentasPorCobrar, registrarCobro } from '@shared/api/caja';
import { aCentimos, soles } from '@shared/formato';

const COLOR_ESTADO: Record<string, string> = { VIGENTE: 'success', POR_VENCER: 'warning', VENCIDO: 'error' };

export function TabCuentas(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const [cuentas, setCuentas] = useState<CuentaPorCobrar[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cobrando, setCobrando] = useState<CuentaPorCobrar | null>(null);
  const [monto, setMonto] = useState(0);
  const [metodo, setMetodo] = useState<MetodoCaja>('EFECTIVO');

  const cargar = useCallback(async () => {
    if (!sesion) return;
    setCargando(true);
    try {
      setCuentas(await cuentasPorCobrar(sesion.token));
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudieron cargar las cuentas.');
    } finally {
      setCargando(false);
    }
  }, [sesion, message]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function abrirCobro(c: CuentaPorCobrar): void {
    setCobrando(c);
    setMonto(c.saldoCentimos / 100);
    setMetodo('EFECTIVO');
  }

  async function confirmarCobro(): Promise<void> {
    if (!sesion || !cobrando) return;
    try {
      const { saldoRestanteCentimos } = await registrarCobro(sesion.token, cobrando.id, aCentimos(monto), metodo);
      message.success(`Cobro registrado. Saldo restante: ${soles(saldoRestanteCentimos)}`);
      setCobrando(null);
      void cargar();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo registrar el cobro.');
    }
  }

  const columnas: ColumnsType<CuentaPorCobrar> = [
    { title: 'Cliente', dataIndex: 'cliente', render: (c: string) => <b>{c}</b> },
    { title: 'Documento', dataIndex: 'numeroVenta', width: 130, render: (n: string) => <span className="mono">{n}</span> },
    { title: 'Vence', dataIndex: 'venceEn', width: 110, render: (f: string) => dayjs(f).format('DD/MM/YYYY') },
    { title: 'Saldo', dataIndex: 'saldoCentimos', align: 'right', width: 110, render: (c: number) => <b className="mono">{soles(c)}</b> },
    { title: 'Estado', dataIndex: 'estado', width: 120, render: (e: string) => <Tag color={COLOR_ESTADO[e]}>{e.replace('_', ' ')}</Tag> },
    { title: '', width: 130, render: (_: unknown, c: CuentaPorCobrar) => <Button size="small" onClick={() => { abrirCobro(c); }}>Registrar cobro</Button> },
  ];

  return (
    <div>
      <Table<CuentaPorCobrar> rowKey="id" size="small" loading={cargando} columns={columnas} dataSource={cuentas} pagination={false} locale={{ emptyText: 'No hay cuentas por cobrar pendientes.' }} />
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
        Las ventas al crédito (15 días) generan estas cuentas; los cobros entran a la caja del día como ingreso.
      </Typography.Paragraph>

      <Modal title={`Cobrar — ${cobrando?.cliente ?? ''}`} open={!!cobrando} onCancel={() => { setCobrando(null); }} onOk={() => void confirmarCobro()} okText="Registrar cobro" cancelText="Cancelar">
        <div style={{ marginBottom: 4 }}>Monto a cobrar (S/) · saldo {cobrando ? soles(cobrando.saldoCentimos) : ''}</div>
        <InputNumber min={0.1} step={0.5} value={monto} onChange={(v) => { setMonto(v ?? 0); }} style={{ width: '100%', marginBottom: 12 }} size="large" />
        <div style={{ marginBottom: 4 }}>Método</div>
        <Select value={metodo} onChange={(v) => { setMetodo(v); }} style={{ width: '100%' }} options={[{ label: 'Efectivo', value: 'EFECTIVO' }, { label: 'Tarjeta', value: 'TARJETA' }, { label: 'Yape/Plin', value: 'YAPE_PLIN' }]} />
      </Modal>
    </div>
  );
}
