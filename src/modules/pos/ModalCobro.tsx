import { useEffect, useState } from 'react';
import { Button, InputNumber, Modal, Segmented, Statistic, Typography } from 'antd';
import type { MetodoPago } from '@shared/api/ventas';
import { aCentimos, soles } from '@shared/formato';
import { colores } from '@shared/tokens';

interface Props {
  abierto: boolean;
  totalCentimos: number;
  procesando: boolean;
  onCerrar: () => void;
  onConfirmar: (metodo: MetodoPago, recibidoCentimos?: number) => void;
}

export function ModalCobro({ abierto, totalCentimos, procesando, onCerrar, onConfirmar }: Props): React.ReactNode {
  const [metodo, setMetodo] = useState<MetodoPago>('EFECTIVO');
  const [recibido, setRecibido] = useState<number>(totalCentimos / 100);

  useEffect(() => {
    if (abierto) {
      setMetodo('EFECTIVO');
      setRecibido(totalCentimos / 100);
    }
  }, [abierto, totalCentimos]);

  const vuelto = aCentimos(recibido) - totalCentimos;
  const faltante = vuelto < 0;

  function confirmar(): void {
    if (metodo === 'EFECTIVO' && faltante) {
      return;
    }
    onConfirmar(metodo, metodo === 'EFECTIVO' ? aCentimos(recibido) : undefined);
  }

  return (
    <Modal
      title="Cobrar venta"
      open={abierto}
      onCancel={onCerrar}
      footer={[
        <Button key="c" onClick={onCerrar}>
          Cancelar (Esc)
        </Button>,
        <Button key="ok" type="primary" loading={procesando} disabled={metodo === 'EFECTIVO' && faltante} onClick={confirmar}>
          Confirmar e imprimir
        </Button>,
      ]}
    >
      <Statistic title="Total a cobrar (inc. IGV)" value={soles(totalCentimos)} valueStyle={{ color: colores.blue800 }} />

      <Segmented<MetodoPago>
        block
        style={{ margin: '16px 0' }}
        value={metodo}
        onChange={(v) => { setMetodo(v); }}
        options={[
          { label: '💵 Efectivo', value: 'EFECTIVO' },
          { label: '💳 Tarjeta', value: 'TARJETA' },
          { label: '📱 Yape/Plin', value: 'YAPE_PLIN' },
        ]}
      />

      {metodo === 'EFECTIVO' && (
        <>
          <div style={{ marginBottom: 4 }}>Monto recibido (S/)</div>
          <InputNumber
            autoFocus
            min={0}
            step={0.5}
            value={recibido}
            onChange={(v) => { setRecibido(v ?? 0); }}
            onPressEnter={confirmar}
            style={{ width: '100%' }}
            size="large"
          />
          <Typography.Title level={4} style={{ textAlign: 'right', marginTop: 10, color: faltante ? colores.red600 : colores.green600 }}>
            {faltante ? 'Falta: ' : 'Vuelto: '}
            {soles(Math.abs(vuelto))}
          </Typography.Title>
        </>
      )}
    </Modal>
  );
}
