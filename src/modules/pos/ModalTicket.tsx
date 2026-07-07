import { Button, Modal } from 'antd';
import { ETIQUETA_UNIDAD } from '@shared/api/catalogo';
import { soles } from '@shared/formato';
import { EmitirComprobante } from '@modules/facturacion/EmitirComprobante';
import { importeCentimos } from './calculo-pos';
import type { DatosTicket } from './tipos';

const METODO: Record<string, string> = { EFECTIVO: 'Efectivo', TARJETA: 'Tarjeta', YAPE_PLIN: 'Yape/Plin' };

/** Representación del ticket; al imprimir, el CSS de estilos-base oculta todo menos `.ticket-imprimible`. */
export function ModalTicket({ ticket, onNueva }: { ticket: DatosTicket | null; onNueva: () => void }): React.ReactNode {
  if (!ticket) {
    return null;
  }
  const vuelto = ticket.recibidoCentimos !== undefined ? ticket.recibidoCentimos - ticket.totalCentimos : undefined;

  return (
    <Modal
      open
      onCancel={onNueva}
      width={360}
      footer={[
        <Button key="print" onClick={() => { window.print(); }}>
          🖨 Imprimir
        </Button>,
        <Button key="nueva" type="primary" onClick={onNueva}>
          Nueva venta
        </Button>,
      ]}
    >
      <div className="ticket-imprimible mono" style={{ fontSize: 13, lineHeight: 1.5 }}>
        <div style={{ textAlign: 'center' }}>
          <b>VIDRIOS GALAXI</b>
          <br />
          RUC 20XXXXXXXXX
          <br />
          Av. Ejemplo 123 — Lima
        </div>
        <hr />
        NOTA DE VENTA {ticket.numero}
        <br />
        {new Date().toLocaleString('es-PE')}
        <br />
        Cajera: {ticket.cajera}
        <hr />
        {ticket.items.map((i) => {
          const importe = importeCentimos(i.unidadVenta, i.precioCentimos, i.cantidad, i.anchoMm, i.altoMm);
          const medida = i.anchoMm && i.altoMm ? ` (${String(i.anchoMm)}×${String(i.altoMm)} mm)` : '';
          return (
            <div key={i.key} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>
                {i.cantidad} × {i.nombre}
                {medida} <small>[{ETIQUETA_UNIDAD[i.unidadVenta]}]</small>
              </span>
              <span>{soles(importe)}</span>
            </div>
          );
        })}
        <hr />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16 }}>
          <b>TOTAL</b>
          <b>{soles(ticket.totalCentimos)}</b>
        </div>
        <div>Pago: {METODO[ticket.metodoPago]}</div>
        {vuelto !== undefined && <div>Vuelto: {soles(vuelto)}</div>}
        <hr />
        <div style={{ textAlign: 'center' }}>
          ¡Gracias por su compra!
        </div>
      </div>

      <EmitirComprobante ventaId={ticket.ventaId} totalCentimos={ticket.totalCentimos} />
    </Modal>
  );
}
