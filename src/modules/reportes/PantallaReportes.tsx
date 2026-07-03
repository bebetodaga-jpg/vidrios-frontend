import { useEffect, useState } from 'react';
import { App, Button, Card, Col, Row, Typography } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { Alertas, PanelGerencial, alertasGerencia, panelGerencial } from '@shared/api/reportes';
import { soles } from '@shared/formato';
import { colores } from '@shared/tokens';

// Réplica del prototipo ux-ui/sprint-11/prototipo-dashboard.html:
// 1) alertas arriba sin buscar, 2) 4 KPIs, 3) barras 30 días + margen por obra, 4) rankings + Excel.

const ESTILO_TARJETA: React.CSSProperties = { background: colores.white, borderRadius: 8, boxShadow: '0 1px 3px rgba(16,42,67,.12)', padding: 16 };
const ESTILO_H2: React.CSSProperties = { color: colores.blue800, fontSize: 15, margin: '0 0 10px' };
const ESTILO_TH: React.CSSProperties = { background: colores.gray100, textAlign: 'left', padding: '6px 8px', color: colores.gray700, fontSize: 11.5 };
const ESTILO_TD: React.CSSProperties = { padding: '7px 8px', borderBottom: `1px solid ${colores.gray100}` };
const ESTILO_TD_NUM: React.CSSProperties = { ...ESTILO_TD, textAlign: 'right', fontFamily: 'Consolas, monospace', whiteSpace: 'nowrap' };

function diaCorto(fecha: string): string {
  const [, m, d] = fecha.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
  return `${String(Number(d))} ${meses[Number(m) - 1] ?? ''}`;
}

function colorMargen(pct: number): string {
  if (pct < 0) return colores.red600;
  if (pct < 60) return colores.amber500;
  return colores.green600;
}

function Alerta({ tono, n, titulo, detalle }: { tono: 'roja' | 'ambar'; n: number; titulo: string; detalle: string }): React.ReactNode {
  const color = tono === 'roja' ? colores.red600 : colores.amber500;
  const fondo = tono === 'roja' ? '#FEE2E2' : '#FEF3C7';
  return (
    <div style={{ flex: 1, minWidth: 260, borderRadius: 8, padding: '10px 14px', fontWeight: 600, display: 'flex', gap: 10, alignItems: 'center', background: fondo, color, borderLeft: `5px solid ${color}` }}>
      <span className="mono" style={{ fontSize: 26, fontWeight: 700 }}>{n}</span>
      <span>
        {titulo}
        <div style={{ fontSize: 12, fontWeight: 400 }}>{detalle}</div>
      </span>
    </div>
  );
}

function Kpi({ etiqueta, valor, sub, destacado, colorValor }: { etiqueta: string; valor: string; sub: string; destacado?: boolean; colorValor?: string }): React.ReactNode {
  return (
    <div style={{ ...ESTILO_TARJETA, padding: '14px 16px', background: destacado ? colores.blue800 : colores.white, height: '100%' }}>
      <div style={{ fontSize: 11.5, letterSpacing: '.04em', color: destacado ? 'rgba(255,255,255,.85)' : colores.gray700 }}>{etiqueta}</div>
      <div className="mono" style={{ fontSize: 27, fontWeight: 700, lineHeight: 1.3, color: destacado ? colores.white : colorValor ?? colores.blue800 }}>{valor}</div>
      <div style={{ fontSize: 12, color: destacado ? 'rgba(255,255,255,.7)' : colores.gray500 }}>{sub}</div>
    </div>
  );
}

export function PantallaReportes(): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const [panel, setPanel] = useState<PanelGerencial | null>(null);
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    if (!sesion) return;
    Promise.all([panelGerencial(sesion.token), alertasGerencia(sesion.token)])
      .then(([p, a]) => {
        setPanel(p);
        setAlertas(a);
      })
      .catch((e: unknown) => {
        message.error(e instanceof ErrorApi ? e.message : 'No se pudo cargar el panel.');
      });
  }, [sesion, message]);

  async function exportarExcel(): Promise<void> {
    if (!panel || !alertas) return;
    setExportando(true);
    try {
      const XLSX = await import('xlsx'); // carga diferida (mismo patrón que la carga de catálogo)
      const libro = XLSX.utils.book_new();
      const aSoles = (c: number): number => c / 100;

      XLSX.utils.book_append_sheet(
        libro,
        XLSX.utils.aoa_to_sheet([['Fecha', 'Ventas S/', 'Tickets'], ...panel.serie.map((d) => [d.fecha, aSoles(d.ventasCentimos), d.tickets])]),
        'Ventas 30 días',
      );
      XLSX.utils.book_append_sheet(
        libro,
        XLSX.utils.aoa_to_sheet([
          ['Obra', 'Cliente', 'Contratado S/', 'Costos personal S/', 'Margen S/', 'Margen %'],
          ...panel.margenObras.map((m) => [m.obraCodigo, m.cliente, aSoles(m.contratadoCentimos), aSoles(m.costosPersonalCentimos), aSoles(m.margenCentimos), m.margenPct]),
        ]),
        'Margen por obra',
      );
      XLSX.utils.book_append_sheet(
        libro,
        XLSX.utils.aoa_to_sheet([['Producto', 'Vendido S/', 'Unidades'], ...panel.rankingProductos.map((p) => [p.nombre, aSoles(p.importeCentimos), p.unidades])]),
        'Top productos',
      );
      XLSX.utils.book_append_sheet(
        libro,
        XLSX.utils.aoa_to_sheet([['Vendedor', 'Vendido S/', 'Tickets'], ...panel.rankingVendedores.map((v) => [v.nombre, aSoles(v.importeCentimos), v.tickets])]),
        'Vendedores',
      );
      XLSX.utils.book_append_sheet(
        libro,
        XLSX.utils.aoa_to_sheet([
          ['Tipo', 'Detalle', 'Dato'],
          ...alertas.pagosVencidos.map((p) => ['Pago vencido', `${p.cliente} (${p.numeroVenta})`, aSoles(p.saldoCentimos)]),
          ...alertas.stockMinimo.map((s) => ['Stock mínimo', `${s.nombre} (${s.codigo})`, `${String(s.saldo)} ≤ ${String(s.minimo)}`]),
          ...alertas.obrasAtrasadas.map((o) => ['Obra atrasada', `${o.codigo} ${o.cliente} (${o.estado})`, `${String(o.dias)} días`]),
        ]),
        'Alertas',
      );
      XLSX.writeFile(libro, 'reportes-vidrios-galaxi.xlsx');
      message.success('Excel descargado: reportes-vidrios-galaxi.xlsx');
    } finally {
      setExportando(false);
    }
  }

  if (!panel || !alertas) {
    return <Typography.Text type="secondary">Cargando el panel del negocio…</Typography.Text>;
  }

  const maxVentas = Math.max(...panel.serie.map((d) => d.ventasCentimos), 1);
  const hayAlertas = alertas.pagosVencidos.length + alertas.stockMinimo.length + alertas.obrasAtrasadas.length > 0;

  return (
    <div style={{ maxWidth: 1150, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={3} style={{ color: colores.blue800, marginTop: 0 }}>
          Reportes del negocio
        </Typography.Title>
        <Button icon={<FileExcelOutlined />} loading={exportando} style={{ borderColor: colores.green600, color: colores.green600 }} onClick={() => void exportarExcel()}>
          Exportar todo a Excel
        </Button>
      </div>

      {/* 1) Alertas: lo que requiere acción hoy, sin buscar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {alertas.pagosVencidos.length > 0 && (
          <Alerta
            tono="roja"
            n={alertas.pagosVencidos.length}
            titulo="Pagos vencidos"
            detalle={alertas.pagosVencidos.slice(0, 2).map((p) => `${p.cliente} ${soles(p.saldoCentimos)}`).join(' · ')}
          />
        )}
        {alertas.stockMinimo.length > 0 && (
          <Alerta
            tono="ambar"
            n={alertas.stockMinimo.length}
            titulo="Productos bajo stock mínimo"
            detalle={alertas.stockMinimo.slice(0, 3).map((s) => `${s.nombre} (${String(s.saldo)} ≤ ${String(s.minimo)})`).join(' · ')}
          />
        )}
        {alertas.obrasAtrasadas.length > 0 && (
          <Alerta
            tono="ambar"
            n={alertas.obrasAtrasadas.length}
            titulo="Obras atrasadas (+30 días)"
            detalle={alertas.obrasAtrasadas.slice(0, 2).map((o) => `${o.codigo} ${o.cliente} — ${String(o.dias)} días en ${o.estado}`).join(' · ')}
          />
        )}
        {!hayAlertas && (
          <div style={{ flex: 1, borderRadius: 8, padding: '10px 14px', fontWeight: 600, background: '#D1FAE5', color: colores.green600, borderLeft: `5px solid ${colores.green600}` }}>
            ✓ Sin alertas: cobranzas al día, stock sobre el mínimo y obras en plazo.
          </div>
        )}
      </div>

      {/* 2) KPIs */}
      <Row gutter={[10, 10]} style={{ marginBottom: 14 }}>
        <Col xs={12} md={6}><Kpi destacado etiqueta="VENTAS DE HOY" valor={soles(panel.ventasHoy.ventasCentimos)} sub={`${String(panel.ventasHoy.tickets)} tickets`} /></Col>
        <Col xs={12} md={6}><Kpi etiqueta="VENTAS DEL MES" valor={soles(panel.ventasMes.ventasCentimos)} sub={`${String(panel.ventasMes.tickets)} tickets`} /></Col>
        <Col xs={12} md={6}><Kpi etiqueta="POR COBRAR" valor={soles(panel.porCobrar.totalCentimos)} colorValor={panel.porCobrar.vencidas > 0 ? colores.amber500 : undefined} sub={`${String(panel.porCobrar.cuentas)} créditos · ${String(panel.porCobrar.vencidas)} vencidos`} /></Col>
        <Col xs={12} md={6}><Kpi etiqueta="DESPERDICIO DE CORTE" valor={`${String(panel.desperdicioPromedioPct)} %`} sub="promedio de las órdenes" /></Col>
      </Row>

      {/* 3) Ventas 30 días + margen por obra */}
      <Row gutter={[14, 14]}>
        <Col xs={24} lg={14}>
          <div style={ESTILO_TARJETA}>
            <h2 style={ESTILO_H2}>Ventas — últimos 30 días</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 130, paddingTop: 6 }}>
              {panel.serie.map((d, i) => (
                <div
                  key={d.fecha}
                  title={`${diaCorto(d.fecha)}: ${soles(d.ventasCentimos)} (${String(d.tickets)} tickets)`}
                  style={{
                    flex: 1,
                    minHeight: 2,
                    borderRadius: '2px 2px 0 0',
                    height: `${String((d.ventasCentimos / maxVentas) * 100)}%`,
                    background: i === panel.serie.length - 1 ? colores.blue800 : colores.cyan500,
                  }}
                />
              ))}
            </div>
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: colores.gray500, marginTop: 4 }}>
              <span>{diaCorto(panel.serie[0]?.fecha ?? '')}</span>
              <span>{diaCorto(panel.serie[Math.floor(panel.serie.length / 2)]?.fecha ?? '')}</span>
              <span>{diaCorto(panel.serie[panel.serie.length - 1]?.fecha ?? '')}</span>
            </div>
          </div>
        </Col>
        <Col xs={24} lg={10}>
          <div style={{ ...ESTILO_TARJETA, height: '100%' }}>
            <h2 style={ESTILO_H2}>Margen por obra (contratado vs. costos registrados)</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr><th style={ESTILO_TH}>Obra</th><th style={{ ...ESTILO_TH, textAlign: 'right' }}>Contratado</th><th style={{ ...ESTILO_TH, textAlign: 'right' }}>Costos</th><th style={{ ...ESTILO_TH, textAlign: 'right' }}>Margen</th></tr>
              </thead>
              <tbody>
                {panel.margenObras.length === 0 && (
                  <tr><td style={ESTILO_TD} colSpan={4}><Typography.Text type="secondary">Aún no hay contratos vinculados a obras.</Typography.Text></td></tr>
                )}
                {panel.margenObras.map((m) => (
                  <tr key={m.obraCodigo}>
                    <td style={ESTILO_TD}>{m.obraCodigo} · {m.cliente}</td>
                    <td style={ESTILO_TD_NUM}>{soles(m.contratadoCentimos)}</td>
                    <td style={ESTILO_TD_NUM}>{soles(m.costosPersonalCentimos)}</td>
                    <td style={{ ...ESTILO_TD_NUM, color: colorMargen(m.margenPct), fontWeight: 700 }}>{m.margenPct} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 11.5, color: colores.gray500, fontStyle: 'italic', marginTop: 8 }}>
              Costos = pagos/destajos al personal por obra. El material por obra se suma cuando el kárdex referencie la obra.
            </p>
          </div>
        </Col>
      </Row>

      {/* 4) Rankings */}
      <Row gutter={[14, 14]} style={{ marginTop: 14 }}>
        <Col xs={24} lg={12}>
          <div style={{ ...ESTILO_TARJETA, height: '100%' }}>
            <h2 style={ESTILO_H2}>Productos más vendidos</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr><th style={ESTILO_TH}>#</th><th style={ESTILO_TH}>Producto</th><th style={{ ...ESTILO_TH, textAlign: 'right' }}>Vendido</th></tr></thead>
              <tbody>
                {panel.rankingProductos.map((p, i) => (
                  <tr key={p.nombre}>
                    <td style={ESTILO_TD}>{i + 1}</td>
                    <td style={ESTILO_TD}>{p.nombre}</td>
                    <td style={ESTILO_TD_NUM}>{soles(p.importeCentimos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div style={{ ...ESTILO_TARJETA, height: '100%' }}>
            <h2 style={ESTILO_H2}>Ranking de vendedores</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr><th style={ESTILO_TH}>#</th><th style={ESTILO_TH}>Vendedor</th><th style={{ ...ESTILO_TH, textAlign: 'right' }}>Tickets</th><th style={{ ...ESTILO_TH, textAlign: 'right' }}>Vendido</th></tr></thead>
              <tbody>
                {panel.rankingVendedores.map((v, i) => (
                  <tr key={v.nombre}>
                    <td style={ESTILO_TD}>{i + 1}</td>
                    <td style={ESTILO_TD}>{v.nombre}</td>
                    <td style={ESTILO_TD_NUM}>{v.tickets}</td>
                    <td style={ESTILO_TD_NUM}>{soles(v.importeCentimos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Col>
      </Row>

      <Card size="small" style={{ marginTop: 14 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Las cifras se actualizan al confirmar cada venta (por eventos, no consultas pesadas). Pendiente del gerente: validar contra los registros manuales del mes.
        </Typography.Text>
      </Card>
    </div>
  );
}
