import { useEffect, useRef, useState } from 'react';
import { Button, Space, Typography } from 'antd';
import { colores } from '@shared/tokens';

interface Props {
  onGuardar: (dataUrl: string) => void;
  guardando?: boolean;
}

/**
 * Firma en pantalla (diseño UX S7): canvas táctil con borde punteado, trazo azul marca,
 * botones grandes Borrar/Guardar. Funciona con dedo (touch) y mouse.
 */
export function FirmaCanvas({ onGuardar, guardando = false }: Props): React.ReactNode {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [hayTrazo, setHayTrazo] = useState(false);

  useEffect(() => {
    const c = lienzo.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = colores.blue800;

    let trazando = false;
    const pos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const r = c.getBoundingClientRect();
      const p = 'touches' in e ? e.touches[0] : e;
      return { x: (p.clientX - r.left) * (c.width / r.width), y: (p.clientY - r.top) * (c.height / r.height) };
    };
    const ini = (e: MouseEvent | TouchEvent): void => {
      trazando = true;
      setHayTrazo(true);
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      e.preventDefault();
    };
    const mov = (e: MouseEvent | TouchEvent): void => {
      if (!trazando) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      e.preventDefault();
    };
    const fin = (): void => {
      trazando = false;
    };

    c.addEventListener('mousedown', ini);
    c.addEventListener('mousemove', mov);
    c.addEventListener('mouseup', fin);
    c.addEventListener('mouseleave', fin);
    c.addEventListener('touchstart', ini, { passive: false });
    c.addEventListener('touchmove', mov, { passive: false });
    c.addEventListener('touchend', fin);
    return () => {
      c.removeEventListener('mousedown', ini);
      c.removeEventListener('mousemove', mov);
      c.removeEventListener('mouseup', fin);
      c.removeEventListener('mouseleave', fin);
      c.removeEventListener('touchstart', ini);
      c.removeEventListener('touchmove', mov);
      c.removeEventListener('touchend', fin);
    };
  }, []);

  function limpiar(): void {
    const c = lienzo.current;
    const ctx = c?.getContext('2d');
    if (c && ctx) {
      ctx.clearRect(0, 0, c.width, c.height);
      setHayTrazo(false);
    }
  }

  function guardar(): void {
    const c = lienzo.current;
    if (c && hayTrazo) {
      onGuardar(c.toDataURL('image/png'));
    }
  }

  return (
    <div style={{ border: `2px dashed ${colores.gray300}`, borderRadius: 8, background: colores.white }}>
      <canvas ref={lienzo} width={700} height={160} style={{ display: 'block', width: '100%', height: 160, touchAction: 'none' }} />
      <Space style={{ width: '100%', justifyContent: 'space-between', padding: 8 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          El cliente firma con el dedo; la firma queda incrustada en el contrato PDF.
        </Typography.Text>
        <Space>
          <Button onClick={limpiar}>Borrar</Button>
          <Button type="primary" disabled={!hayTrazo} loading={guardando} onClick={guardar}>
            Guardar firma
          </Button>
        </Space>
      </Space>
    </div>
  );
}
