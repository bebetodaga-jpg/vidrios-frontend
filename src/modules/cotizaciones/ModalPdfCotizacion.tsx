import { Button, Modal } from 'antd';
import type { ModeloCotizacion } from '@shared/api/cotizaciones';
import { soles } from '@shared/formato';
import { colores } from '@shared/tokens';

interface ItemPdf {
  vanoCodigo: string;
  modelo: string;
  vidrioNombre: string;
  color: string;
  anchoCm: number;
  altoCm: number;
  cantidad: number;
  unitCentimos: number;
  totalCentimos: number;
}

interface Props {
  abierto: boolean;
  numero: string | null;
  items: ItemPdf[];
  total: number;
  modelos: ModeloCotizacion[];
  onCerrar: () => void;
}

export function ModalPdfCotizacion({ abierto, numero, items, total, modelos, onCerrar }: Props): React.ReactNode {
  const hoy = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  const nombreModelo = (clave: string): string => modelos.find((m) => m.clave === clave)?.nombre ?? clave;

  return (
    <Modal
      open={abierto}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `3px solid ${colores.blue800}`, paddingBottom: 10, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: colores.blue800 }}>
              VIDRIOS <span style={{ color: colores.cyan500 }}>GALAXI</span>
            </div>
            <div style={{ fontSize: 12, color: colores.gray700 }}>
              Vidriería y carpintería de aluminio
              <br />
              RUC 20XXXXXXXXX · Av. Ejemplo 123, Lima · 999 888 777
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <b style={{ color: colores.blue800, fontSize: 15 }}>COTIZACIÓN</b>
            <br />
            <b>{numero ?? '(borrador)'}</b>
            <br />
            <span style={{ fontSize: 12 }}>{hoy}</span>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: colores.blue800, color: colores.white }}>
              <th style={{ padding: 6, textAlign: 'left' }}>Vano</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Trabajo</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Vidrio</th>
              <th style={{ padding: 6, textAlign: 'right' }}>Medida</th>
              <th style={{ padding: 6, textAlign: 'right' }}>Cant.</th>
              <th style={{ padding: 6, textAlign: 'right' }}>P. unit</th>
              <th style={{ padding: 6, textAlign: 'right' }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #D1D5DB' }}>
                <td style={{ padding: 6 }}>{it.vanoCodigo}</td>
                <td style={{ padding: 6 }}>{nombreModelo(it.modelo)}</td>
                <td style={{ padding: 6 }}>{it.vidrioNombre}</td>
                <td style={{ padding: 6, textAlign: 'right' }} className="mono">{it.anchoCm}×{it.altoCm} cm</td>
                <td style={{ padding: 6, textAlign: 'right' }} className="mono">{it.cantidad}</td>
                <td style={{ padding: 6, textAlign: 'right' }} className="mono">{soles(it.unitCentimos)}</td>
                <td style={{ padding: 6, textAlign: 'right' }} className="mono"><b>{soles(it.totalCentimos)}</b></td>
              </tr>
            ))}
            <tr>
              <td colSpan={6} style={{ padding: 6, textAlign: 'right' }}><b>TOTAL (incluye IGV)</b></td>
              <td style={{ padding: 6, textAlign: 'right', fontSize: 15 }} className="mono"><b>{soles(total)}</b></td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ color: colores.blue800, fontSize: 14, marginTop: 16 }}>Condiciones</h3>
        <ul style={{ fontSize: 12, color: colores.gray700, paddingLeft: 18 }}>
          <li>Precios <b>incluyen IGV</b> e instalación en Lima Metropolitana.</li>
          <li>Forma de pago: <b>60% de adelanto</b> a la firma del contrato, saldo contra entrega.</li>
          <li>Plazo de ejecución estimado: <b>15 días hábiles</b> desde el adelanto y remetreo aprobado.</li>
          <li>Validez de la oferta: <b>15 días calendario</b>.</li>
          <li>Mamparas y modelos pivotantes/spider cumplen la norma de vidrio templado de seguridad.</li>
        </ul>

        <div style={{ display: 'flex', gap: 40, marginTop: 44, textAlign: 'center', fontSize: 12 }}>
          <div style={{ flex: 1, borderTop: `1px solid ${colores.gray700}`, paddingTop: 6 }}>VIDRIOS GALAXI</div>
          <div style={{ flex: 1, borderTop: `1px solid ${colores.gray700}`, paddingTop: 6 }}>CLIENTE</div>
        </div>
      </div>
    </Modal>
  );
}
