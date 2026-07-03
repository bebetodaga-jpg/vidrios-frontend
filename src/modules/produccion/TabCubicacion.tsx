import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, InputNumber, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { CotizacionResumen, listarCotizaciones } from '@shared/api/cotizaciones';
import {
  Cubicacion,
  OrdenCompra,
  VidrioCubicado,
  crearOrdenCompra,
  listarOrdenesCompra,
  obtenerCubicacion,
  recibirOrdenCompra,
} from '@shared/api/produccion';
import { soles } from '@shared/formato';

export function TabCubicacion(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const esGerente = sesion?.rol === 'GERENTE';

  const [cotizaciones, setCotizaciones] = useState<CotizacionResumen[]>([]);
  const [cotizacionId, setCotizacionId] = useState<string>();
  const [cubicacion, setCubicacion] = useState<Cubicacion | null>(null);
  const [compras, setCompras] = useState<OrdenCompra[]>([]);
  const [recibiendo, setRecibiendo] = useState<OrdenCompra | null>(null);
  const [costos, setCostos] = useState<Record<string, number | undefined>>({});

  const cargar = useCallback(async () => {
    if (!sesion) return;
    try {
      const cots = await listarCotizaciones(sesion.token);
      setCotizaciones(cots.filter((c) => c.estado === 'ACEPTADA'));
      if (esGerente) setCompras(await listarOrdenesCompra(sesion.token));
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo cargar.');
    }
  }, [sesion, esGerente, message]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function cubicar(id: string): Promise<void> {
    if (!sesion) return;
    setCotizacionId(id);
    try {
      setCubicacion(await obtenerCubicacion(sesion.token, id));
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo cubicar.');
    }
  }

  async function comprarFaltantes(): Promise<void> {
    if (!sesion || !cubicacion) return;
    const faltantes = cubicacion.vidrios.filter((v) => v.faltantePlanchas > 0).map((v) => ({ codigo: v.codigo, nombre: v.nombre, cantidad: v.faltantePlanchas }));
    try {
      const { numero } = await crearOrdenCompra(sesion.token, faltantes);
      message.success(`Orden de compra ${numero} creada.`);
      void cargar();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo crear la orden de compra.');
    }
  }

  async function confirmarRecepcion(): Promise<void> {
    if (!sesion || !recibiendo) return;
    const lista = recibiendo.items.map((i) => ({ codigo: i.codigo, costoCentimos: Math.round((costos[i.codigo] ?? 0) * 100) }));
    try {
      const { numero } = await recibirOrdenCompra(sesion.token, recibiendo.id, lista);
      message.success(`${numero} recibida: el stock entra al kárdex en segundos.`);
      setRecibiendo(null);
      setCostos({});
      void cargar();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo recibir.');
    }
  }

  const hayFaltantes = (cubicacion?.vidrios.some((v) => v.faltantePlanchas > 0) ?? false);

  const columnasVidrio: ColumnsType<VidrioCubicado> = [
    { title: 'Vidrio', dataIndex: 'nombre', render: (n: string) => <b>{n}</b> },
    { title: 'm² requeridos', dataIndex: 'm2', align: 'right', render: (m: number) => <span className="mono">{String(m)}</span> },
    { title: 'Planchas est.', dataIndex: 'planchasEstimadas', align: 'right', render: (p: number) => <span className="mono">{String(p)}</span> },
    { title: 'Stock', dataIndex: 'stockPlanchas', align: 'right', render: (s: number) => <span className="mono">{String(s)}</span> },
    {
      title: 'Faltante',
      dataIndex: 'faltantePlanchas',
      align: 'right',
      render: (f: number) => (f > 0 ? <Tag color="error">FALTAN {String(f)}</Tag> : <Tag color="success">OK</Tag>),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          placeholder="Cotización aceptada…"
          style={{ width: 320 }}
          value={cotizacionId}
          onChange={(v) => void cubicar(v)}
          options={cotizaciones.map((c) => ({ label: `${c.numero} · ${c.cliente ?? 'sin cliente'}`, value: c.id }))}
        />
        {esGerente && hayFaltantes && (
          <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => void comprarFaltantes()}>
            Generar orden de compra por faltantes
          </Button>
        )}
      </Space>

      {cubicacion && (
        <>
          <Table<VidrioCubicado> rowKey="codigo" size="small" columns={columnasVidrio} dataSource={cubicacion.vidrios} pagination={false} />
          <Card size="small" style={{ marginTop: 10 }} title="Perfiles y accesorios (consolidado)">
            {cubicacion.perfiles.map((p) => (
              <div key={p.nombre} className="mono" style={{ fontSize: 13 }}>
                {p.nombre}: {String(p.metrosLineales)} m → {String(p.barrillasEstimadas)} barrilla(s)
              </div>
            ))}
            {cubicacion.accesorios.map((a) => (
              <div key={a.nombre} className="mono" style={{ fontSize: 13 }}>
                {a.nombre}: {String(a.cantidad)} und
              </div>
            ))}
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }}>
              Los perfiles se muestran en barrillas estimadas de 6 m; el cruce contra stock por serie se configura con el gerente.
            </Typography.Paragraph>
          </Card>
        </>
      )}

      {esGerente && compras.length > 0 && (
        <Card size="small" style={{ marginTop: 14 }} title="Órdenes de compra">
          {compras.map((oc) => (
            <div key={oc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}>
              <b className="mono">{oc.numero}</b>
              <Tag color={oc.estado === 'RECIBIDA' ? 'success' : 'warning'}>{oc.estado}</Tag>
              <span style={{ flex: 1, fontSize: 13 }}>{oc.items.map((i) => `${i.nombre} ×${String(i.cantidad)}`).join(' · ')}</span>
              {oc.estado === 'PENDIENTE' && (
                <Button size="small" type="primary" onClick={() => { setRecibiendo(oc); }}>
                  Recibir
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}

      <Modal
        title={`Recibir ${recibiendo?.numero ?? ''} — costos unitarios`}
        open={!!recibiendo}
        onCancel={() => { setRecibiendo(null); }}
        onOk={() => void confirmarRecepcion()}
        okText="Confirmar recepción"
        cancelText="Cancelar"
      >
        {recibiendo?.items.map((i) => (
          <div key={i.codigo} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ flex: 1 }}>
              {i.nombre} ×{String(i.cantidad)}
            </span>
            <InputNumber
              min={0.1}
              step={0.5}
              placeholder="Costo S/"
              value={costos[i.codigo]}
              onChange={(v) => { setCostos((c) => ({ ...c, [i.codigo]: v ?? undefined })); }}
              style={{ width: 130 }}
            />
          </div>
        ))}
        <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
          Cada ítem entra al kárdex como ENTRADA con su costo (valoriza el promedio). Ej.: {soles(4000)}.
        </Typography.Paragraph>
      </Modal>
    </div>
  );
}
