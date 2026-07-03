import { useState } from 'react';
import { Alert, App, Button, Divider, Input, Segmented, Space, Tag, Typography } from 'antd';
import { useSesion } from '@modules/auth/use-sesion';
import { ErrorApi } from '@shared/api/cliente';
import { Comprobante, emitirComprobante, obtenerComprobante } from '@shared/api/facturacion';
import { colores } from '@shared/tokens';

const LIMITE_DNI_CENTIMOS = 70_000; // boleta ≥ S/ 700 exige DNI

const dormir = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Emisión de boleta/factura desde el ticket del POS (TDR: "emisión desde el POS"). */
export function EmitirComprobante({ ventaId, totalCentimos }: { ventaId: string; totalCentimos: number }): React.ReactNode {
  const { sesion } = useSesion();
  const { message } = App.useApp();
  const [tipo, setTipo] = useState<'BOLETA' | 'FACTURA'>('BOLETA');
  const [numeroDoc, setNumeroDoc] = useState('');
  const [nombre, setNombre] = useState('');
  const [emitiendo, setEmitiendo] = useState(false);
  const [comprobante, setComprobante] = useState<Comprobante | null>(null);

  async function emitir(): Promise<void> {
    if (!sesion) return;
    setEmitiendo(true);
    try {
      const cliente =
        tipo === 'FACTURA'
          ? { tipoDoc: 'RUC' as const, numeroDoc: numeroDoc.trim(), nombre: nombre.trim() || 'Cliente' }
          : numeroDoc.trim().length === 8
            ? { tipoDoc: 'DNI' as const, numeroDoc: numeroDoc.trim(), nombre: nombre.trim() || 'Cliente' }
            : { tipoDoc: 'SIN_DOCUMENTO' as const, nombre: nombre.trim() || 'Público general' };

      let emitido = await emitirComprobante(sesion.token, ventaId, tipo, cliente);
      // Polling breve: PENDIENTE → ACEPTADO/RECHAZADO cuando el worker procesa (o sigue en cola si el PSE está caído).
      for (let i = 0; i < 6 && emitido.estado === 'PENDIENTE'; i++) {
        await dormir(800);
        emitido = await obtenerComprobante(sesion.token, emitido.id);
      }
      setComprobante(emitido);
    } catch (e) {
      message.error(e instanceof ErrorApi ? e.message : 'No se pudo emitir el comprobante.');
    } finally {
      setEmitiendo(false);
    }
  }

  if (comprobante) {
    const c = comprobante;
    const color = c.estado === 'ACEPTADO' ? 'success' : c.estado === 'PENDIENTE' ? 'warning' : 'error';
    return (
      <Alert
        type={color}
        showIcon
        message={
          <span>
            <b>{c.numero}</b> — <Tag color={color}>{c.estado}</Tag>
          </span>
        }
        description={
          c.estado === 'ACEPTADO' ? (
            <>
              Aceptado por SUNAT. {c.enlacePdf && <a href={c.enlacePdf}>Ver PDF</a>}
            </>
          ) : c.estado === 'PENDIENTE' ? (
            'El PSE no respondió: el comprobante quedó en cola y se enviará solo (contingencia). Puede reintentarlo en Facturación.'
          ) : (
            c.motivoRechazo
          )
        }
      />
    );
  }

  const exigeDni = tipo === 'BOLETA' && totalCentimos >= LIMITE_DNI_CENTIMOS;

  return (
    <div>
      <Divider style={{ margin: '12px 0' }} />
      <Typography.Text strong style={{ color: colores.blue800 }}>
        Emitir comprobante electrónico
      </Typography.Text>
      <Segmented<'BOLETA' | 'FACTURA'>
        block
        style={{ margin: '8px 0' }}
        value={tipo}
        onChange={(v) => { setTipo(v); }}
        options={[
          { label: '🧾 Boleta', value: 'BOLETA' },
          { label: '📋 Factura', value: 'FACTURA' },
        ]}
      />
      {exigeDni && <Alert type="warning" showIcon style={{ marginBottom: 8 }} message="Esta venta supera S/ 700: la boleta exige el DNI del cliente." />}
      <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
        <Input
          style={{ width: '40%' }}
          placeholder={tipo === 'FACTURA' ? 'RUC (11 díg.)' : 'DNI (8 díg., opcional)'}
          value={numeroDoc}
          onChange={(e) => { setNumeroDoc(e.target.value.replace(/\D/g, '')); }}
          maxLength={tipo === 'FACTURA' ? 11 : 8}
        />
        <Input
          style={{ width: '60%' }}
          placeholder={tipo === 'FACTURA' ? 'Razón social' : 'Nombre (opcional)'}
          value={nombre}
          onChange={(e) => { setNombre(e.target.value); }}
        />
      </Space.Compact>
      <Button type="primary" block loading={emitiendo} onClick={() => void emitir()}>
        Emitir {tipo === 'FACTURA' ? 'factura' : 'boleta'}
      </Button>
    </div>
  );
}
