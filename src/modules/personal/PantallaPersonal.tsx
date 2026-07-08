import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Col, Input, InputNumber, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import { DeleteOutlined, TeamOutlined, ToolOutlined, UserAddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { ObraResumen, listarObras } from '@shared/api/obras';
import {
  CuadrillaVista,
  ETIQUETA_ESPECIALIDAD,
  ETIQUETA_TIPO_PAGO,
  Especialidad,
  PagoPersonalVista,
  PersonaTaller,
  ResumenPagosPersonal,
  TipoPagoPersonal,
  asignarCuadrilla,
  crearCuadrilla,
  listarCuadrillas,
  listarPersonal,
  pagosDePersona,
  quitarDeCuadrilla,
  registrarPagoPersonal,
  registrarPersona,
} from '@shared/api/personal';
import { aCentimos, soles } from '@shared/formato';
import { colores } from '@shared/tokens';

const OPCIONES_ESPECIALIDAD = (Object.keys(ETIQUETA_ESPECIALIDAD) as Especialidad[]).map((e) => ({ label: ETIQUETA_ESPECIALIDAD[e], value: e }));
const COLOR_TIPO: Record<TipoPagoPersonal, string> = { ADELANTO: 'warning', PAGO: 'success', DESTAJO: 'processing' };
const ESTILO_MONO = { fontFamily: 'Consolas, monospace' };

function TabPersonal(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const esGerente = sesion?.rol === 'GERENTE';

  const [personas, setPersonas] = useState<PersonaTaller[]>([]);
  const [buscar, setBuscar] = useState('');
  const [alta, setAlta] = useState({ nombre: '', dni: '', telefono: '', especialidad: 'AYUDANTE' as Especialidad });
  const [registrando, setRegistrando] = useState(false);
  const [seleccionada, setSeleccionada] = useState<PersonaTaller | null>(null);
  const [pagos, setPagos] = useState<PagoPersonalVista[]>([]);
  const [resumen, setResumen] = useState<ResumenPagosPersonal | null>(null);
  const [obras, setObras] = useState<ObraResumen[]>([]);
  const [pago, setPago] = useState<{ tipo: TipoPagoPersonal; concepto: string; monto?: number; obraId?: string }>({ tipo: 'DESTAJO', concepto: '' });
  const [pagando, setPagando] = useState(false);

  const cargar = useCallback(async () => {
    if (!sesion) return;
    try {
      setPersonas(await listarPersonal(sesion.token, buscar || undefined));
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo cargar el personal.');
    }
  }, [sesion, buscar, message]);

  useEffect(() => {
    const t = setTimeout(() => void cargar(), 250);
    return () => { clearTimeout(t); };
  }, [cargar]);

  useEffect(() => {
    if (!sesion || !esGerente) return;
    void listarObras(sesion.token).then(setObras).catch(() => { setObras([]); });
  }, [sesion, esGerente]);

  const abrirPagos = useCallback(
    async (p: PersonaTaller) => {
      if (!sesion) return;
      setSeleccionada(p);
      if (!esGerente) return;
      try {
        const r = await pagosDePersona(sesion.token, p.id);
        setPagos(r.pagos);
        setResumen(r.resumen);
      } catch (e) {
        message.error(e instanceof ErrorApi ? e.message : 'No se pudieron cargar los pagos.');
      }
    },
    [sesion, esGerente, message],
  );

  async function registrar(): Promise<void> {
    if (!sesion) return;
    setRegistrando(true);
    try {
      await registrarPersona(sesion.token, {
        nombre: alta.nombre,
        dni: alta.dni,
        especialidad: alta.especialidad,
        telefono: alta.telefono || undefined,
      });
      message.success(`${alta.nombre} quedó en el registro de personal.`);
      setAlta({ nombre: '', dni: '', telefono: '', especialidad: 'AYUDANTE' });
      await cargar();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo registrar.');
    } finally {
      setRegistrando(false);
    }
  }

  async function registrarPago(): Promise<void> {
    if (!sesion || !seleccionada || !pago.monto) return;
    setPagando(true);
    try {
      await registrarPagoPersonal(sesion.token, seleccionada.id, {
        tipo: pago.tipo,
        concepto: pago.concepto,
        montoCentimos: aCentimos(pago.monto),
        obraId: pago.obraId,
      });
      message.success('Registrado en la planilla (inmutable).');
      setPago({ tipo: pago.tipo, concepto: '' });
      await abrirPagos(seleccionada);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo registrar el pago.');
    } finally {
      setPagando(false);
    }
  }

  const columnasPagos: ColumnsType<PagoPersonalVista> = [
    { title: 'Fecha', dataIndex: 'creadoEn', width: 100, render: (f: string) => new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) },
    { title: 'Tipo', dataIndex: 'tipo', width: 110, render: (t: TipoPagoPersonal) => <Tag color={COLOR_TIPO[t]}>{t}</Tag> },
    { title: 'Concepto', dataIndex: 'concepto' },
    { title: 'Monto', dataIndex: 'montoCentimos', align: 'right', width: 110, render: (c: number) => <span className="mono">{soles(c)}</span> },
  ];

  return (
    <Row gutter={16}>
      <Col xs={24} lg={10}>
        {esGerente && (
          <Card size="small" title="Registrar personal externo" style={{ marginBottom: 14 }}>
            <Input placeholder="Nombre completo" value={alta.nombre} onChange={(e) => { setAlta({ ...alta, nombre: e.target.value }); }} style={{ marginBottom: 8 }} />
            <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
              <Input className="mono" placeholder="DNI (8 dígitos)" maxLength={8} value={alta.dni} onChange={(e) => { setAlta({ ...alta, dni: e.target.value.replace(/\D/g, '') }); }} />
              <Input className="mono" placeholder="Teléfono (opcional)" value={alta.telefono} onChange={(e) => { setAlta({ ...alta, telefono: e.target.value }); }} />
            </Space.Compact>
            <Select<Especialidad>
              value={alta.especialidad}
              onChange={(v) => { setAlta({ ...alta, especialidad: v }); }}
              options={OPCIONES_ESPECIALIDAD}
              style={{ width: '100%', marginBottom: 10 }}
            />
            <Button type="primary" block icon={<UserAddOutlined />} loading={registrando} disabled={!alta.nombre || alta.dni.length !== 8} onClick={() => void registrar()}>
              Registrar
            </Button>
          </Card>
        )}

        <Card size="small" title="Personal del taller">
          <Input.Search placeholder="Buscar por nombre o DNI…" allowClear value={buscar} onChange={(e) => { setBuscar(e.target.value); }} style={{ marginBottom: 8 }} />
          {personas.length === 0 && <Typography.Text type="secondary">Sin personal registrado todavía.</Typography.Text>}
          {personas.map((p) => (
            <div
              key={p.id}
              onClick={() => void abrirPagos(p)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 8px',
                borderBottom: `1px solid ${colores.gray100}`,
                cursor: 'pointer',
                background: seleccionada?.id === p.id ? colores.cyan100 : undefined,
                borderRadius: 4,
              }}
            >
              <span>
                <b>{p.nombre}</b>
                <div className="mono" style={{ fontSize: 12, color: colores.gray700 }}>DNI {p.dni}{p.telefono ? ` · ${p.telefono}` : ''}</div>
              </span>
              <Tag color="blue">{ETIQUETA_ESPECIALIDAD[p.especialidad]}</Tag>
            </div>
          ))}
        </Card>
      </Col>

      <Col xs={24} lg={14}>
        {!seleccionada ? (
          <Card size="small">
            <Typography.Text type="secondary">Toque una persona para ver {esGerente ? 'su planilla y registrar pagos' : 'sus datos'}.</Typography.Text>
          </Card>
        ) : !esGerente ? (
          <Card size="small" title={seleccionada.nombre}>
            <Typography.Text type="secondary">Los pagos y la planilla los maneja solo el gerente.</Typography.Text>
          </Card>
        ) : (
          <Card size="small" title={`Pagos de ${seleccionada.nombre}`}>
            {resumen && (
              <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                <Col xs={12} md={6}><Card size="small"><Statistic title="TOTAL PAGADO" value={soles(resumen.totalCentimos)} valueStyle={{ ...ESTILO_MONO, fontSize: 19, color: colores.blue800 }} /></Card></Col>
                <Col xs={12} md={6}><Card size="small"><Statistic title="Adelantos" value={soles(resumen.adelantosCentimos)} valueStyle={{ ...ESTILO_MONO, fontSize: 19, color: colores.amber500 }} /></Card></Col>
                <Col xs={12} md={6}><Card size="small"><Statistic title="Pagos" value={soles(resumen.pagosCentimos)} valueStyle={{ ...ESTILO_MONO, fontSize: 19, color: colores.green600 }} /></Card></Col>
                <Col xs={12} md={6}><Card size="small"><Statistic title="Destajos" value={soles(resumen.destajosCentimos)} valueStyle={{ ...ESTILO_MONO, fontSize: 19, color: colores.blue700 }} /></Card></Col>
              </Row>
            )}

            <Typography.Text strong style={{ color: colores.blue800 }}>Registrar pago / adelanto / destajo</Typography.Text>
            <Space wrap style={{ margin: '8px 0 4px' }}>
              <Select<TipoPagoPersonal>
                value={pago.tipo}
                onChange={(v) => { setPago({ ...pago, tipo: v }); }}
                style={{ width: 130 }}
                options={(Object.keys(ETIQUETA_TIPO_PAGO) as TipoPagoPersonal[]).map((t) => ({ label: ETIQUETA_TIPO_PAGO[t], value: t }))}
              />
              <InputNumber min={0.1} step={10} placeholder="Monto S/" value={pago.monto} onChange={(v) => { setPago({ ...pago, monto: v ?? undefined }); }} style={{ width: 120 }} className="mono" />
              <Input placeholder="Concepto (ej. Destajo corte OB-0048)" value={pago.concepto} onChange={(e) => { setPago({ ...pago, concepto: e.target.value }); }} style={{ width: 280, maxWidth: '100%' }} />
              <Select
                placeholder="Obra (opcional)"
                allowClear
                value={pago.obraId}
                onChange={(v: string | undefined) => { setPago({ ...pago, obraId: v }); }}
                style={{ width: 200, maxWidth: '100%' }}
                options={obras.map((o) => ({ label: `${o.codigo} · ${o.cliente}`, value: o.id }))}
              />
              <Button type="primary" loading={pagando} disabled={!pago.monto || pago.concepto.trim().length < 3} onClick={() => void registrarPago()}>
                Registrar en planilla
              </Button>
            </Space>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 12px' }}>
              ⚠ La planilla es inmutable: lo registrado no se edita ni se borra (queda con su nombre, fecha y hora).
            </Typography.Paragraph>

            <Table<PagoPersonalVista> rowKey="id" size="small" columns={columnasPagos} dataSource={pagos} pagination={{ pageSize: 8, hideOnSinglePage: true }} locale={{ emptyText: 'Sin pagos registrados.' }} />
          </Card>
        )}
      </Col>
    </Row>
  );
}

function TabCuadrillas(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();

  const [obras, setObras] = useState<ObraResumen[]>([]);
  const [personas, setPersonas] = useState<PersonaTaller[]>([]);
  const [cuadrillas, setCuadrillas] = useState<CuadrillaVista[]>([]);
  const [nueva, setNueva] = useState<{ obraId?: string; nombre: string }>({ nombre: '' });
  const [creando, setCreando] = useState(false);
  const [asignacion, setAsignacion] = useState<Record<string, { personalId?: string; rol: Especialidad } | undefined>>({});

  const cargar = useCallback(async () => {
    if (!sesion) return;
    try {
      const [os, ps, cs] = await Promise.all([listarObras(sesion.token), listarPersonal(sesion.token), listarCuadrillas(sesion.token)]);
      setObras(os);
      setPersonas(ps);
      setCuadrillas(cs);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudieron cargar las cuadrillas.');
    }
  }, [sesion, message]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function crear(): Promise<void> {
    if (!sesion || !nueva.obraId) return;
    setCreando(true);
    try {
      await crearCuadrilla(sesion.token, nueva.obraId, nueva.nombre);
      message.success('Cuadrilla creada.');
      setNueva({ nombre: '' });
      await cargar();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo crear la cuadrilla.');
    } finally {
      setCreando(false);
    }
  }

  async function asignar(c: CuadrillaVista): Promise<void> {
    const a = asignacion[c.id];
    if (!sesion || !a?.personalId) return;
    try {
      await asignarCuadrilla(sesion.token, c.id, a.personalId, a.rol);
      setAsignacion({ ...asignacion, [c.id]: undefined });
      await cargar();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo asignar.');
    }
  }

  async function quitar(c: CuadrillaVista, personalId: string): Promise<void> {
    if (!sesion) return;
    try {
      await quitarDeCuadrilla(sesion.token, c.id, personalId);
      await cargar();
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo quitar.');
    }
  }

  return (
    <Row gutter={16}>
      <Col xs={24} lg={9}>
        <Card size="small" title="Nueva cuadrilla">
          <Select
            placeholder="Obra…"
            value={nueva.obraId}
            onChange={(v: string) => { setNueva({ ...nueva, obraId: v }); }}
            style={{ width: '100%', marginBottom: 8 }}
            options={obras.map((o) => ({ label: `${o.codigo} · ${o.cliente} (${o.estado})`, value: o.id }))}
          />
          <Input placeholder="Nombre (ej. Equipo instalación 1)" value={nueva.nombre} onChange={(e) => { setNueva({ ...nueva, nombre: e.target.value }); }} style={{ marginBottom: 10 }} />
          <Button type="primary" block loading={creando} disabled={!nueva.obraId || nueva.nombre.trim().length < 3} onClick={() => void crear()}>
            + Crear cuadrilla
          </Button>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '8px 0 0' }}>
            El maestro arma su cuadrilla; el gerente ve todas.
          </Typography.Paragraph>
        </Card>
      </Col>

      <Col xs={24} lg={15}>
        {cuadrillas.length === 0 && (
          <Card size="small"><Typography.Text type="secondary">Sin cuadrillas todavía: cree una para la obra en curso.</Typography.Text></Card>
        )}
        {cuadrillas.map((c) => {
          const a = asignacion[c.id] ?? { rol: 'AYUDANTE' as Especialidad };
          const sinAsignar = personas.filter((p) => !c.integrantes.some((i) => i.personalId === p.id));
          return (
            <Card key={c.id} size="small" title={<Space>{c.nombre}<Tag className="mono" color="blue">{c.obraCodigo}</Tag></Space>} style={{ marginBottom: 12 }}>
              {c.integrantes.length === 0 && <Typography.Text type="secondary">Sin integrantes.</Typography.Text>}
              {c.integrantes.map((i) => (
                <div key={i.personalId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${colores.gray100}` }}>
                  <span><b>{i.nombre}</b> <Tag>{ETIQUETA_ESPECIALIDAD[i.rol]}</Tag></span>
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => void quitar(c, i.personalId)}>Quitar</Button>
                </div>
              ))}
              <Space wrap style={{ marginTop: 10 }}>
                <Select
                  placeholder="Agregar persona…"
                  value={a.personalId}
                  onChange={(v: string) => { setAsignacion({ ...asignacion, [c.id]: { ...a, personalId: v } }); }}
                  style={{ width: 230, maxWidth: '100%' }}
                  options={sinAsignar.map((p) => ({ label: `${p.nombre} (${ETIQUETA_ESPECIALIDAD[p.especialidad]})`, value: p.id }))}
                />
                <Select<Especialidad>
                  value={a.rol}
                  onChange={(v) => { setAsignacion({ ...asignacion, [c.id]: { ...a, rol: v } }); }}
                  style={{ width: 160 }}
                  options={OPCIONES_ESPECIALIDAD}
                />
                <Button disabled={!a.personalId} onClick={() => void asignar(c)}>+ Asignar</Button>
              </Space>
            </Card>
          );
        })}
      </Col>
    </Row>
  );
}

export function PantallaPersonal(): React.ReactNode {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ color: colores.blue800, marginTop: 0 }}>
        Personal
      </Typography.Title>
      <Tabs
        items={[
          { key: 'personal', label: <span><TeamOutlined /> Personal y pagos</span>, children: <TabPersonal /> },
          { key: 'cuadrillas', label: <span><ToolOutlined /> Cuadrillas por obra</span>, children: <TabCuadrillas /> },
        ]}
      />
    </div>
  );
}
