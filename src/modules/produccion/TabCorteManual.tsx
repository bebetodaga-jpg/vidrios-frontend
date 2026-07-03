import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Checkbox, Input, InputNumber, Select, Space, Table, Tag, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined, PrinterOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { ProductoCatalogo, buscarProductos } from '@shared/api/catalogo';
import { EntradaCorteManual, PlanCorte2D, calcularCorteManual, confirmarCorteManual } from '@shared/api/produccion';
import { colores } from '@shared/tokens';
import { DiagramaLamina } from './DiagramaLamina';

interface FilaPano {
  key: string;
  etiqueta: string;
  anchoCm: number;
  altoCm: number;
  cantidad: number;
}

const PLANCHA_ESTANDAR = { anchoCm: 330, altoCm: 214 };

function filaNueva(): FilaPano {
  return { key: crypto.randomUUID(), etiqueta: '', anchoCm: 0, altoCm: 0, cantidad: 1 };
}

/**
 * Optimizador de corte MANUAL: el usuario pone la medida de la plancha y la lista de paños
 * (mampara, ventana, etc.) y el sistema los acomoda geométricamente (empaque guillotina)
 * minimizando el desperdicio. Puede usar los retazos reales del vidrio y, al confirmar,
 * descuenta/crea los retazos en inventario.
 */
export function TabCorteManual(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();

  const [vidrios, setVidrios] = useState<ProductoCatalogo[]>([]);
  const [vidrioCodigo, setVidrioCodigo] = useState<string>();
  const [planchaAncho, setPlanchaAncho] = useState(PLANCHA_ESTANDAR.anchoCm);
  const [planchaAlto, setPlanchaAlto] = useState(PLANCHA_ESTANDAR.altoCm);
  const [usarRetazos, setUsarRetazos] = useState(true);
  const [panos, setPanos] = useState<FilaPano[]>([filaNueva()]);
  const [plan, setPlan] = useState<PlanCorte2D | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const cargarVidrios = useCallback(async () => {
    if (!sesion) return;
    try {
      const todos = await buscarProductos(sesion.token, '');
      setVidrios(todos.filter((p) => p.familia === 'VIDRIO'));
    } catch {
      /* el selector queda vacío; el usuario puede calcular sin retazos */
    }
  }, [sesion]);

  useEffect(() => {
    void cargarVidrios();
  }, [cargarVidrios]);

  function actualizar(key: string, campo: keyof FilaPano, valor: string | number): void {
    setPanos((filas) => filas.map((f) => (f.key === key ? { ...f, [campo]: valor } : f)));
  }

  function entradaActual(): EntradaCorteManual | null {
    const validos = panos.filter((p) => p.anchoCm > 0 && p.altoCm > 0 && p.cantidad > 0);
    if (validos.length === 0) {
      message.warning('Agregue al menos un paño con medidas y cantidad.');
      return null;
    }
    if (planchaAncho <= 0 || planchaAlto <= 0) {
      message.warning('Indique las medidas de la plancha.');
      return null;
    }
    return {
      vidrioCodigo: vidrioCodigo ?? '',
      planchaAnchoCm: planchaAncho,
      planchaAltoCm: planchaAlto,
      usarRetazos: usarRetazos && !!vidrioCodigo,
      panos: validos.map((p, i) => ({
        etiqueta: p.etiqueta.trim() || `Paño ${String(i + 1)}`,
        anchoCm: p.anchoCm,
        altoCm: p.altoCm,
        cantidad: p.cantidad,
      })),
    };
  }

  async function calcular(): Promise<void> {
    if (!sesion) return;
    const entrada = entradaActual();
    if (!entrada) return;
    setCalculando(true);
    try {
      setPlan(await calcularCorteManual(sesion.token, entrada));
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo calcular el acomodo.');
    } finally {
      setCalculando(false);
    }
  }

  async function confirmar(): Promise<void> {
    if (!sesion) return;
    if (!vidrioCodigo) {
      message.warning('Seleccione el vidrio para descontar y crear retazos.');
      return;
    }
    const entrada = entradaActual();
    if (!entrada) return;
    setConfirmando(true);
    try {
      const r = await confirmarCorteManual(sesion.token, { ...entrada, vidrioCodigo });
      const usados = r.retazosUsados.length > 0 ? ` Usó ${String(r.retazosUsados.length)} retazo(s).` : '';
      const creados = r.retazosCreados.length > 0 ? ` Creó: ${r.retazosCreados.join(', ')}.` : '';
      message.success(`Corte confirmado. ${String(r.planchasNuevas)} plancha(s) nueva(s).${usados}${creados}`);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo confirmar el corte.');
    } finally {
      setConfirmando(false);
    }
  }

  const columnas: ColumnsType<FilaPano> = [
    {
      title: 'Paño (mampara, ventana…)',
      dataIndex: 'etiqueta',
      render: (_: unknown, f: FilaPano) => (
        <Input
          placeholder="Ej.: Mampara hoja"
          value={f.etiqueta}
          onChange={(e) => { actualizar(f.key, 'etiqueta', e.target.value); }}
        />
      ),
    },
    {
      title: 'Ancho (cm)',
      width: 110,
      render: (_: unknown, f: FilaPano) => (
        <InputNumber min={0} value={f.anchoCm} onChange={(v) => { actualizar(f.key, 'anchoCm', v ?? 0); }} style={{ width: '100%' }} />
      ),
    },
    {
      title: 'Alto (cm)',
      width: 110,
      render: (_: unknown, f: FilaPano) => (
        <InputNumber min={0} value={f.altoCm} onChange={(v) => { actualizar(f.key, 'altoCm', v ?? 0); }} style={{ width: '100%' }} />
      ),
    },
    {
      title: 'Cant.',
      width: 90,
      render: (_: unknown, f: FilaPano) => (
        <InputNumber min={1} value={f.cantidad} onChange={(v) => { actualizar(f.key, 'cantidad', v ?? 1); }} style={{ width: '100%' }} />
      ),
    },
    {
      title: '',
      width: 44,
      render: (_: unknown, f: FilaPano) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => { setPanos((filas) => (filas.length > 1 ? filas.filter((x) => x.key !== f.key) : filas)); }}
        />
      ),
    },
  ];

  return (
    <div>
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space wrap align="end" size="middle">
          <div>
            <div style={{ fontSize: 12, color: colores.gray700, marginBottom: 2 }}>Vidrio (para usar/crear retazos)</div>
            <Select
              showSearch
              allowClear
              placeholder="Seleccione el vidrio…"
              style={{ width: 280 }}
              value={vidrioCodigo}
              onChange={(v) => { setVidrioCodigo(v); }}
              optionFilterProp="label"
              options={vidrios.map((v) => ({ label: `${v.nombre} (${v.codigo})`, value: v.codigo }))}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: colores.gray700, marginBottom: 2 }}>Plancha ancho (cm)</div>
            <InputNumber min={1} value={planchaAncho} onChange={(v) => { setPlanchaAncho(v ?? 0); }} style={{ width: 120 }} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: colores.gray700, marginBottom: 2 }}>Plancha alto (cm)</div>
            <InputNumber min={1} value={planchaAlto} onChange={(v) => { setPlanchaAlto(v ?? 0); }} style={{ width: 120 }} />
          </div>
          <Button onClick={() => { setPlanchaAncho(PLANCHA_ESTANDAR.anchoCm); setPlanchaAlto(PLANCHA_ESTANDAR.altoCm); }}>
            Estándar 330×214
          </Button>
          <Checkbox checked={usarRetazos} disabled={!vidrioCodigo} onChange={(e) => { setUsarRetazos(e.target.checked); }}>
            Usar retazos disponibles
          </Checkbox>
        </Space>
      </Card>

      <Table<FilaPano> rowKey="key" size="small" columns={columnas} dataSource={panos} pagination={false} />

      <Space style={{ marginTop: 10 }}>
        <Button icon={<PlusOutlined />} onClick={() => { setPanos((f) => [...f, filaNueva()]); }}>
          Agregar paño
        </Button>
        <Button type="primary" icon={<ThunderboltOutlined />} loading={calculando} onClick={() => void calcular()}>
          Calcular acomodo
        </Button>
      </Space>

      {plan && (
        <Card
          title="Plan de corte (acomodo geométrico)"
          extra={<Button icon={<PrinterOutlined />} onClick={() => { window.print(); }}>Imprimir</Button>}
          style={{ marginTop: 14 }}
        >
          <div className="doc-imprimible">
            <Space wrap style={{ marginBottom: 10 }}>
              <Tag color="blue">{String(plan.planchasNuevas)} plancha(s) {String(planchaAncho)}×{String(planchaAlto)} cm</Tag>
              {plan.retazosUsados.length > 0 && <Tag color="cyan">usa {String(plan.retazosUsados.length)} retazo(s)</Tag>}
              <Tag color="blue">uso {String(Math.round((100 - plan.desperdicioPct) * 10) / 10)}%</Tag>
              <Tag color="green">retazo reutilizable {String(plan.retazoUtilPct)}%</Tag>
              <Tag color={plan.mermaRealPct <= 5 ? 'green' : plan.mermaRealPct <= 15 ? 'orange' : 'red'}>
                merma real {String(plan.mermaRealPct)}%
              </Tag>
            </Space>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 0 }}>
              El área verde punteada es retazo que vuelve al inventario (no se pierde); la “merma real” es lo único que se bota.
              Las piezas se giran solas para entrar mejor (no importa cuál pongas como ancho o alto) y los cortes van pegados:
              el cortador de vidrio no tiene grosor.
            </Typography.Paragraph>
            <Space wrap align="start">
              {plan.laminas.map((l) => (
                <DiagramaLamina key={l.laminaId} lamina={l} />
              ))}
            </Space>
            {plan.laminas.length === 0 && (
              <Typography.Text type="secondary">No se acomodó ningún paño. Revise las medidas.</Typography.Text>
            )}
          </div>
          <Space style={{ marginTop: 12 }}>
            <Button type="primary" loading={confirmando} disabled={!vidrioCodigo} onClick={() => void confirmar()}>
              Confirmar y descontar retazos
            </Button>
            {!vidrioCodigo && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Seleccione un vidrio para poder confirmar el descuento de inventario.
              </Typography.Text>
            )}
          </Space>
        </Card>
      )}
    </div>
  );
}
