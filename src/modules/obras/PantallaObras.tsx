import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Col, Empty, Input, Modal, Row, Space, Switch, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, EnvironmentOutlined, PlusOutlined } from '@ant-design/icons';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import {
  ORDEN_ESTADOS_OBRA,
  ObraDetalle,
  ObraResumen,
  TIPOS_TRABAJO,
  agregarAmbiente,
  avanzarEstadoObra,
  crearClienteObra,
  crearObra,
  detalleObra,
  listarObras,
  listarTiposTrabajo,
  sincronizarLote,
} from '@shared/api/obras';
import { colores } from '@shared/tokens';
import { ModalMedirVano } from './ModalMedirVano';
import { VanoPendiente, pendientesDeAmbiente, pendientesDeObra, pendientesPorAmbiente, quitarPendientes } from './almacen-local';

export function PantallaObras(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();

  const [obras, setObras] = useState<ObraResumen[]>([]);
  const [detalle, setDetalle] = useState<ObraDetalle | null>(null);
  const [offline, setOffline] = useState(false);
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [modalObra, setModalObra] = useState(false);
  const [modalAmbiente, setModalAmbiente] = useState(false);
  const [medir, setMedir] = useState<{ ambienteId: string; codigo: string } | null>(null);
  const [tiposTrabajo, setTiposTrabajo] = useState<string[]>(TIPOS_TRABAJO);

  // Form nueva obra
  const [cliNombre, setCliNombre] = useState('');
  const [cliDni, setCliDni] = useState('');
  const [direccion, setDireccion] = useState('');
  const [nombreAmbiente, setNombreAmbiente] = useState('');

  const refrescarPendientes = useCallback((obraId?: string) => {
    setPendientes(obraId ? pendientesDeObra(obraId).length : 0);
  }, []);

  const cargarObras = useCallback(async () => {
    if (!sesion) return;
    try {
      setObras(await listarObras(sesion.token));
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudieron cargar las obras.');
    }
  }, [sesion, message]);

  useEffect(() => {
    void cargarObras();
  }, [cargarObras]);

  // Tipos de trabajo: base + los escritos a mano en vanos (si no hay señal, queda la lista base).
  useEffect(() => {
    if (!sesion) return;
    listarTiposTrabajo(sesion.token)
      .then(setTiposTrabajo)
      .catch(() => { setTiposTrabajo(TIPOS_TRABAJO); });
  }, [sesion]);

  const abrirObra = useCallback(
    async (id: string) => {
      if (!sesion) return;
      try {
        const d = await detalleObra(sesion.token, id);
        setDetalle(d);
        refrescarPendientes(id);
      } catch (e) {
        message.error(e instanceof ErrorApi ? e.message : 'No se pudo abrir la obra.');
      }
    },
    [sesion, message, refrescarPendientes],
  );

  async function sincronizar(): Promise<void> {
    if (!sesion || !detalle || offline) return;
    setSincronizando(true);
    try {
      let total = 0;
      for (const [ambienteId, grupo] of pendientesPorAmbiente()) {
        if (grupo[0]?.obraId !== detalle.id) continue;
        await sincronizarLote(sesion.token, ambienteId, grupo);
        quitarPendientes(grupo.map((v) => v.id));
        total += grupo.length;
      }
      if (total > 0) {
        message.success(`${String(total)} vano(s) enviados al sistema.`);
        // Un tipo escrito a mano ya quedó guardado: se recarga para selección rápida.
        listarTiposTrabajo(sesion.token).then(setTiposTrabajo).catch(() => undefined);
      }
      await abrirObra(detalle.id);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo sincronizar.');
    } finally {
      setSincronizando(false);
    }
  }

  function onVanoGuardado(): void {
    setMedir(null);
    if (detalle) refrescarPendientes(detalle.id);
    if (!offline) void sincronizar();
  }

  async function guardarObra(): Promise<void> {
    if (!sesion) return;
    if (cliNombre.trim().length < 3 || direccion.trim().length < 3) {
      message.warning('Complete el nombre del cliente y la dirección.');
      return;
    }
    try {
      const cli = await crearClienteObra(sesion.token, cliDni.trim().length === 8 ? { tipoDoc: 'DNI', numeroDoc: cliDni.trim(), nombre: cliNombre.trim() } : { tipoDoc: 'SIN_DOCUMENTO', nombre: cliNombre.trim() });
      const obra = await crearObra(sesion.token, cli.id, direccion.trim());
      message.success(`Obra ${obra.codigo} creada.`);
      setModalObra(false);
      setCliNombre('');
      setCliDni('');
      setDireccion('');
      await cargarObras();
      await abrirObra(obra.id);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo crear la obra.');
    }
  }

  async function guardarAmbiente(): Promise<void> {
    if (!sesion || !detalle) return;
    try {
      await agregarAmbiente(sesion.token, detalle.id, nombreAmbiente.trim());
      setModalAmbiente(false);
      setNombreAmbiente('');
      await abrirObra(detalle.id);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo agregar el ambiente.');
    }
  }

  // ===== Vista LISTA =====
  if (!detalle) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
          <Typography.Title level={3} style={{ color: colores.blue800, margin: 0 }}>
            Obras
          </Typography.Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setModalObra(true); }}>
            Nueva obra
          </Button>
        </Space>
        <Row gutter={[12, 12]}>
          {obras.map((o) => (
            <Col key={o.id} xs={24} sm={12}>
              <Card hoverable onClick={() => void abrirObra(o.id)}>
                <div style={{ fontWeight: 700, color: colores.blue800 }}>
                  {o.codigo} · {o.cliente}
                </div>
                <div style={{ color: colores.gray700, fontSize: 13 }}>
                  <EnvironmentOutlined /> {o.direccion}
                </div>
                <Tag style={{ marginTop: 6 }}>{o.vanos} vano(s)</Tag>
              </Card>
            </Col>
          ))}
          {obras.length === 0 && (
            <Col span={24}>
              <Empty description="Aún no hay obras. Cree la primera." />
            </Col>
          )}
        </Row>

        <Modal title="Nueva obra" open={modalObra} onCancel={() => { setModalObra(false); }} onOk={() => void guardarObra()} okText="Crear obra" cancelText="Cancelar">
          <div style={{ marginBottom: 8 }}>Nombre del cliente</div>
          <Input value={cliNombre} onChange={(e) => { setCliNombre(e.target.value); }} placeholder="Ej.: Familia Torres" style={{ marginBottom: 12 }} />
          <div style={{ marginBottom: 8 }}>DNI (opcional)</div>
          <Input value={cliDni} onChange={(e) => { setCliDni(e.target.value.replace(/\D/g, '')); }} maxLength={8} placeholder="8 dígitos" style={{ marginBottom: 12 }} />
          <div style={{ marginBottom: 8 }}>Dirección de la obra</div>
          <Input value={direccion} onChange={(e) => { setDireccion(e.target.value); }} placeholder="Ej.: Calle Las Flores 200 — Surco" />
        </Modal>
      </div>
    );
  }

  // ===== Vista OBRA (detalle + medición) =====
  const barra = offline
    ? { tipo: 'warning' as const, texto: `✈ Sin señal — ${String(pendientes)} guardado(s) en el teléfono` }
    : pendientes > 0
      ? { tipo: 'warning' as const, texto: `● ${String(pendientes)} vano(s) pendiente(s) de enviar` }
      : { tipo: 'success' as const, texto: '✓ Todo sincronizado con el sistema' };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Space style={{ marginBottom: 8 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => { setDetalle(null); void cargarObras(); }}>
          Obras
        </Button>
        <span style={{ fontWeight: 700, color: colores.blue800 }}>
          {detalle.codigo} · {detalle.cliente}
        </span>
        <Tag color="blue">{detalle.estado}</Tag>
        {sesion && ['CORTADOR', 'MAESTRO', 'GERENTE'].includes(sesion.rol) && detalle.estado !== 'ENTREGADA' && (
          <Button
            size="small"
            onClick={() => {
              const siguiente = ORDEN_ESTADOS_OBRA[ORDEN_ESTADOS_OBRA.indexOf(detalle.estado) + 1];
              void avanzarEstadoObra(sesion.token, detalle.id, siguiente)
                .then(() => {
                  message.success(`Obra en ${siguiente}.`);
                  void abrirObra(detalle.id);
                })
                .catch((e: unknown) => {
                  message.error(e instanceof ErrorApi ? e.message : 'No se pudo avanzar.');
                });
            }}
          >
            Avanzar a {ORDEN_ESTADOS_OBRA[ORDEN_ESTADOS_OBRA.indexOf(detalle.estado) + 1]} →
          </Button>
        )}
      </Space>

      <Alert
        type={barra.tipo}
        showIcon
        style={{ marginBottom: 12 }}
        message={barra.texto}
        action={
          <Space>
            <span style={{ fontSize: 12 }}>✈ Sin señal</span>
            <Switch checked={offline} onChange={setOffline} size="small" />
            {!offline && pendientes > 0 && (
              <Button size="small" type="primary" loading={sincronizando} onClick={() => void sincronizar()}>
                Enviar ahora
              </Button>
            )}
          </Space>
        }
      />

      {detalle.ambientes.map((a) => {
        const locales = pendientesDeAmbiente(a.id);
        const total = a.vanos.length + locales.length;
        return (
          <Card key={a.id} title={`🚪 ${a.nombre}`} style={{ marginBottom: 12 }} extra={<Button size="small" icon={<PlusOutlined />} onClick={() => { setMedir({ ambienteId: a.id, codigo: `V-${String(total + 1).padStart(2, '0')}` }); }}>Medir vano</Button>}>
          {a.vanos.map((v) => (
              <FilaVano key={v.id} codigo={v.codigo} nombre={v.nombre} tipo={v.tipo} medida={v.medidaActual ? `${String(v.medidaActual.anchoMm)}×${String(v.medidaActual.altoMm)} mm` : '—'} remetreado={v.medidas.length > 1} sincronizado />
            ))}
            {locales.map((v: VanoPendiente) => (
              <FilaVano key={v.id} codigo={v.codigo} nombre={v.nombre} tipo={v.tipo} medida={`${String(v.medidas[0].anchoMm)}×${String(v.medidas[0].altoMm)} mm`} remetreado={false} sincronizado={false} />
            ))}
            {total === 0 && <Typography.Text type="secondary">Sin vanos. Toque "Medir vano".</Typography.Text>}
          </Card>
        );
      })}

      <Button block icon={<PlusOutlined />} onClick={() => { setModalAmbiente(true); }}>
        Agregar ambiente
      </Button>

      {medir && (
        <ModalMedirVano obraId={detalle.id} ambienteId={medir.ambienteId} codigoSugerido={medir.codigo} abierto tipos={tiposTrabajo} onCerrar={() => { setMedir(null); }} onGuardado={onVanoGuardado} />
      )}

      <Modal title="Nuevo ambiente" open={modalAmbiente} onCancel={() => { setModalAmbiente(false); }} onOk={() => void guardarAmbiente()} okText="Agregar" cancelText="Cancelar">
        <Input value={nombreAmbiente} onChange={(e) => { setNombreAmbiente(e.target.value); }} placeholder="Ej.: Sala, Dormitorio 1, Baño" size="large" />
      </Modal>
    </div>
  );
}

function FilaVano({ codigo, nombre, tipo, medida, remetreado, sincronizado }: { codigo: string; nombre: string; tipo: string; medida: string; remetreado: boolean; sincronizado: boolean }): React.ReactNode {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: 20 }}>🪟</span>
      <div style={{ flex: 1 }}>
        <b>
          {codigo} · {nombre}
        </b>
        <div className="mono" style={{ fontSize: 12, color: colores.gray700 }}>
          {tipo} · {medida}
          {remetreado && ' · remetreado'}
        </div>
      </div>
      {sincronizado ? <Tag color="success">✓ En el sistema</Tag> : <Tag color="warning">● En el teléfono</Tag>}
    </div>
  );
}
