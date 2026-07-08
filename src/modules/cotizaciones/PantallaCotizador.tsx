import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Col, Input, InputNumber, Row, Space, Typography } from 'antd';
import { DeleteOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { ETIQUETA_UNIDAD, ProductoCatalogo, buscarProductos } from '@shared/api/catalogo';
import { ColorAluminio, ConfigItem, ItemCotizado, ModeloCotizacion, cotizarItem, crearCotizacion, listarModelos } from '@shared/api/cotizaciones';
import { aMmEntero, soles } from '@shared/formato';
import { colores, tamanoDisplay } from '@shared/tokens';
import { ModalPdfCotizacion } from './ModalPdfCotizacion';

interface ItemEnCotizacion extends ConfigItem {
  vidrioNombre: string;
  unitCentimos: number;
  totalCentimos: number;
}

// Réplica del prototipo aprobado ux-ui/sprint-0/prototipo-cotizador.html: wizard de pasos
// + panel derecho fijo con precio al instante, croquis del vano y despiece automático.
const PASOS = ['Vano', 'Modelo', 'Vidrio', 'Color', 'Cotización'];

const ICONO_MODELO: Record<string, string | undefined> = {
  corrediza: '🪟',
  mampara: '🚪',
  vitroven: '🌬️',
  guillotina: '⬆️',
  pivotante: '🔄',
  spider: '🕸️',
  fijo: '⬜',
  otro: '▦',
};

const CSS_COLOR: Record<string, string | undefined> = {
  natural: '#C8CCD0',
  negro: '#1F2937',
  bronce: '#6B4F2A',
  blanco: '#F8F8F6',
};

const ESTILO_TARJETA: React.CSSProperties = {
  background: colores.white,
  borderRadius: 8,
  boxShadow: '0 1px 3px rgba(16,42,67,.12)',
  padding: 20,
  marginBottom: 14,
};

const ESTILO_H2: React.CSSProperties = { color: colores.blue800, fontSize: 18, margin: '0 0 14px' };
const ESTILO_H3: React.CSSProperties = { color: colores.blue800, fontSize: 15, margin: '0 0 10px' };
const ESTILO_LABEL: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: colores.gray700, marginBottom: 4 };

function Croquis({ anchoMm, altoMm, hojas }: { anchoMm: number; altoMm: number; hojas: number }): React.ReactNode {
  if (!anchoMm || !altoMm) {
    return <svg width={220} height={170} />;
  }
  const esc = Math.min(180 / anchoMm, 130 / altoMm);
  const w = anchoMm * esc;
  const h = altoMm * esc;
  const x = (220 - w) / 2;
  const y = 10;
  const divisiones = [];
  for (let i = 1; i < hojas; i++) {
    const dx = x + (w / hojas) * i;
    divisiones.push(<line key={i} x1={dx} y1={y} x2={dx} y2={y + h} stroke={colores.blue600} strokeWidth={2} />);
  }
  return (
    <svg width={220} height={170}>
      <rect x={x} y={y} width={w} height={h} fill={colores.cyan100} stroke={colores.blue800} strokeWidth={3} />
      {divisiones}
      <text x={x + w / 2} y={y + h + 18} textAnchor="middle" fontFamily="Consolas" fontSize={13} fill={colores.gray900}>
        {anchoMm} mm
      </text>
      <text
        x={x - 8}
        y={y + h / 2}
        textAnchor="middle"
        fontFamily="Consolas"
        fontSize={13}
        fill={colores.gray900}
        transform={`rotate(-90 ${String(x - 8)} ${String(y + h / 2)})`}
      >
        {altoMm} mm
      </text>
    </svg>
  );
}

export function PantallaCotizador(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();

  const [paso, setPaso] = useState(0);
  const [modelos, setModelos] = useState<ModeloCotizacion[]>([]);
  const [coloresAlu, setColoresAlu] = useState<ColorAluminio[]>([]);
  const [vidrios, setVidrios] = useState<ProductoCatalogo[]>([]);
  const [config, setConfig] = useState<ConfigItem>({ vanoCodigo: 'V-01', modelo: '', vidrioCodigo: '', color: '', anchoMm: 1500, altoMm: 1200, cantidad: 1 });
  const [preview, setPreview] = useState<ItemCotizado | null>(null);
  const [errorPreview, setErrorPreview] = useState<string | null>(null);
  const [items, setItems] = useState<ItemEnCotizacion[]>([]);
  const [creando, setCreando] = useState(false);
  const [numero, setNumero] = useState<string | null>(null);
  const [pdf, setPdf] = useState(false);

  const modeloSel = useMemo(() => modelos.find((m) => m.clave === config.modelo), [modelos, config.modelo]);

  useEffect(() => {
    if (!sesion) return;
    void listarModelos(sesion.token).then((r) => {
      setModelos(r.modelos);
      setColoresAlu(r.colores);
    });
    void buscarProductos(sesion.token, '').then((ps) => {
      setVidrios(ps.filter((p) => p.familia === 'VIDRIO'));
    });
  }, [sesion]);

  // Precio al instante: recalcula cuando cambia la configuración (igual que el prototipo).
  const recalcular = useCallback(async () => {
    if (!sesion || !config.modelo || !config.vidrioCodigo || !config.color || !config.anchoMm || !config.altoMm) {
      setPreview(null);
      setErrorPreview(null);
      return;
    }
    try {
      setPreview(await cotizarItem(sesion.token, config));
      setErrorPreview(null);
    } catch (e) {
      setPreview(null);
      setErrorPreview(e instanceof ErrorApi ? e.message : 'No se pudo calcular.');
    }
  }, [sesion, config]);

  useEffect(() => {
    const t = setTimeout(() => void recalcular(), 250);
    return () => { clearTimeout(t); };
  }, [recalcular]);

  function vidriosPermitidos(modelo: ModeloCotizacion | undefined): ProductoCatalogo[] {
    return vidrios.filter((v) => {
      if (modelo?.soloTemplado && v.subfamilia !== 'Templado') return false;
      if (modelo?.solo10mm && v.grosorMm !== 10) return false;
      return true;
    });
  }

  function irPaso(n: number): void {
    if (n < 0 || n > PASOS.length - 1) return;
    if (n >= 2 && !config.modelo) {
      message.warning('Primero elija el modelo.');
      return;
    }
    if (n >= 3 && !config.vidrioCodigo) {
      message.warning('Primero elija el vidrio.');
      return;
    }
    if (n >= 4 && !config.color) {
      message.warning('Primero elija el color del aluminio.');
      return;
    }
    setPaso(n);
  }

  function elegirModelo(m: ModeloCotizacion): void {
    const permitidos = vidriosPermitidos(m);
    const vidrioSigueValido = permitidos.some((v) => v.codigo === config.vidrioCodigo);
    setConfig({ ...config, modelo: m.clave, vidrioCodigo: vidrioSigueValido ? config.vidrioCodigo : '' });
    setPaso(2);
  }

  function agregar(): void {
    if (!preview) {
      message.warning(errorPreview ?? 'Complete vano, modelo, vidrio y color.');
      return;
    }
    setItems((xs) => [...xs, { ...config, vidrioNombre: preview.vidrioNombre, unitCentimos: preview.unitCentimos, totalCentimos: preview.totalCentimos }]);
    const n = items.length + 2;
    setConfig((c) => ({ ...c, vanoCodigo: `V-${String(n).padStart(2, '0')}` }));
    setNumero(null);
    message.success('Vano agregado a la cotización.');
  }

  async function crear(): Promise<void> {
    if (!sesion || items.length === 0) return;
    setCreando(true);
    try {
      const configs: ConfigItem[] = items.map((it) => ({
        vanoCodigo: it.vanoCodigo,
        modelo: it.modelo,
        vidrioCodigo: it.vidrioCodigo,
        color: it.color,
        anchoMm: it.anchoMm,
        altoMm: it.altoMm,
        cantidad: it.cantidad,
      }));
      const r = await crearCotizacion(sesion.token, configs);
      setNumero(r.numero);
      message.success(`Cotización ${r.numero} creada.`);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo crear la cotización.');
    } finally {
      setCreando(false);
    }
  }

  const total = items.reduce((s, i) => s + i.totalCentimos, 0);
  const vidriosDisponibles = vidriosPermitidos(modeloSel);
  const areaM2 = (config.anchoMm * config.altoMm) / 10000;
  const recomendacion = modeloSel?.soloTemplado
    ? '★ Recomendación de seguridad: en este modelo se usa vidrio TEMPLADO (norma de vidrio de seguridad).'
    : areaM2 > 2.2
      ? '★ El paño supera 2.2 m²: se recomienda grosor 8 mm o más.'
      : '';
  const hojas = preview ? Math.min(preview.despiece.panos.reduce((s, p) => s + p.cantidad, 0), 6) : 1;
  const barrillas = preview ? Math.ceil((preview.metrosLinealesAluminio / 6) * 100) / 100 : 0;

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ color: colores.blue800, marginTop: 0 }}>
        Cotizador
      </Typography.Title>

      <Row gutter={16}>
        {/* ===== Flujo por pasos ===== */}
        <Col xs={24} lg={15}>
          <div className="cotz-pasos" style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {PASOS.map((p, i) => (
              <button
                key={p}
                type="button"
                className={`cotz-paso-tab${i === paso ? ' activo' : i < paso ? ' hecho' : ''}`}
                onClick={() => { irPaso(i); }}
              >
                {i < paso ? `✓ ${p}` : `${String(i + 1)} · ${p}`}
              </button>
            ))}
          </div>

          {paso === 0 && (
            <div style={ESTILO_TARJETA}>
              <h2 style={ESTILO_H2}>1 · Medidas del vano</h2>
              <Row gutter={12} style={{ marginBottom: 12 }}>
                <Col span={24}>
                  <label style={ESTILO_LABEL}>Vano</label>
                  <Input value={config.vanoCodigo} onChange={(e) => { setConfig({ ...config, vanoCodigo: e.target.value }); }} />
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={8}>
                  <label style={ESTILO_LABEL}>Ancho (mm)</label>
                  <InputNumber className="mono" min={1} step={1} value={config.anchoMm} onChange={(v) => { setConfig({ ...config, anchoMm: aMmEntero(v) }); }} style={{ width: '100%' }} />
                </Col>
                <Col span={8}>
                  <label style={ESTILO_LABEL}>Alto (mm)</label>
                  <InputNumber className="mono" min={1} step={1} value={config.altoMm} onChange={(v) => { setConfig({ ...config, altoMm: aMmEntero(v) }); }} style={{ width: '100%' }} />
                </Col>
                <Col span={8}>
                  <label style={ESTILO_LABEL}>Cantidad de vanos iguales</label>
                  <InputNumber className="mono" min={1} value={config.cantidad} onChange={(v) => { setConfig({ ...config, cantidad: v ?? 1 }); }} style={{ width: '100%' }} />
                </Col>
              </Row>
              <p style={{ color: colores.gray500, fontSize: 13, fontStyle: 'italic', margin: '12px 0 0' }}>
                Estas medidas también llegan solas desde la toma de medidas en campo (módulo Obras).
              </p>
            </div>
          )}

          {paso === 1 && (
            <div style={ESTILO_TARJETA}>
              <h2 style={ESTILO_H2}>2 · Modelo de carpintería</h2>
              <div className="cotz-opciones">
                {modelos.map((m) => (
                  <button key={m.clave} type="button" className={`cotz-opcion${config.modelo === m.clave ? ' sel' : ''}`} onClick={() => { elegirModelo(m); }}>
                    <div className="icono">{ICONO_MODELO[m.clave] ?? '▦'}</div>
                    <div className="nom">{m.nombre}</div>
                    <div className="sub">{m.soloTemplado ? 'Templado ★ · ' : ''}{m.descuentoFabricacion}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {paso === 2 && (
            <div style={ESTILO_TARJETA}>
              <h2 style={ESTILO_H2}>3 · Tipo y grosor de vidrio</h2>
              <div className="cotz-opciones">
                {vidriosDisponibles.map((v) => (
                  <button
                    key={v.codigo}
                    type="button"
                    className={`cotz-opcion${config.vidrioCodigo === v.codigo ? ' sel' : ''}`}
                    onClick={() => { setConfig({ ...config, vidrioCodigo: v.codigo }); setPaso(3); }}
                  >
                    <div className="icono">▦</div>
                    <div className="nom">{v.nombre}</div>
                    <div className="sub">{v.subfamilia} · {v.precio}/{ETIQUETA_UNIDAD[v.unidadVenta]}</div>
                  </button>
                ))}
              </div>
              {recomendacion && (
                <p style={{ color: colores.gray500, fontSize: 13, fontStyle: 'italic', margin: '12px 0 0' }}>{recomendacion}</p>
              )}
            </div>
          )}

          {paso === 3 && (
            <div style={ESTILO_TARJETA}>
              <h2 style={ESTILO_H2}>4 · Color del aluminio</h2>
              <div className="cotz-opciones">
                {coloresAlu.map((c) => (
                  <button
                    key={c.clave}
                    type="button"
                    className={`cotz-opcion${config.color === c.clave ? ' sel' : ''}`}
                    onClick={() => { setConfig({ ...config, color: c.clave }); setPaso(4); }}
                  >
                    <div className="cotz-muestra" style={{ background: CSS_COLOR[c.clave] ?? '#C8CCD0' }} />
                    <div className="nom">{c.nombre}</div>
                    <div className="sub">{c.factor > 1 ? `+${String(Math.round((c.factor - 1) * 100))}%` : 'precio base'}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {paso === 4 && (
            <div style={ESTILO_TARJETA}>
              <h2 style={ESTILO_H2}>5 · Cotización</h2>
              <Button type="primary" size="large" block disabled={!preview} onClick={agregar}>
                + Agregar este vano a la cotización
              </Button>
              {errorPreview && <Alert type="warning" showIcon message={errorPreview} style={{ marginTop: 10 }} />}

              {items.length === 0 ? (
                <p style={{ color: colores.gray500, fontSize: 13, fontStyle: 'italic', margin: '12px 0 0' }}>
                  Agregue el vano configurado; puede volver al paso 1 para cotizar más vanos en la misma cotización.
                </p>
              ) : (
                <>
                  {items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${colores.gray100}` }}>
                      <span>
                        <b>{it.vanoCodigo}</b> · {modelos.find((m) => m.clave === it.modelo)?.nombre ?? it.modelo} ×{it.cantidad}
                        <div style={{ fontSize: 11, color: colores.gray700 }}>{it.vidrioNombre} · {it.anchoMm}×{it.altoMm} mm</div>
                      </span>
                      <span className="mono">
                        {soles(it.totalCentimos)}{' '}
                        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => { setItems((xs) => xs.filter((_, j) => j !== i)); }} />
                      </span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 20, fontWeight: 700, color: colores.blue800 }}>
                    <span>TOTAL</span>
                    <span className="mono">{soles(total)}</span>
                  </div>
                  {numero && <Alert type="success" showIcon style={{ marginTop: 10 }} message={`Cotización ${numero} guardada.`} />}
                  <Space style={{ marginTop: 12, width: '100%' }} styles={{ item: { flex: 1 } }}>
                    <Button block size="large" icon={<FilePdfOutlined />} onClick={() => { setPdf(true); }}>
                      Ver PDF de cotización
                    </Button>
                    <Button block size="large" type="primary" loading={creando} onClick={() => void crear()}>
                      Crear cotización
                    </Button>
                  </Space>
                </>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <Button size="large" disabled={paso === 0} onClick={() => { irPaso(paso - 1); }}>
              ← Atrás
            </Button>
            {paso < PASOS.length - 1 && (
              <Button size="large" type="primary" onClick={() => { irPaso(paso + 1); }}>
                Seguir →
              </Button>
            )}
          </div>
        </Col>

        {/* ===== Panel derecho: precio al instante ===== */}
        <Col xs={24} lg={9}>
          <div style={{ position: 'sticky', top: 16 }}>
            <div style={{ background: colores.blue800, color: colores.white, borderRadius: 8, padding: '18px 20px', marginBottom: 14 }}>
              <div style={{ fontSize: 13, opacity: 0.85 }}>PRECIO AL INSTANTE (inc. IGV)</div>
              <div className="mono" style={{ fontSize: tamanoDisplay, fontWeight: 700, lineHeight: 1.15 }}>
                {preview ? soles(preview.totalCentimos) : '—'}
              </div>
              <div className="mono" style={{ fontSize: 13, opacity: 0.85, color: errorPreview ? '#FDE68A' : undefined }}>
                {errorPreview ??
                  (preview
                    ? config.cantidad > 1
                      ? `${String(config.cantidad)} vanos × ${soles(preview.unitCentimos)} c/u`
                      : 'por 1 vano'
                    : 'Complete vano, modelo, vidrio y color')}
              </div>
            </div>

            <div style={ESTILO_TARJETA}>
              <h3 style={ESTILO_H3}>Croquis del vano</h3>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
                <Croquis anchoMm={config.anchoMm} altoMm={config.altoMm} hojas={hojas} />
              </div>

              <h3 style={{ ...ESTILO_H3, marginTop: 10 }}>Despiece automático</h3>
              {!preview ? (
                <p style={{ color: colores.gray500, fontSize: 13, fontStyle: 'italic', margin: 0 }}>
                  Elija modelo, vidrio y color para ver el despiece de perfiles y paños.
                </p>
              ) : (
                <>
                  <table className="cotz-tabla">
                    <thead>
                      <tr><th>Perfil</th><th className="num">Cant.</th><th className="num">Largo</th></tr>
                    </thead>
                    <tbody>
                      {preview.despiece.perfiles.map((p, i) => (
                        <tr key={i}>
                          <td>{p.nombre}</td>
                          <td className="num">{p.cantidad}</td>
                          <td className="num">{(p.largoMm / 100).toFixed(2)} m</td>
                        </tr>
                      ))}
                      <tr>
                        <td><b>Aluminio total</b></td>
                        <td />
                        <td className="num"><b>{preview.metrosLinealesAluminio} m ≈ {barrillas} brr</b></td>
                      </tr>
                    </tbody>
                  </table>
                  <table className="cotz-tabla" style={{ marginTop: 8 }}>
                    <thead>
                      <tr><th>Paño de vidrio</th><th className="num">Cant.</th><th className="num">Medida</th></tr>
                    </thead>
                    <tbody>
                      {preview.despiece.panos.map((p, i) => (
                        <tr key={i}>
                          <td>Paño</td>
                          <td className="num">{p.cantidad}</td>
                          <td className="num">{Math.round(p.anchoMm)} × {Math.round(p.altoMm)} mm</td>
                        </tr>
                      ))}
                      <tr>
                        <td><b>Vidrio total</b></td>
                        <td />
                        <td className="num"><b>{preview.m2Vidrio} m²</b></td>
                      </tr>
                    </tbody>
                  </table>
                  {preview.despiece.accesoriosExtra.length > 0 && (
                    <table className="cotz-tabla" style={{ marginTop: 8 }}>
                      <thead>
                        <tr><th>Accesorio</th><th className="num">Cant.</th></tr>
                      </thead>
                      <tbody>
                        {preview.despiece.accesoriosExtra.map((a, i) => (
                          <tr key={i}>
                            <td>{a.nombre}</td>
                            <td className="num">{a.cantidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          </div>
        </Col>
      </Row>

      <ModalPdfCotizacion abierto={pdf} numero={numero} items={items} total={total} modelos={modelos} onCerrar={() => { setPdf(false); }} />
    </div>
  );
}
