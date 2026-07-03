import { Button, Modal } from 'antd';
import type { ContratoDetalle } from '@shared/api/contratos';
import { soles } from '@shared/formato';
import { colores } from '@shared/tokens';

/** Contrato PDF (plantilla del prototipo UX S7): membrete, total/adelanto/saldo, cláusulas y firma incrustada. */
export function ModalPdfContrato({ contrato, onCerrar }: { contrato: ContratoDetalle | null; onCerrar: () => void }): React.ReactNode {
  if (!contrato) {
    return null;
  }
  const hoy = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  const pct = Math.round((contrato.adelantoCentimos / contrato.totalCentimos) * 100);

  return (
    <Modal
      open
      onCancel={onCerrar}
      width={800}
      footer={[
        <Button key="p" type="primary" onClick={() => { window.print(); }}>
          🖨 Imprimir / Guardar PDF
        </Button>,
        <Button key="c" onClick={onCerrar}>
          Cerrar
        </Button>,
      ]}
    >
      <div className="doc-imprimible" style={{ fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `3px solid ${colores.blue800}`, paddingBottom: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colores.blue800 }}>
              VIDRIOS <span style={{ color: colores.cyan500 }}>GALAXI</span>
            </div>
            <div style={{ fontSize: 12, color: colores.gray700 }}>RUC 20XXXXXXXXX · Av. Ejemplo 123, Lima · 999 888 777</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <b style={{ color: colores.blue800 }}>
              CONTRATO DE OBRA
              <br />
              {contrato.numero}
            </b>
            <br />
            <span style={{ fontSize: 12, color: colores.gray700 }}>{hoy}</span>
          </div>
        </div>

        <p>
          <b>Cliente:</b> {contrato.cliente ?? 'Por designar'} · <b>Cotización:</b> {contrato.cotizacionNumero}
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, margin: '8px 0' }}>
          <thead>
            <tr style={{ background: colores.blue800, color: colores.white }}>
              <th style={{ padding: 6, textAlign: 'left' }}>Concepto</th>
              <th style={{ padding: 6, textAlign: 'right' }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: 6, borderBottom: `1px solid ${colores.gray300}` }}>Total contratado (según cotización aceptada, inc. IGV)</td>
              <td style={{ padding: 6, borderBottom: `1px solid ${colores.gray300}`, textAlign: 'right' }} className="mono">{soles(contrato.totalCentimos)}</td>
            </tr>
            <tr>
              <td style={{ padding: 6, borderBottom: `1px solid ${colores.gray300}` }}>Adelanto a la firma ({String(pct)}%)</td>
              <td style={{ padding: 6, borderBottom: `1px solid ${colores.gray300}`, textAlign: 'right' }} className="mono">{soles(contrato.adelantoCentimos)}</td>
            </tr>
            <tr>
              <td style={{ padding: 6 }}>Saldo contra entrega</td>
              <td style={{ padding: 6, textAlign: 'right' }} className="mono">{soles(contrato.saldoCentimos)}</td>
            </tr>
          </tbody>
        </table>

        <ol style={{ fontSize: 12, color: colores.gray700, paddingLeft: 18 }}>
          <li>El plazo de ejecución es de 15 días hábiles desde el pago del adelanto y el remetreo aprobado.</li>
          <li>Las medidas finales se confirman con el remetreo del vano terminado; mamparas y modelos de seguridad llevan vidrio templado (norma).</li>
          <li>El saldo se cancela contra entrega e instalación conforme.</li>
          <li>Los pagos se registran en caja y se emite el comprobante electrónico correspondiente.</li>
        </ol>

        <div style={{ display: 'flex', gap: 40, marginTop: 48, textAlign: 'center', fontSize: 12 }}>
          <div style={{ flex: 1, borderTop: `1px solid ${colores.gray700}`, paddingTop: 6 }}>
            VIDRIOS GALAXI
            <br />
            Ventas
          </div>
          <div style={{ flex: 1, borderTop: `1px solid ${colores.gray700}`, paddingTop: 6, position: 'relative' }}>
            {contrato.firmaDataUrl && (
              <img src={contrato.firmaDataUrl} alt="Firma del cliente" style={{ height: 60, position: 'absolute', top: -66, left: '50%', transform: 'translateX(-50%)' }} />
            )}
            CLIENTE
            <br />
            {contrato.cliente ?? ''}
          </div>
        </div>
      </div>
    </Modal>
  );
}
