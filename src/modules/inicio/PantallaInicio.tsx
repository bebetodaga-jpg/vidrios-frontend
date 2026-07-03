import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Col, Row, Tag, Typography } from 'antd';
import { useSesion } from '@modules/auth/use-sesion';
import type { Rol } from '@modules/auth/contexto';
import { cuentasPorCobrar, estadoCaja } from '@shared/api/caja';
import { listarCotizaciones } from '@shared/api/cotizaciones';
import { listarObras } from '@shared/api/obras';
import { listarOrdenesCorte } from '@shared/api/produccion';
import { navegacionPara } from '@shared/layout/navegacion';
import { soles } from '@shared/formato';
import { colores } from '@shared/tokens';

const SPRINTS_LISTOS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]); // módulos ya implementados

// Diseño del prototipo ux-ui/sprint-10/prototipo-vistas-por-rol.html: cada rol entra
// y ve SU trabajo de hoy (cero ruido), un botón grande a su módulo y solo sus accesos.

interface Pendiente {
  que: string;
  det: string;
  txt: string;
  tono: 'warning' | 'success' | 'processing';
}

const TITULO_ROL: Record<Rol, string> = {
  CORTADOR: 'SUS ÓRDENES DE CORTE DE HOY',
  MAESTRO: 'SU OBRA DE HOY',
  AYUDANTE: 'SU CUADRILLA DE HOY',
  CAJERA: 'SU CAJA DE HOY',
  VENDEDORA: 'SUS VENTAS Y COTIZACIONES',
  GERENTE: 'RESUMEN DEL DÍA (todo el negocio)',
};

const BOTON_ROL: Partial<Record<Rol, { texto: string; ruta: string }>> = {
  CORTADOR: { texto: 'Ir a mis órdenes de corte →', ruta: '/produccion' },
  MAESTRO: { texto: 'Ir a mi obra →', ruta: '/obras' },
  AYUDANTE: { texto: 'Ir a la obra →', ruta: '/obras' },
  CAJERA: { texto: 'Ir a mi caja →', ruta: '/caja' },
  VENDEDORA: { texto: 'Ir al cotizador →', ruta: '/cotizaciones' },
};

async function pendientesDe(rol: Rol, token: string): Promise<Pendiente[]> {
  if (rol === 'CORTADOR') {
    const ordenes = await listarOrdenesCorte(token);
    return ordenes
      .filter((o) => o.estado !== 'ERROR')
      .sort((a, b) => (a.estado === 'LISTA' ? -1 : 1) - (b.estado === 'LISTA' ? -1 : 1))
      .slice(0, 3)
      .map((o) => ({
        que: `${o.numero} · cotización ${o.cotizacionNumero}`,
        det: o.estado === 'LISTA' ? 'plan de corte listo: paños y láminas asignados' : 'el optimizador está calculando el plan',
        txt: o.estado === 'LISTA' ? 'POR CORTAR' : 'CALCULANDO',
        tono: o.estado === 'LISTA' ? 'warning' : 'processing',
      }));
  }
  if (rol === 'MAESTRO' || rol === 'AYUDANTE') {
    const obras = await listarObras(token);
    return obras
      .filter((o) => o.estado !== 'ENTREGADA')
      .slice(0, 3)
      .map((o) => ({
        que: `${o.codigo} · ${o.cliente}`,
        det: `${o.direccion} · ${String(o.vanos)} vanos`,
        txt: o.estado,
        tono: 'processing',
      }));
  }
  if (rol === 'CAJERA') {
    const [caja, cxc] = await Promise.all([estadoCaja(token), cuentasPorCobrar(token)]);
    const items: Pendiente[] = [
      caja.abierta
        ? { que: 'Caja del día ABIERTA', det: `fondo inicial ${soles(caja.montoInicialCentimos ?? 0)}`, txt: 'ABIERTA', tono: 'success' }
        : { que: 'La caja del día aún no se abre', det: 'abra la caja para empezar a cobrar', txt: 'POR ABRIR', tono: 'warning' },
    ];
    for (const c of cxc.filter((x) => x.estado !== 'VIGENTE').slice(0, 2)) {
      items.push({ que: `Crédito por cobrar: ${c.cliente}`, det: `${c.numeroVenta} · vence ${new Date(c.venceEn).toLocaleDateString('es-PE')}`, txt: soles(c.saldoCentimos), tono: 'warning' });
    }
    return items;
  }
  if (rol === 'VENDEDORA') {
    const cots = await listarCotizaciones(token);
    return cots
      .filter((c) => c.estado === 'ENVIADA' || c.estado === 'ACEPTADA')
      .slice(0, 3)
      .map((c) => ({
        que: `${c.numero} · ${c.cliente ?? 'sin cliente'}`,
        det: c.estado === 'ACEPTADA' ? `${soles(c.totalCentimos)} — generar contrato con adelanto` : `${soles(c.totalCentimos)} — hacer seguimiento al cliente`,
        txt: c.estado === 'ACEPTADA' ? 'ACEPTADA ✓' : 'ENVIADA',
        tono: c.estado === 'ACEPTADA' ? 'success' : 'warning',
      }));
  }
  // GERENTE: una línea por frente del negocio.
  const [caja, ordenes, cots, cxc] = await Promise.all([
    estadoCaja(token),
    listarOrdenesCorte(token),
    listarCotizaciones(token),
    cuentasPorCobrar(token),
  ]);
  const porCortar = ordenes.filter((o) => o.estado !== 'ERROR').length;
  const porSeguir = cots.filter((c) => c.estado === 'ENVIADA').length;
  const vencidos = cxc.filter((c) => c.estado !== 'VIGENTE').length;
  return [
    caja.abierta
      ? { que: 'Caja del día abierta', det: `fondo inicial ${soles(caja.montoInicialCentimos ?? 0)}`, txt: 'AL DÍA', tono: 'success' }
      : { que: 'Caja del día sin abrir', det: 'la cajera aún no abre caja', txt: 'REVISAR', tono: 'warning' },
    { que: `${String(porCortar)} órdenes de corte en el taller`, det: 'ver avance en Producción', txt: 'TALLER', tono: porCortar > 0 ? 'warning' : 'success' },
    { que: `${String(porSeguir)} cotizaciones enviadas por seguir`, det: 'seguimiento comercial pendiente', txt: 'VENTAS', tono: porSeguir > 0 ? 'warning' : 'success' },
    { que: `${String(vencidos)} créditos por vencer o vencidos`, det: 'cuentas por cobrar', txt: 'COBRAR', tono: vencidos > 0 ? 'warning' : 'success' },
  ];
}

export function PantallaInicio(): React.ReactNode {
  const { sesion } = useSesion();
  const navegar = useNavigate();
  const [pendientes, setPendientes] = useState<Pendiente[] | null>(null);

  useEffect(() => {
    if (!sesion) return;
    pendientesDe(sesion.rol, sesion.token)
      .then(setPendientes)
      .catch(() => { setPendientes([]); });
  }, [sesion]);

  if (!sesion) {
    return null;
  }

  const accesos = navegacionPara(sesion.rol).filter((item) => item.clave !== 'inicio');
  const boton = BOTON_ROL[sesion.rol];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Héroe: su trabajo de hoy */}
      <div style={{ background: colores.blue800, color: colores.white, borderRadius: 8, padding: '18px 20px', marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>
          Hola, {sesion.nombre.split(' ')[0]}{' '}
          <span style={{ background: colores.blue700, borderRadius: 4, fontSize: 12, padding: '2px 10px', verticalAlign: 'middle' }}>{sesion.rol}</span>
        </div>
        <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 10, letterSpacing: '.04em' }}>{TITULO_ROL[sesion.rol]}</div>
      </div>

      <Card styles={{ body: { padding: '6px 20px 16px' } }} style={{ marginBottom: 14 }}>
        {pendientes === null && <Typography.Text type="secondary">Cargando su día…</Typography.Text>}
        {pendientes?.length === 0 && <Typography.Text type="secondary">Sin pendientes por ahora. ¡Buen día!</Typography.Text>}
        {pendientes?.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${colores.gray100}`, minHeight: 48 }}>
            <span>
              <div style={{ fontWeight: 600 }}>{p.que}</div>
              <div style={{ fontSize: 12.5, color: colores.gray700 }}>{p.det}</div>
            </span>
            <Tag color={p.tono === 'warning' ? 'warning' : p.tono === 'success' ? 'success' : 'processing'} style={{ fontWeight: 700 }}>{p.txt}</Tag>
          </div>
        ))}
        {boton && (
          <Button type="primary" block style={{ height: 52, fontSize: 17, fontWeight: 700, marginTop: 12 }} onClick={() => { navegar(boton.ruta); }}>
            {boton.texto}
          </Button>
        )}
      </Card>

      {/* Solo los módulos del rol */}
      <Typography.Text style={{ color: colores.gray700, fontSize: 13, letterSpacing: '.05em' }}>SUS MÓDULOS (solo los de su rol)</Typography.Text>
      <Row gutter={[12, 12]} style={{ marginTop: 8 }}>
        {accesos.map((item) => {
          const listo = SPRINTS_LISTOS.has(item.sprint);
          return (
            <Col key={item.clave} xs={12} sm={8} md={6}>
              <Card
                hoverable
                onClick={() => { navegar(item.ruta); }}
                style={{ height: '100%' }}
                styles={{ body: { padding: 16 } }}
              >
                <div style={{ fontSize: 26, color: colores.cyan500 }}>{item.icono}</div>
                <div style={{ fontWeight: 600, marginTop: 8 }}>{item.etiqueta}</div>
                <Tag color={listo ? 'green' : 'default'} style={{ marginTop: 6 }}>
                  {listo ? 'Disponible' : `Sprint ${String(item.sprint)}`}
                </Tag>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
