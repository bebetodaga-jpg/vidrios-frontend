import { useState } from 'react';
import { Alert, App, Button, Card, Col, InputNumber, Result, Row, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { EstadoCaja, EstadoDiferencia, FilaCierre, cerrarCaja, reporteCierre } from '@shared/api/caja';
import { aCentimos, soles } from '@shared/formato';
import { colores } from '@shared/tokens';
import { ConteoCaja, DENOMINACIONES, etiquetaDenominacion, totalContadoCentimos } from './denominaciones';

const COLOR_DIF: Record<EstadoDiferencia, string> = { CUADRA: 'success', DIFERENCIA_MENOR: 'warning', REVISAR: 'error' };
const TXT_DIF: Record<EstadoDiferencia, string> = { CUADRA: 'CUADRA ✓', DIFERENCIA_MENOR: 'DIF. MENOR', REVISAR: 'REVISAR ⚠' };

export function TabCierre({ caja, onCerrada }: { caja: EstadoCaja | null; onCerrada: () => void }): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const esGerente = sesion?.rol === 'GERENTE';

  const [conteo, setConteo] = useState<ConteoCaja>({});
  const [tarjeta, setTarjeta] = useState(0);
  const [yape, setYape] = useState(0);
  const [cerrando, setCerrando] = useState(false);
  const [reporte, setReporte] = useState<FilaCierre[] | null>(null);
  const [cerrado, setCerrado] = useState(false);

  const totalContado = totalContadoCentimos(conteo);

  async function declararYCerrar(): Promise<void> {
    if (!sesion) return;
    setCerrando(true);
    try {
      const { sesionId } = await cerrarCaja(sesion.token, {
        efectivoCentimos: totalContado,
        tarjetaCentimos: aCentimos(tarjeta),
        yapeCentimos: aCentimos(yape),
      });
      setCerrado(true);
      onCerrada();
      if (esGerente) {
        const r = await reporteCierre(sesion.token, sesionId);
        setReporte(r.filas);
      }
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo cerrar la caja.');
    } finally {
      setCerrando(false);
    }
  }

  // Resultado tras cerrar
  if (cerrado) {
    if (!esGerente) {
      return <Result status="success" title="Cierre declarado y enviado al gerente" subTitle="Su rendición quedó registrada. El gerente revisará las diferencias." />;
    }
    const columnas: ColumnsType<FilaCierre> = [
      { title: 'Método', dataIndex: 'metodo', render: (m: string) => m.replace('_', '/') },
      { title: 'Esperado (sistema)', dataIndex: 'esperadoCentimos', align: 'right', render: (c: number) => <span className="mono">{soles(c)}</span> },
      { title: 'Declarado (cajera)', dataIndex: 'declaradoCentimos', align: 'right', render: (c: number) => <span className="mono">{soles(c)}</span> },
      {
        title: 'Diferencia',
        dataIndex: 'diferenciaCentimos',
        align: 'right',
        render: (c: number) => (
          <b className="mono" style={{ color: c === 0 ? colores.green600 : c < 0 ? colores.red600 : colores.amber500 }}>
            {c > 0 ? '+' : ''}
            {soles(c)}
          </b>
        ),
      },
      { title: 'Estado', dataIndex: 'estado', render: (e: EstadoDiferencia) => <Tag color={COLOR_DIF[e]}>{TXT_DIF[e]}</Tag> },
    ];
    return (
      <Card title="Reporte de cierre — solo gerente">
        <Table<FilaCierre> rowKey="metodo" size="small" columns={columnas} dataSource={reporte ?? []} pagination={false} />
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
          Esperado en efectivo = apertura + ventas en efectivo + ingresos − egresos. Tolerancia ±S/ 5.00.
        </Typography.Paragraph>
      </Card>
    );
  }

  if (!caja?.abierta) {
    return <Alert type="info" showIcon message="No hay una caja abierta que cerrar." />;
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 14 }}
        message="Cierre ciego"
        description="Cuente el dinero físico del cajón e ingrese cuántos billetes y monedas hay de cada tipo. El sistema NO le muestra cuánto debería haber: la comparación la revisa el gerente."
      />

      <Row gutter={[10, 8]}>
        {DENOMINACIONES.map((d) => (
          <Col xs={12} sm={8} key={d}>
            <Card size="small" styles={{ body: { padding: 8, display: 'flex', alignItems: 'center', gap: 8 } }}>
              <span className="mono" style={{ width: 64, fontWeight: 700 }}>{etiquetaDenominacion(d)}</span>
              <InputNumber min={0} value={conteo[d] ?? 0} onChange={(v) => { setConteo((c) => ({ ...c, [d]: v ?? 0 })); }} style={{ width: 64 }} />
              <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: colores.gray700 }}>{soles(Math.round(d * 100) * (conteo[d] ?? 0))}</span>
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ background: colores.blue800, color: colores.white, borderRadius: 8, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0' }}>
        <span>EFECTIVO CONTADO</span>
        <span className="mono" style={{ fontSize: 26, fontWeight: 700 }}>{soles(totalContado)}</span>
      </div>

      <Row gutter={12} style={{ marginBottom: 14 }}>
        <Col span={12}>
          <div style={{ marginBottom: 4 }}>Total vouchers de tarjeta (S/)</div>
          <InputNumber min={0} step={0.5} value={tarjeta} onChange={(v) => { setTarjeta(v ?? 0); }} style={{ width: '100%' }} />
        </Col>
        <Col span={12}>
          <div style={{ marginBottom: 4 }}>Total Yape / Plin (S/)</div>
          <InputNumber min={0} step={0.5} value={yape} onChange={(v) => { setYape(v ?? 0); }} style={{ width: '100%' }} />
        </Col>
      </Row>

      <Button type="primary" size="large" block loading={cerrando} onClick={() => void declararYCerrar()}>
        Declarar y cerrar caja
      </Button>
    </div>
  );
}
