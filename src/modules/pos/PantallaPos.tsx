import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Empty,
  Grid,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { DeleteOutlined, PauseOutlined } from '@ant-design/icons';
import type { InputRef } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { ETIQUETA_UNIDAD, ProductoCatalogo, buscarProductos } from '@shared/api/catalogo';
import { MetodoPago, confirmarVenta } from '@shared/api/ventas';
import { EstadoCaja, abrirCaja, estadoCaja } from '@shared/api/caja';
import { aCentimos, soles } from '@shared/formato';
import { colores, tamanoDisplay } from '@shared/tokens';
import { esPorArea, importeCentimos } from './calculo-pos';
import { ItemCarrito, VentaEnEspera, DatosTicket } from './tipos';
import { ModalMedidas } from './ModalMedidas';
import { ModalCobro } from './ModalCobro';
import { ModalTicket } from './ModalTicket';

export function PantallaPos(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const esGerente = sesion?.rol === 'GERENTE';
  const puedeAbrirCaja = sesion?.rol === 'CAJERA' || esGerente;
  // En el celular no hay teclado físico: los atajos F2/F8/F12 se ocultan y los botones van sin sufijo.
  const esMovil = !Grid.useBreakpoint().md;
  const buscador = useRef<InputRef>(null);

  const [productos, setProductos] = useState<ProductoCatalogo[]>([]);
  const [texto, setTexto] = useState('');
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [caja, setCaja] = useState<EstadoCaja | null>(null);
  const [descuentoPct, setDescuentoPct] = useState(0);
  const [prodMedidas, setProdMedidas] = useState<ProductoCatalogo | null>(null);
  const [modalCobro, setModalCobro] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [ticket, setTicket] = useState<DatosTicket | null>(null);
  const [enEspera, setEnEspera] = useState<VentaEnEspera[]>([]);
  const [modalEspera, setModalEspera] = useState(false);
  const [modalCaja, setModalCaja] = useState(false);
  const [montoApertura, setMontoApertura] = useState(300);

  const foco = useCallback(() => buscador.current?.focus(), []);

  const cargarProductos = useCallback(
    async (busqueda: string) => {
      if (!sesion) return;
      try {
        setProductos(await buscarProductos(sesion.token, busqueda));
      } catch (e) {
        message.error(e instanceof ErrorApi ? e.message : 'No se pudo cargar el catálogo.');
      }
    },
    [sesion, message],
  );

  const cargarCaja = useCallback(async () => {
    if (!sesion) return;
    try {
      setCaja(await estadoCaja(sesion.token));
    } catch {
      /* sin estado de caja: el cobro lo validará */
    }
  }, [sesion]);

  useEffect(() => {
    void cargarProductos('');
    void cargarCaja();
    foco();
  }, [cargarProductos, cargarCaja, foco]);

  function agregarProducto(p: ProductoCatalogo): void {
    if (esPorArea(p.unidadVenta)) {
      setProdMedidas(p);
      return;
    }
    setCarrito((c) => {
      const ex = c.find((i) => i.codigo === p.codigo && i.anchoMm === undefined);
      if (ex) {
        return c.map((i) => (i === ex ? { ...i, cantidad: i.cantidad + 1 } : i));
      }
      return [
        ...c,
        { key: crypto.randomUUID(), codigo: p.codigo, nombre: p.nombre, unidadVenta: p.unidadVenta, precioCentimos: p.precioCentimos, cantidad: 1 },
      ];
    });
    foco();
  }

  function agregarMedida(anchoMm: number, altoMm: number, cantidad: number): void {
    const p = prodMedidas;
    if (!p) return;
    setCarrito((c) => [
      ...c,
      { key: crypto.randomUUID(), codigo: p.codigo, nombre: p.nombre, unidadVenta: p.unidadVenta, precioCentimos: p.precioCentimos, cantidad, anchoMm, altoMm },
    ]);
    setProdMedidas(null);
    foco();
  }

  function buscarEnter(): void {
    const t = texto.trim().toLowerCase();
    if (!t) return;
    const exacto = productos.find((p) => p.codigo === t);
    const porNombre = productos.find((p) => p.nombre.toLowerCase().includes(t));
    const elegido = exacto ?? porNombre;
    if (elegido) {
      agregarProducto(elegido);
      setTexto('');
      void cargarProductos('');
    } else {
      message.warning('Producto no encontrado.');
    }
  }

  const subtotal = carrito.reduce((s, i) => s + importeCentimos(i.unidadVenta, i.precioCentimos, i.cantidad, i.anchoMm, i.altoMm), 0);
  const total = Math.round(subtotal * (1 - descuentoPct / 100));

  function abrirCobro(): void {
    if (carrito.length === 0) {
      message.warning('El carrito está vacío.');
      return;
    }
    if (!caja?.abierta) {
      message.warning('No hay una caja abierta.');
      return;
    }
    setModalCobro(true);
  }

  async function confirmarCobro(metodo: MetodoPago, recibidoCentimos?: number): Promise<void> {
    if (!sesion) return;
    setProcesando(true);
    try {
      const venta = await confirmarVenta(sesion.token, {
        items: carrito.map((i) => ({ codigo: i.codigo, cantidad: i.cantidad, anchoMm: i.anchoMm, altoMm: i.altoMm })),
        metodoPago: metodo,
        descuentoPct: esGerente && descuentoPct > 0 ? descuentoPct : undefined,
      });
      setTicket({ ventaId: venta.id, numero: venta.numero, totalCentimos: venta.totalCentimos, metodoPago: metodo, recibidoCentimos, items: carrito, cajera: sesion.nombre });
      setCarrito([]);
      setDescuentoPct(0);
      setModalCobro(false);
      void cargarProductos('');
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo confirmar la venta.');
    } finally {
      setProcesando(false);
    }
  }

  function ponerEnEspera(): void {
    if (carrito.length === 0) return;
    const ref = window.prompt('Referencia del cliente en espera:', '') ?? '';
    setEnEspera((e) => [...e, { ref: ref || 'Sin nombre', hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }), carrito }]);
    setCarrito([]);
    setDescuentoPct(0);
    foco();
  }

  function retomar(indice: number): void {
    setEnEspera((espera) => {
      const v = espera[indice];
      setCarrito((actual) => {
        if (actual.length > 0) {
          return actual; // hay una venta en curso; no se pisa (simplificado)
        }
        return v.carrito;
      });
      return espera.filter((_, i) => i !== indice);
    });
    setModalEspera(false);
    foco();
  }

  async function confirmarAbrirCaja(): Promise<void> {
    if (!sesion) return;
    try {
      await abrirCaja(sesion.token, aCentimos(montoApertura));
      message.success('Caja abierta.');
      setModalCaja(false);
      void cargarCaja();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo abrir la caja.');
    }
  }

  // Atajos globales (teclado primero). Se ignoran si hay un modal abierto (ellos manejan Esc/Enter).
  useEffect(() => {
    const hayModal = !!prodMedidas || modalCobro || !!ticket || modalEspera || modalCaja;
    function onTecla(e: KeyboardEvent): void {
      if (hayModal) return;
      if (e.key === 'F2') {
        e.preventDefault();
        foco();
      } else if (e.key === 'F8') {
        e.preventDefault();
        ponerEnEspera();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (enEspera.length > 0) setModalEspera(true);
      } else if (e.key === 'F12') {
        e.preventDefault();
        abrirCobro();
      }
    }
    window.addEventListener('keydown', onTecla);
    return () => { window.removeEventListener('keydown', onTecla); };
  });

  const columnas: ColumnsType<ItemCarrito> = [
    {
      title: 'Producto',
      render: (_: unknown, i: ItemCarrito) => (
        <div>
          <b>{i.nombre}</b>
          {i.anchoMm && i.altoMm && (
            <div className="mono" style={{ fontSize: 12, color: colores.gray700 }}>
              {i.anchoMm} × {i.altoMm} mm · {ETIQUETA_UNIDAD[i.unidadVenta]}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Cant.',
      width: 110,
      align: 'center',
      render: (_: unknown, i: ItemCarrito) => (
        <Space>
          <Button size="small" onClick={() => { setCarrito((c) => c.map((x) => (x.key === i.key ? { ...x, cantidad: Math.max(1, x.cantidad - 1) } : x))); }}>
            −
          </Button>
          <b className="mono">{i.cantidad}</b>
          <Button size="small" onClick={() => { setCarrito((c) => c.map((x) => (x.key === i.key ? { ...x, cantidad: x.cantidad + 1 } : x))); }}>
            +
          </Button>
        </Space>
      ),
    },
    {
      title: 'Importe',
      align: 'right',
      width: 110,
      render: (_: unknown, i: ItemCarrito) => (
        <b className="mono">{soles(importeCentimos(i.unidadVenta, i.precioCentimos, i.cantidad, i.anchoMm, i.altoMm))}</b>
      ),
    },
    {
      title: '',
      width: 40,
      render: (_: unknown, i: ItemCarrito) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => { setCarrito((c) => c.filter((x) => x.key !== i.key)); }} />
      ),
    },
  ];

  return (
    <div>
      {!caja?.abierta && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="No hay una caja abierta."
          description={puedeAbrirCaja ? 'Abra la caja para poder vender.' : 'Pídale a la cajera que abra la caja.'}
          action={
            puedeAbrirCaja && (
              <Button size="small" type="primary" onClick={() => { setModalCaja(true); }}>
                Abrir caja
              </Button>
            )
          }
        />
      )}

      <Row gutter={14}>
        <Col xs={24} md={14}>
          <Input.Search
            ref={buscador}
            size="large"
            placeholder={esMovil ? '🔍 Buscar producto…' : '🔍 Escanee el código de barras o escriba el producto… (Enter agrega)'}
            value={texto}
            onChange={(e) => { setTexto(e.target.value); }}
            onSearch={buscarEnter}
            onPressEnter={buscarEnter}
            autoFocus
          />
          {!esMovil && (
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '6px 0' }}>
              Atajos: <Tag>F2</Tag> buscar · <Tag>F8</Tag> en espera · <Tag>F9</Tag> retomar · <Tag>F12</Tag> cobrar
            </Typography.Paragraph>
          )}
          <Row gutter={[8, 8]}>
            {productos.map((p) => (
              <Col key={p.id} xs={12} sm={8}>
                <Card hoverable size="small" onClick={() => { agregarProducto(p); }} styles={{ body: { padding: 12 } }}>
                  <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3, minHeight: 34 }}>{p.nombre}</div>
                  <div style={{ fontSize: 11, color: colores.gray700 }}>{p.subfamilia}</div>
                  <div className="mono" style={{ fontWeight: 700, color: colores.blue800, marginTop: 4 }}>
                    {p.precio} <small style={{ fontWeight: 400 }}>/ {ETIQUETA_UNIDAD[p.unidadVenta]}</small>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>

        <Col xs={24} md={10}>
          <Card
            title={
              <Space>
                Venta actual
                {enEspera.length > 0 && (
                  <Tag color="orange" style={{ cursor: 'pointer' }} onClick={() => { setModalEspera(true); }}>
                    ⏸ {enEspera.length} en espera
                  </Tag>
                )}
              </Space>
            }
            styles={{ body: { padding: 0 } }}
          >
            <Table<ItemCarrito>
              rowKey="key"
              size="small"
              columns={columnas}
              dataSource={carrito}
              pagination={false}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Carrito vacío. Escanee o busque un producto." /> }}
            />

            <div style={{ padding: 12 }}>
              {esGerente && (
                <Space style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 13 }}>Descuento %:</span>
                  <InputNumber min={0} max={100} value={descuentoPct} onChange={(v) => { setDescuentoPct(v ?? 0); }} style={{ width: 90 }} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    (autoriza gerente)
                  </Typography.Text>
                </Space>
              )}
              {descuentoPct > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: colores.green600 }}>
                  <span>Descuento {descuentoPct}%</span>
                  <span className="mono">− {soles(subtotal - total)}</span>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: colores.blue800,
                  color: colores.white,
                  borderRadius: 8,
                  padding: '10px 16px',
                  margin: '8px 0',
                }}
              >
                <span>TOTAL (inc. IGV)</span>
                <span className="mono" style={{ fontSize: tamanoDisplay, fontWeight: 700 }}>
                  {soles(total)}
                </span>
              </div>
              <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
                <Button block icon={<PauseOutlined />} onClick={ponerEnEspera} disabled={carrito.length === 0}>
                  {esMovil ? 'En espera' : 'En espera (F8)'}
                </Button>
                <Button block type="primary" size="large" onClick={abrirCobro} disabled={carrito.length === 0}>
                  {esMovil ? 'COBRAR' : 'COBRAR (F12)'}
                </Button>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>

      <ModalMedidas producto={prodMedidas} onCerrar={() => { setProdMedidas(null); }} onAgregar={agregarMedida} />
      <ModalCobro abierto={modalCobro} totalCentimos={total} procesando={procesando} onCerrar={() => { setModalCobro(false); }} onConfirmar={(m, r) => void confirmarCobro(m, r)} />
      <ModalTicket ticket={ticket} onNueva={() => { setTicket(null); foco(); }} />

      <Modal title="Ventas en espera" open={modalEspera} onCancel={() => { setModalEspera(false); }} footer={null}>
        {enEspera.map((v, i) => (
          <Button key={i} block style={{ marginBottom: 8, height: 'auto', textAlign: 'left', padding: 10 }} onClick={() => { retomar(i); }}>
            <b>{v.ref}</b> · {v.hora} · {v.carrito.length} ítems
          </Button>
        ))}
      </Modal>

      <Modal title="Abrir caja" open={modalCaja} onCancel={() => { setModalCaja(false); }} onOk={() => void confirmarAbrirCaja()} okText="Abrir caja">
        <div style={{ marginBottom: 4 }}>Monto inicial en caja (S/)</div>
        <InputNumber min={0} step={10} value={montoApertura} onChange={(v) => { setMontoApertura(v ?? 0); }} style={{ width: '100%' }} size="large" />
      </Modal>
    </div>
  );
}
